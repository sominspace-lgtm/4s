import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Alexa account linking — OAuth 2.0 Implicit Grant authorize endpoint.
//
// Alexa opens this URL in the Alexa app when the user links the skill. If the
// user has a live 4S session (Supabase cookie), we mint/reuse a stable opaque
// token for them and redirect back to Alexa's redirect_uri with the token in
// the URL fragment. Alexa stores it and sends it as
// context.System.user.accessToken on every skill request, which /api/alexa
// validates against the alexa_links table.
//
// If there's no session yet, bounce through /login and come back here.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const redirectUri = url.searchParams.get('redirect_uri')
  const state = url.searchParams.get('state') ?? ''

  if (!redirectUri) {
    return NextResponse.json({ error: 'Missing redirect_uri' }, { status: 400 })
  }

  // Only ever hand a token to an Amazon-owned redirect target.
  let redirectHost: string
  try {
    redirectHost = new URL(redirectUri).hostname
  } catch {
    return NextResponse.json({ error: 'Invalid redirect_uri' }, { status: 400 })
  }
  const amazonHost = /(^|\.)(amazon\.com|amazon\.co\.jp|amazon\.co\.uk|amazon\.de|amazonalexa\.com)$/i
  if (!amazonHost.test(redirectHost)) {
    return NextResponse.json({ error: 'redirect_uri is not an Alexa host' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // Send them to log in, then return to this exact authorize URL.
    const login = new URL('/login', url.origin)
    login.searchParams.set('next', url.pathname + url.search)
    return NextResponse.redirect(login)
  }

  // Reuse the existing token if the user already linked once, so re-linking is
  // idempotent; otherwise create a fresh one.
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('alexa_links')
    .select('token')
    .eq('user_id', user.id)
    .maybeSingle()

  let token = existing?.token
  if (!token) {
    token = randomBytes(32).toString('hex')
    const { error } = await admin.from('alexa_links').insert({ user_id: user.id, token })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const dest = new URL(redirectUri)
  dest.hash = `state=${encodeURIComponent(state)}&access_token=${encodeURIComponent(token)}&token_type=Bearer`
  return NextResponse.redirect(dest.toString())
}
