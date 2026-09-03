import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

// Where a share from another app lands (2026-08-20) — "share to 4S" from
// your phone's native share sheet, the way you'd share to Notes or Mail.
// Registered via manifest.json's share_target, GET method: title/text/url
// come back as query params, not a POST body, because a GET-based target is
// the one form every mobile browser actually honors for text/link shares.
//
// No UI of its own — it folds whatever was shared into one personal note
// and sends you straight to the dashboard (2026-09-04: was a `captures`
// row; Quick Capture folded into Notes).
export default async function ShareTargetPage({
  searchParams,
}: {
  searchParams: Promise<{ title?: string; text?: string; url?: string }>
}) {
  const { title, text, url } = await searchParams
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  // Defensive only — proxy.ts's own auth gate already redirects an
  // unauthenticated request to /login?next=/share-target?... before this
  // page ever runs, preserving the shared title/text/url through sign-in.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const parts = [title, text, url].map(p => p?.trim()).filter((p): p is string => !!p)
  const combined = [...new Set(parts)].join(' — ').slice(0, 2000)

  if (combined) {
    await supabase.from('notes').insert({ user_id: user.id, space_id: null, title: '', body: combined })
  }

  redirect('/dashboard')
}
