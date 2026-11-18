import { NextResponse } from 'next/server'
import { householdSpotify } from '@/lib/spotify/household'
import { upNext, searchTracks } from '@/lib/spotify/server'
import { guestNamesFor } from '@/lib/spotify/guestSongs'
import { callerFor } from '@/lib/smarthome/auth'
import { spacesFor } from '@/lib/devices/members'

// Up next, and song search, for one linked person (2026-11-18). Same
// household check as /api/home/music.
//   GET ?userId=        the next songs, with the guest who added each
//   GET ?userId=&q=     search songs to add
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams
  const h = await householdSpotify(q.get('spaceId'))
  if ('error' in h) return NextResponse.json({ error: h.error }, { status: h.status })
  const link = h.links.find(l => l.user_id === q.get('userId'))
  if (!link) return NextResponse.json({ error: 'That Spotify is not linked here.' }, { status: 404 })
  const search = q.get('q')
  if (search != null) return NextResponse.json({ results: await searchTracks(link, search) })

  const caller = await callerFor(q.get('spaceId'), true)
  const spaceIds = 'error' in caller ? [] : caller.spaceId ? [caller.spaceId] : caller.as === 'member' ? (await spacesFor(caller.userId)).map(s => s.id) : []
  const [tracks, names] = await Promise.all([upNext(link), guestNamesFor({ spaceIds })])
  return NextResponse.json({ upNext: tracks.map(t => ({ ...t, by: names.get(t.uri) ?? null })) })
}
