import { createAdminClient } from '@/lib/supabase/admin'
import { spacesFor } from '@/lib/devices/members'
import { setDevice, runScene, allOff } from '@/lib/smarthome/command'
import { kindOf, stateOf, describe, can, type DeviceState } from '@/lib/smarthome/capabilities'
import type { Scene } from '@/lib/smarthome/apply'
import { linksForSpaces } from '@/lib/spotify/household'
import { linksFor, nowPlaying, upNext, searchTracks, choices, control, playerOf, type Link } from '@/lib/spotify/server'
import { ToolInputError, type JarvisTool } from './tools'

// Jarvis runs the house (2026-11-18): the household's smart home and Spotify.
// Reads run straight away; every change is a write tool, so the person sees
// a Confirm card first, the same as adding a task. Everything is pinned to a
// household the signed-in person belongs to.

const str = (v: unknown, max = 200): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

interface DeviceRow { id: string; name: string; kind: string | null; room: string | null; category: string | null; state: unknown; on_state: boolean }

/** The person's household that actually has the house in it (the one with devices), else their first. */
async function homeOf(userId: string): Promise<string> {
  const spaces = await spacesFor(userId)
  if (!spaces.length) throw new ToolInputError('There is no household set up yet.')
  if (spaces.length === 1) return spaces[0].id
  const admin = createAdminClient()
  const counts = await Promise.all(spaces.map(async s => {
    const { count } = await admin.from('household_smarthome_devices').select('id', { count: 'exact', head: true }).eq('space_id', s.id)
    return { id: s.id, n: count ?? 0 }
  }))
  return counts.sort((a, b) => b.n - a.n)[0].id
}

async function devicesOf(spaceId: string): Promise<DeviceRow[]> {
  const { data } = await createAdminClient().from('household_smarthome_devices')
    .select('id, name, kind, room, category, state, on_state').eq('space_id', spaceId).order('name')
  return (data ?? []) as DeviceRow[]
}

const roomOf = (d: DeviceRow) => d.room?.trim() || d.category?.trim() || 'Other'

/** A device by its name, or every device in a room. */
export function match(devices: DeviceRow[], target: string): DeviceRow[] {
  const t = norm(target)
  const exact = devices.filter(d => norm(d.name) === t)
  if (exact.length) return exact
  const room = devices.filter(d => norm(roomOf(d)) === t || norm(roomOf(d)) === t.replace(/ lights?$/, ''))
  if (room.length) return room
  return devices.filter(d => norm(d.name).includes(t) || t.includes(norm(d.name)))
}

function changeFrom(i: Record<string, unknown>): DeviceState {
  const c: DeviceState = {}
  if (typeof i.on === 'boolean') c.on = i.on
  if (typeof i.brightness === 'number') { c.brightness = i.brightness; if (c.on === undefined) c.on = true }
  if (typeof i.temperature === 'number') c.temperature = i.temperature
  if (typeof i.locked === 'boolean') c.locked = i.locked
  if (typeof i.position === 'number') c.position = i.position
  if (!Object.keys(c).length) throw new ToolInputError('Say what to change: on, brightness, temperature, locked or position.')
  return c
}

function changeWords(i: Record<string, unknown>): string {
  const parts: string[] = []
  if (i.on === true && typeof i.brightness !== 'number') parts.push('on')
  if (i.on === false) parts.push('off')
  if (typeof i.brightness === 'number') parts.push(`to ${Math.round(i.brightness)}%`)
  if (typeof i.temperature === 'number') parts.push(`to ${Math.round(i.temperature)}°`)
  if (i.locked === true) parts.push('locked')
  if (i.locked === false) parts.push('unlocked')
  if (typeof i.position === 'number') parts.push(i.position >= 100 ? 'open' : i.position <= 0 ? 'closed' : `${Math.round(i.position)}% open`)
  return parts.join(', ') || 'changed'
}

