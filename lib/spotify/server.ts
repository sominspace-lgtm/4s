import { createAdminClient } from '@/lib/supabase/admin'
import { seal, open } from '@/lib/google/server'

// Spotify (2026-11-18). Server-only. Each person links their own Spotify;
// tokens are sealed before storage in spotify_links, which only the service
// role can read, and never reach a browser. The wall iPad only ever gets
// what is playing and a list of playlists and speakers, nothing else.
//
// Setup: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in Vercel, from an app
// made at developer.spotify.com (the owner needs Premium). Its redirect URI
// must be <site>/api/spotify/callback, and each of you must be added under
// the app's "User Management" (Spotify allows up to 5 people).

const API = 'https://api.spotify.com/v1'
export const SPOTIFY_SCOPES = [
  'user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing',
  'playlist-read-private', 'playlist-read-collaborative',
]
export const SPOTIFY_STATE_COOKIE = 'ss-spotify-state'

export const spotifyConfigured = () => !!process.env.SPOTIFY_CLIENT_ID && !!process.env.SPOTIFY_CLIENT_SECRET
export const spotifyRedirect = (origin: string) => `${origin}/api/spotify/callback`

export function spotifyAuthorizeUrl(origin: string, state: string): string {
  return 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!, response_type: 'code', redirect_uri: spotifyRedirect(origin),
    scope: SPOTIFY_SCOPES.join(' '), state, show_dialog: 'true',
  })
}

interface TokenReply { access_token: string; refresh_token?: string; expires_in: number }

