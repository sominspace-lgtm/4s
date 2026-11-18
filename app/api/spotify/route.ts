import { NextResponse } from 'next/server'
import { requireGoogleUser } from '@/lib/google/server'
import { linksFor, spotifyConfigured, unlinkSpotify } from '@/lib/spotify/server'

// Your own Spotify link (2026-11-18).
//   GET     is it set up on SS, are you linked, as whom
//   DELETE  unlink
export async function GET() {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const [link] = await linksFor([who.userId])
  return NextResponse.json({ configured: spotifyConfigured(), connected: !!link, name: link?.display_name ?? null })
}

export async function DELETE() {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  await unlinkSpotify(who.userId)
  return NextResponse.json({ ok: true })
}
