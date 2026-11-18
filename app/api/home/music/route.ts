import { NextResponse } from 'next/server'
import { householdSpotify } from '@/lib/spotify/household'
import { nowPlaying, control, parseControl } from '@/lib/spotify/server'

// Music on the wall screen (2026-11-18). Works on the screen's own key or a
// member's sign-in, for one household's linked Spotify accounts only.
//   GET   what each linked person is playing
//   POST  { userId, action, ... } play, pause, next, previous, a playlist, or a speaker
export async function GET(request: Request) {
  const h = await householdSpotify(new URL(request.url).searchParams.get('spaceId'))
  if ('error' in h) return NextResponse.json({ error: h.error }, { status: h.status })
  const people = await Promise.all(h.links.map(nowPlaying))
  return NextResponse.json({ people })
}

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({})) as Record<string, unknown>
  const h = await householdSpotify(b.spaceId)
  if ('error' in h) return NextResponse.json({ error: h.error }, { status: h.status })
  const link = h.links.find(l => l.user_id === b.userId)
  if (!link) return NextResponse.json({ error: 'That Spotify is not linked here.' }, { status: 404 })
  const c = parseControl(b)
  if (!c) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const r = await control(link, c)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
