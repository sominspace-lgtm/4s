import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { timingSafeEqual } from 'node:crypto'
import { requireGoogleUser } from '@/lib/google/server'
import { SPOTIFY_STATE_COOKIE, linkSpotify } from '@/lib/spotify/server'

// Spotify sends you back here after you agree (2026-11-18).
export async function GET(request: Request) {
  const url = new URL(request.url)
  const back = (result: string) => {
    const res = NextResponse.redirect(new URL(`/account?spotify=${result}`, url.origin))
    res.cookies.set(SPOTIFY_STATE_COOKIE, '', { path: '/api/spotify', maxAge: 0 })
    return res
  }
  const saved = (await cookies()).get(SPOTIFY_STATE_COOKIE)?.value ?? ''
  const got = url.searchParams.get('state') ?? ''
  const code = url.searchParams.get('code')
  if (url.searchParams.get('error') || !code || !saved) return back('cancelled')
  if (got.length !== saved.length || !timingSafeEqual(Buffer.from(got), Buffer.from(saved))) return back('failed')
  const who = await requireGoogleUser()
  if (!who.ok) return back('failed')
  const err = await linkSpotify(who.userId, code, url.origin)
  return back(err ? (err.includes('User Management') ? 'not-allowed' : 'failed') : 'connected')
}
