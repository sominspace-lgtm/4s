import { NextResponse } from 'next/server'
import { householdSpotify } from '@/lib/spotify/household'
import { choices } from '@/lib/spotify/server'

// One linked person's playlists and speakers, for "Play something" on the
// wall screen (2026-11-18). Same household check as /api/home/music.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams
  const h = await householdSpotify(q.get('spaceId'))
  if ('error' in h) return NextResponse.json({ error: h.error }, { status: h.status })
  const link = h.links.find(l => l.user_id === q.get('userId'))
  if (!link) return NextResponse.json({ error: 'That Spotify is not linked here.' }, { status: 404 })
  return NextResponse.json(await choices(link))
}
