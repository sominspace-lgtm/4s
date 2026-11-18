import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveGathering, clip } from '@/lib/guest/portal'
import { linksForSpaces } from '@/lib/spotify/household'
import { playerOf, upNext, searchTracks, addToQueue, isTrackUri } from '@/lib/spotify/server'
import { guestNamesFor } from '@/lib/spotify/guestSongs'

// Guests adding songs to the hosts' Spotify while a gathering is on
// (2026-11-18). Works only on a live gathering's link, only when a host's
// Spotify is playing, and only while the hosts leave "Guests can add
// songs" on. A guest never sees whose account it is or any other
// listening, just what is playing and what is next.
//   GET            now playing + up next
//   GET ?q=        search songs
//   POST { uri, title, artist, art, guest_name }   add to the queue

const hits = new Map<string, number[]>()
function tooMany(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const list = (hits.get(key) ?? []).filter(t => now - t < windowMs)
  if (list.length >= max) { hits.set(key, list); return true }
  list.push(now); hits.set(key, list)
  return false
}
const ipOf = (r: Request) => r.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'

interface Props { params: Promise<{ token: string }> }

async function setup(token: string) {
  const g = await resolveGathering(token)
  if (!g) return { error: 'Not found', status: 404 } as const
  if (!g.active) return { error: 'This gathering has ended.', status: 410 } as const
  if (g.guestInfo.songQueue === false) return { off: true, g } as const
  const player = await playerOf(await linksForSpaces([g.spaceId]))
  return { g, player } as const
}

export async function GET(request: Request, { params }: Props) {
  const { token } = await params
  const s = await setup(token)
  if ('error' in s) return NextResponse.json({ error: s.error }, { status: s.status })
  if ('off' in s || !s.player) return NextResponse.json({ on: false, now: null, upNext: [] })
  const q = new URL(request.url).searchParams.get('q')
  if (q != null) {
    if (tooMany(`s:${s.g.id}:${ipOf(request)}`, 30, 60_000)) return NextResponse.json({ error: 'Slow down a sec.' }, { status: 429 })
    return NextResponse.json({ results: await searchTracks(s.player.link, q) })
  }
  const p = s.player.now.playing
  const [tracks, names] = await Promise.all([upNext(s.player.link, 6), guestNamesFor({ gatheringId: s.g.id })])
  return NextResponse.json({
    on: true,
    now: p ? { title: p.title, artist: p.artist, art: p.art, isPlaying: p.isPlaying } : null,
    upNext: tracks.map(t => ({ title: t.title, artist: t.artist, art: t.art, by: names.get(t.uri) ?? null })),
  })
}

export async function POST(request: Request, { params }: Props) {
  const { token } = await params
  const s = await setup(token)
  if ('error' in s) return NextResponse.json({ error: s.error }, { status: s.status })
  if ('off' in s || !s.player) return NextResponse.json({ error: 'The hosts are not taking songs right now.' }, { status: 409 })
  const b = await request.json().catch(() => ({})) as Record<string, unknown>
  if (!isTrackUri(b.uri)) return NextResponse.json({ error: 'Pick a song from the list.' }, { status: 400 })
  // Each phone: one song every 20 seconds, eight in ten minutes.
  const ip = ipOf(request)
  if (tooMany(`a:${s.g.id}:${ip}`, 1, 20_000) || tooMany(`b:${s.g.id}:${ip}`, 8, 600_000)) {
    return NextResponse.json({ error: 'Give the others a turn. Try again in a bit.' }, { status: 429 })
  }
  const added = await addToQueue(s.player.link, b.uri)
  if (!added.ok) return NextResponse.json({ error: added.error }, { status: 400 })
  const title = clip(b.title, 120)
  await createAdminClient().from('guest_contributions').insert({
    gathering_id: s.g.id, space_id: s.g.spaceId, kind: 'song', guest_name: clip(b.guest_name, 40), body: title,
    meta: { title, uri: b.uri, artist: clip(b.artist, 120), art: typeof b.art === 'string' && b.art.startsWith('https://i.scdn.co/') ? b.art.slice(0, 300) : null, queued: true },
  })
  return NextResponse.json({ ok: true })
}
