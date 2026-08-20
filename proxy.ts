import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const publicPaths = ['/login', '/onboard', '/guide']
  // /api/alexa/* must bypass the browser-session gate: the skill webhook is
  // called server-to-server by Amazon (no cookie, authenticates by link token),
  // and /api/alexa/authorize does its own session check + login?next= redirect
  // for account linking. Without this, both get bounced to /login.
  // /api/household/* is the same situation: the Discord bot calls it
  // server-to-server with a bearer token and no cookie. The exceptions are
  // browser-called routes that need the session — link-code (issuing a
  // pairing code) and connections (viewing/editing/revoking a link) — both
  // do their own getUser() check, so keeping them gated here too is correct.
  const householdBrowserRoutes = ['/api/household/link-code', '/api/household/connections']
  const isPublic = publicPaths.some(p => pathname.startsWith(p))
    || pathname.startsWith('/auth')
    // Dev-only visual harness for the village scene. The page itself 404s in
    // production, so this exception can never expose anything there.
    || (process.env.NODE_ENV !== 'production' && pathname.startsWith('/village-preview'))
    || pathname.startsWith('/api/alexa')
    || (pathname.startsWith('/api/household') && !householdBrowserRoutes.some(p => pathname.startsWith(p)))
    // Called from the login page before any session cookie exists — each
    // does its own PIN check (or none, for pin-status's read-only lookup)
    // and mints the session itself, same reasoning as the Alexa webhook above.
    || pathname === '/api/auth/pin-login'
    || pathname === '/api/auth/pin-setup'
    || pathname === '/api/auth/pin-status'

  if (!user && !isPublic) {
    // Preserve where the request was actually headed, so signing in lands
    // back there instead of always at the dashboard — login/page.tsx already
    // reads ?next= (this is exactly what Alexa's link-code flow builds by
    // hand today), this just makes it the general behavior instead of a
    // one-off. Concretely fixes /share-target: a share arriving after the
    // session's expired shouldn't just discard whatever was shared.
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/dashboard') loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Redirect un-onboarded users to /onboard (skip if already there)
  if (user && pathname === '/dashboard') {
    const { data: prefs } = await supabase
      .from('user_prefs')
      .select('onboarded')
      .eq('user_id', user.id)
      .single()
    if (prefs && prefs.onboarded === false) {
      return NextResponse.redirect(new URL('/onboard', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|js)$).*)'],
}
