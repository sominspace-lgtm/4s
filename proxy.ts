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
  const isPublic = publicPaths.some(p => pathname.startsWith(p))
    || pathname.startsWith('/auth')
    || pathname.startsWith('/api/alexa')

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
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
