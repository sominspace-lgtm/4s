import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireGoogleUser } from '@/lib/google/server'
import { SPOTIFY_STATE_COOKIE, spotifyAuthorizeUrl, spotifyConfigured } from '@/lib/spotify/server'

// Start linking your Spotify (2026-11-18). Your own account only, never from
// the shared screen. A random state in an httpOnly cookie must come back
// unchanged, so a sign-in this browser did not start is rejected.
export async function GET(request: Request) {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const origin = new URL(request.url).origin
  if (!spotifyConfigured()) return NextResponse.redirect(new URL('/account?spotify=setup', origin))
  const state = crypto.randomBytes(24).toString('hex')
  const res = NextResponse.redirect(spotifyAuthorizeUrl(origin, state))
  res.cookies.set(SPOTIFY_STATE_COOKIE, state, {
    httpOnly: true, sameSite: 'lax', path: '/api/spotify', maxAge: 600, secure: process.env.NODE_ENV === 'production',
  })
  return res
}