async function tokenCall(body: Record<string, string>): Promise<TokenReply | null> {
  const id = process.env.SPOTIFY_CLIENT_ID!, secret = process.env.SPOTIFY_CLIENT_SECRET!
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', cache: 'no-store',
    headers: { Authorization: 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  return r.ok ? await r.json() as TokenReply : null
}

const expiry = (t: TokenReply) => new Date(Date.now() + Math.max(60, (t.expires_in || 3600) - 120) * 1000).toISOString()

/** Finishes linking: trades the one-time code for tokens and saves them for this person. */
export async function linkSpotify(userId: string, code: string, origin: string): Promise<string | null> {
  const t = await tokenCall({ grant_type: 'authorization_code', code, redirect_uri: spotifyRedirect(origin) })
  if (!t?.access_token || !t.refresh_token) return 'Spotify did not accept that. Try again.'
  const me = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${t.access_token}` }, cache: 'no-store' })
  if (me.status === 403) return 'Spotify says this account is not on the app yet. Add it under User Management on developer.spotify.com.'
  const profile = me.ok ? await me.json() as { display_name?: string } : {}
  const { error } = await createAdminClient().from('spotify_links').upsert({
    user_id: userId, access_token: seal(t.access_token), refresh_token: seal(t.refresh_token), expires_at: expiry(t),
    display_name: profile.display_name?.slice(0, 60) ?? null, updated_at: new Date().toISOString(),
  })
  return error ? 'Could not save it. Has the Spotify database update been run?' : null
}

export async function unlinkSpotify(userId: string) {
  await createAdminClient().from('spotify_links').delete().eq('user_id', userId)
}

export interface Link { user_id: string; access_token: string; refresh_token: string; expires_at: string; display_name: string | null }

export async function linksFor(userIds: string[]): Promise<Link[]> {
  if (!userIds.length) return []
  const { data, error } = await createAdminClient().from('spotify_links')
    .select('user_id, access_token, refresh_token, expires_at, display_name').in('user_id', userIds)
  return error ? [] : (data as Link[])
}

async function tokenFor(link: Link): Promise<string | null> {
  if (Date.parse(link.expires_at) > Date.now()) return open(link.access_token)
  const refresh = open(link.refresh_token)
  if (!refresh) return null
  const t = await tokenCall({ grant_type: 'refresh_token', refresh_token: refresh })
  if (!t?.access_token) return null
  await createAdminClient().from('spotify_links').update({
    access_token: seal(t.access_token), expires_at: expiry(t), updated_at: new Date().toISOString(),
    // Spotify sometimes hands back a new refresh token; keep it if so.
    ...(t.refresh_token ? { refresh_token: seal(t.refresh_token) } : {}),
  }).eq('user_id', link.user_id)
  return t.access_token
}

async function sp<T>(link: Link, path: string, init?: { method?: string; body?: unknown }): Promise<{ ok: true; data: T | null } | { ok: false; error: string }> {
  const token = await tokenFor(link)
  if (!token) return { ok: false, error: 'Spotify needs linking again.' }
  const r = await fetch(API + path, {
    method: init?.method ?? 'GET', cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(init?.body ? { 'Content-Type': 'application/json' } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  if (r.status === 204) return { ok: true, data: null }
  if (r.status === 404) return { ok: false, error: 'Nothing is playing. Open Spotify on a speaker or phone first, or pick a speaker.' }
  if (r.status === 403) return { ok: false, error: 'Spotify needs Premium for that.' }
  if (!r.ok) return { ok: false, error: 'Spotify did not answer. Try again.' }
  const text = await r.text()
  return { ok: true, data: text ? JSON.parse(text) as T : null }
}

export interface NowPlaying {
  userId: string; name: string
  playing: { title: string; artist: string; art: string | null; isPlaying: boolean; progressMs: number; durationMs: number; device: string | null } | null
}

interface PlayerReply {
  is_playing?: boolean; progress_ms?: number; device?: { name?: string }
  item?: { name?: string; duration_ms?: number; artists?: { name: string }[]; show?: { name?: string }; album?: { images?: { url: string; width?: number }[] }; images?: { url: string; width?: number }[] }
}

export async function nowPlaying(link: Link): Promise<NowPlaying> {
  const r = await sp<PlayerReply>(link, '/me/player?additional_types=episode')
  const p = r.ok ? r.data : null
  const it = p?.item
  const imgs = it?.album?.images ?? it?.images ?? []
  return {
    userId: link.user_id, name: link.display_name ?? 'Spotify',
    playing: it ? {
      title: it.name ?? '', artist: (it.artists ?? []).map(a => a.name).join(', ') || it.show?.name || '',
      art: imgs.find(i => (i.width ?? 0) >= 200 && (i.width ?? 0) <= 400)?.url ?? imgs[0]?.url ?? null,
      isPlaying: !!p?.is_playing, progressMs: p?.progress_ms ?? 0, durationMs: it.duration_ms ?? 0, device: p?.device?.name ?? null,
    } : null,
  }
}

export type Control =
  | { action: 'play' | 'pause' | 'next' | 'previous' }
  | { action: 'playlist'; uri: string; deviceId?: string }
  | { action: 'transfer'; deviceId: string }
  | { action: 'queue'; uri: string }

const isUri = (u: unknown): u is string => typeof u === 'string' && /^spotify:(playlist|album|artist|show):[A-Za-z0-9]{10,40}$/.test(u)
const isDevice = (d: unknown): d is string => typeof d === 'string' && /^[A-Za-z0-9]{10,80}$/.test(d)

/** Checks a control request from a browser before it goes anywhere. */
export function parseControl(b: Record<string, unknown>): Control | null {
  if (b.action === 'play' || b.action === 'pause' || b.action === 'next' || b.action === 'previous') return { action: b.action }
  if (b.action === 'playlist' && isUri(b.uri)) return { action: 'playlist', uri: b.uri, ...(isDevice(b.deviceId) ? { deviceId: b.deviceId } : {}) }
  if (b.action === 'transfer' && isDevice(b.deviceId)) return { action: 'transfer', deviceId: b.deviceId }
  if (b.action === 'queue' && typeof b.uri === 'string' && /^spotify:track:[A-Za-z0-9]{10,40}$/.test(b.uri)) return { action: 'queue', uri: b.uri }
  return null
}

export async function control(link: Link, c: Control): Promise<{ ok: true } | { ok: false; error: string }> {
  switch (c.action) {
    case 'play': return sp(link, '/me/player/play', { method: 'PUT' })
    case 'pause': return sp(link, '/me/player/pause', { method: 'PUT' })
    case 'next': return sp(link, '/me/player/next', { method: 'POST' })
    case 'previous': return sp(link, '/me/player/previous', { method: 'POST' })
    case 'playlist': return sp(link, `/me/player/play${c.deviceId ? `?device_id=${c.deviceId}` : ''}`, { method: 'PUT', body: { context_uri: c.uri } })
    case 'transfer': return sp(link, '/me/player', { method: 'PUT', body: { device_ids: [c.deviceId], play: true } })
    case 'queue': return addToQueue(link, c.uri)
  }
}

export interface Choices {
  playlists: { uri: string; name: string; art: string | null }[]
  devices: { id: string; name: string; type: string; active: boolean }[]
}

export async function choices(link: Link): Promise<Choices> {
  const [pl, dv] = await Promise.all([
    sp<{ items?: { uri: string; name: string; images?: { url: string }[] | null }[] }>(link, '/me/playlists?limit=24'),
    sp<{ devices?: { id: string | null; name: string; type: string; is_active: boolean; is_restricted?: boolean }[] }>(link, '/me/player/devices'),
  ])
  return {
    playlists: ((pl.ok ? pl.data?.items : []) ?? []).filter(Boolean).map(p => ({ uri: p.uri, name: p.name, art: p.images?.[0]?.url ?? null })),
    devices: ((dv.ok ? dv.data?.devices : []) ?? []).filter(d => d.id && !d.is_restricted).map(d => ({ id: d.id!, name: d.name, type: d.type, active: d.is_active })),
  }
}

// --- the queue (2026-11-18) -------------------------------------------------
// "Up next" on the Village, and guests adding songs while you host.

export interface Track { uri: string; title: string; artist: string; art: string | null }

interface TrackReply {
  uri?: string; name?: string; artists?: { name: string }[]; show?: { name?: string }
  album?: { images?: { url: string; width?: number }[] }; images?: { url: string; width?: number }[]
}

function toTrack(t: TrackReply | null | undefined): Track | null {
  if (!t?.uri || !t.name) return null
  const imgs = t.album?.images ?? t.images ?? []
  // The smallest picture that is still sharp at list size.
  const art = [...imgs].sort((a, b) => (a.width ?? 0) - (b.width ?? 0)).find(i => (i.width ?? 0) >= 64)?.url ?? imgs[0]?.url ?? null
  return { uri: t.uri, title: t.name, artist: (t.artists ?? []).map(a => a.name).join(', ') || t.show?.name || '', art }
}

/** The next few songs in this person's Spotify queue. Empty when nothing plays. */
export async function upNext(link: Link, max = 8): Promise<Track[]> {
  const r = await sp<{ queue?: TrackReply[] }>(link, '/me/player/queue')
  if (!r.ok) return []
  return (r.data?.queue ?? []).map(toTrack).filter((t): t is Track => !!t).slice(0, max)
}

/** Song search for the queue. Spotify allows 10 results per search for apps like this one. */
export async function searchTracks(link: Link, q: string): Promise<Track[]> {
  const query = q.trim().slice(0, 80)
  if (!query) return []
  const r = await sp<{ tracks?: { items?: TrackReply[] } }>(link, `/search?type=track&limit=10&q=${encodeURIComponent(query)}`)
  if (!r.ok) return []
  return (r.data?.tracks?.items ?? []).map(toTrack).filter((t): t is Track => !!t)
}

export const isTrackUri = (u: unknown): u is string => typeof u === 'string' && /^spotify:track:[A-Za-z0-9]{10,40}$/.test(u)

export async function addToQueue(link: Link, uri: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isTrackUri(uri)) return { ok: false, error: 'That is not a song.' }
  const r = await sp(link, `/me/player/queue?uri=${encodeURIComponent(uri)}`, { method: 'POST' })
  return r.ok ? { ok: true } : { ok: false, error: r.error }
}

/** Of a household's linked accounts, the one whose music is on right now. */
export async function playerOf(links: Link[]): Promise<{ link: Link; now: NowPlaying } | null> {
  const all = await Promise.all(links.map(async link => ({ link, now: await nowPlaying(link) })))
  return all.find(x => x.now.playing?.isPlaying) ?? all.find(x => x.now.playing) ?? null
}
