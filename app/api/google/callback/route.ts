import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { FOR_COOKIE, STATE_COOKIE, householdOwner, redirectUri, requireGoogleUser, saveTokens } from '@/lib/google/server'

// Google sends the browser back here with ?code. Swap it for tokens, store
// them (sealed, service-role only), then return to the dashboard.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = url.origin
  const back = (status: string) => {
    const res = NextResponse.redirect(`${origin}/dashboard?google=${status}`)
    res.cookies.delete(STATE_COOKIE)
    res.cookies.delete(FOR_COOKIE)
    return res
  }

  const who = await requireGoogleUser()
  if (!who.ok) return back('denied')

  if (url.searchParams.get('error')) return back('cancelled')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const expected = (await cookies()).get(STATE_COOKIE)?.value
  if (!code || !state || !expected || state !== expected) return back('badstate')

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(origin), grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) return back('tokenfail')
  const t = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number; scope?: string }

  let email: string | null = null
  try {
    const info = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { authorization: `Bearer ${t.access_token}` } })
    if (info.ok) email = ((await info.json()) as { email?: string }).email ?? null
  } catch { /* the email is a label, not required */ }

  try {
    const forHousehold = (await cookies()).get(FOR_COOKIE)?.value === 'household'
    const owner = forHousehold ? await householdOwner(who.userId) : who.userId
    if (!owner) return back('savefail')
    await saveTokens(owner, { ...t, email }, who.userId)
  } catch {
    return back('savefail')
  }
  return back('connected')
}
