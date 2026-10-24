import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { FOR_COOKIE, GOOGLE_SCOPES, STATE_COOKIE, googleConfigured, householdOwner, redirectUri, requireGoogleAccess } from '@/lib/google/server'

// Starts the Google sign-in (2026-10-05). A random `state` is also stored in
// an httpOnly cookie and checked on the way back, so a callback this browser
// did not start is rejected.
export async function GET(request: Request) {
  const who = await requireGoogleAccess(new URL(request.url).searchParams.get('for') === 'household' ? 'shared' : null)
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  if (!googleConfigured()) return NextResponse.json({ error: 'Google is not configured on the server.' }, { status: 503 })

  const origin = new URL(request.url).origin
  // ?for=household links the shared email to the household (2026-10-24).
  const forHousehold = new URL(request.url).searchParams.get('for') === 'household'
  if (forHousehold && !(await householdOwner(who.userId))) return NextResponse.json({ error: 'Join a household first.' }, { status: 400 })
  const state = crypto.randomBytes(24).toString('hex')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    // Always show consent so Google returns a refresh token every time.
    prompt: 'consent select_account',
    include_granted_scopes: 'true',
    state,
  }).toString()

  const res = NextResponse.redirect(url)
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600, secure: process.env.NODE_ENV === 'production',
  })
  res.cookies.set(FOR_COOKIE, forHousehold ? 'household' : 'me', {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600, secure: process.env.NODE_ENV === 'production',
  })
  return res
}