const houseTools: JarvisTool[] = [
  {
    name: 'home_status',
    description: 'The house right now: every smart home device by room with its state (on/off, brightness, temperature, locked, open), the scenes that exist, and which scene is on.',
    input_schema: { type: 'object', properties: {} },
    run: async ({ userId }) => {
      const spaceId = await homeOf(userId)
      const [devices, { data: space }] = await Promise.all([
        devicesOf(spaceId),
        createAdminClient().from('shared_spaces').select('scenes, active_scene').eq('id', spaceId).maybeSingle(),
      ])
      if (!devices.length) return { note: 'No smart home devices are set up yet. They can be added in Household, Smart Home, or by connecting Home Assistant.' }
      const rooms: Record<string, string[]> = {}
      for (const d of devices) {
        const kind = kindOf(d.kind)
        ;(rooms[roomOf(d)] ??= []).push(`${d.name}: ${describe(kind, stateOf(kind, d.state, d.on_state))}`)
      }
      return {
        rooms,
        scenes: ((space?.scenes ?? []) as Scene[]).map(s => s.name),
        activeScene: (space?.active_scene as { name?: string } | null)?.name ?? null,
      }
    },
  },
  {
    name: 'home_set',
    description: 'Change a smart home device, or every device in a room (say the room name, like "living room"). Use home_status first if unsure of names. The person confirms first.',
    write: true,
    input_schema: { type: 'object', properties: {
      target: { type: 'string', description: 'A device name or a room name, as home_status lists them' },
      on: { type: 'boolean' },
      brightness: { type: 'number', description: 'Lights, 1 to 100' },
      temperature: { type: 'number', description: 'Thermostat target in °F, 55 to 85' },
      locked: { type: 'boolean' },
      position: { type: 'number', description: 'Blinds, 0 closed to 100 open' },
    }, required: ['target'] },
    summarize: i => `Set ${str(i.target) ?? 'that'} ${changeWords(i)}`,
    run: async ({ userId }, i) => {
      const target = str(i.target)
      if (!target) throw new ToolInputError('Which device or room?')
      const change = changeFrom(i)
      const spaceId = await homeOf(userId)
      const found = match(await devicesOf(spaceId), target)
      // Only the devices the change makes sense for (a room's lamps, not its lock).
      const fits = found.filter(d => Object.keys(change).every(k =>
        k === 'on' ? can(kindOf(d.kind), 'power') : k === 'locked' ? can(kindOf(d.kind), 'lock') : can(kindOf(d.kind), k as 'brightness' | 'temperature' | 'position')))
      if (!fits.length) throw new ToolInputError(`No device called "${target}" can do that. Check home_status for the names.`)
      const done = await Promise.all(fits.map(d => setDevice({ spaceId }, d.id, change)))
      const failed = fits.filter((_, n) => !done[n].ok).map(d => d.name)
      return { changed: fits.length - failed.length, failed }
    },
  },
  {
    name: 'home_scene',
    description: 'Run one of the household\'s saved scenes by name (like Goodnight or Movie). The person confirms first.',
    write: true,
    input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    summarize: i => `Run the ${str(i.name) ?? ''} scene`,
    run: async ({ userId }, i) => {
      const name = str(i.name)
      if (!name) throw new ToolInputError('Which scene?')
      const spaceId = await homeOf(userId)
      const { data: space } = await createAdminClient().from('shared_spaces').select('scenes').eq('id', spaceId).maybeSingle()
      const scenes = (space?.scenes ?? []) as Scene[]
      const scene = scenes.find(s => norm(s.name) === norm(name)) ?? scenes.find(s => norm(s.name).includes(norm(name)))
      if (!scene) throw new ToolInputError(`There is no scene called "${name}". Scenes: ${scenes.map(s => s.name).join(', ') || 'none yet'}.`)
      const r = await runScene(spaceId, scene.id)
      if (!r.ok) throw new ToolInputError(r.error)
      return { ran: scene.name, failed: r.failed }
    },
  },
  {
    name: 'home_all_off',
    description: 'Turn off everything that is on (lights, plugs, switches, fans, speakers, TVs). Locks, blinds and the thermostat stay as they are. The person confirms first.',
    write: true,
    input_schema: { type: 'object', properties: {} },
    summarize: () => 'Turn everything off in the house',
    run: async ({ userId }) => {
      const r = await allOff(await homeOf(userId))
      return { turnedOff: r.count - r.failed, failed: r.failed }
    },
  },
]

// ── Spotify ─────────────────────────────────────────────────────────────────
/** Your own Spotify first; otherwise whoever in the house is playing. */
async function musicLink(userId: string): Promise<Link> {
  const [mine] = await linksFor([userId])
  if (mine) return mine
  const links = await linksForSpaces((await spacesFor(userId)).map(s => s.id))
  const player = await playerOf(links)
  if (player) return player.link
  if (links[0]) return links[0]
  throw new ToolInputError('Spotify is not linked yet. Link it in Settings, Connections.')
}

const musicTools: JarvisTool[] = [
  {
    name: 'music_status',
    description: 'What is playing on Spotify right now, on which speaker, and the next songs in the queue.',
    input_schema: { type: 'object', properties: {} },
    run: async ({ userId }) => {
      const link = await musicLink(userId)
      const [now, next] = await Promise.all([nowPlaying(link), upNext(link, 5)])
      return { account: now.name, playing: now.playing, upNext: next.map(t => `${t.title} by ${t.artist}`) }
    },
  },
  {
    name: 'music_search',
    description: 'Search Spotify for songs. Returns up to 10 with their uri, for music_queue or music_play.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    run: async ({ userId }, i) => {
      const q = str(i.query, 80)
      if (!q) throw new ToolInputError('Search for what?')
      return searchTracks(await musicLink(userId), q)
    },
  },
  {
    name: 'music_options',
    description: 'The person\'s Spotify playlists (with uri) and the speakers Spotify can play on right now.',
    input_schema: { type: 'object', properties: {} },
    run: async ({ userId }) => choices(await musicLink(userId)),
  },
  {
    name: 'music_control',
    description: 'Play, pause, skip to the next song or go back on Spotify. The person confirms first.',
    write: true,
    input_schema: { type: 'object', properties: { action: { type: 'string', enum: ['play', 'pause', 'next', 'previous'] } }, required: ['action'] },
    summarize: i => ({ play: 'Play the music', pause: 'Pause the music', next: 'Skip to the next song', previous: 'Go back a song' } as Record<string, string>)[String(i.action)] ?? 'Change the music',
    run: async ({ userId }, i) => {
      const a = i.action
      if (a !== 'play' && a !== 'pause' && a !== 'next' && a !== 'previous') throw new ToolInputError('play, pause, next or previous')
      const r = await control(await musicLink(userId), { action: a })
      if (!r.ok) throw new ToolInputError(r.error)
      return { done: a }
    },
  },
  {
    name: 'music_queue',
    description: 'Add a song to the end of the Spotify queue. Get the uri from music_search. The person confirms first.',
    write: true,
    input_schema: { type: 'object', properties: {
      uri: { type: 'string', description: 'spotify:track:… from music_search' },
      title: { type: 'string', description: 'Song and artist, for the confirm card' },
    }, required: ['uri', 'title'] },
    summarize: i => `Add ${str(i.title) ?? 'that song'} to the queue`,
    run: async ({ userId }, i) => {
      const r = await control(await musicLink(userId), { action: 'queue', uri: String(i.uri) })
      if (!r.ok) throw new ToolInputError(r.error)
      return { queued: str(i.title) }
    },
  },
  {
    name: 'music_play_playlist',
    description: 'Start one of the person\'s playlists (uri from music_options), optionally on a speaker (device id from music_options). The person confirms first.',
    write: true,
    input_schema: { type: 'object', properties: {
      uri: { type: 'string' }, name: { type: 'string', description: 'Playlist name, for the confirm card' },
      device_id: { type: 'string' }, device_name: { type: 'string' },
    }, required: ['uri', 'name'] },
    summarize: i => `Play ${str(i.name) ?? 'that playlist'}${str(i.device_name) ? ` on ${str(i.device_name)}` : ''}`,
    run: async ({ userId }, i) => {
      const uri = String(i.uri)
      if (!/^spotify:(playlist|album|artist|show):[A-Za-z0-9]{10,40}$/.test(uri)) throw new ToolInputError('Use a playlist uri from music_options.')
      const deviceId = typeof i.device_id === 'string' && /^[A-Za-z0-9]{10,80}$/.test(i.device_id) ? i.device_id : undefined
      const r = await control(await musicLink(userId), { action: 'playlist', uri, ...(deviceId ? { deviceId } : {}) })
      if (!r.ok) throw new ToolInputError(r.error)
      return { playing: str(i.name) }
    },
  },
]

export const HOME_TOOLS: JarvisTool[] = [...houseTools, ...musicTools]
