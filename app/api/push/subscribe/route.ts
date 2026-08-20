import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Called from the browser by whoever just granted notification permission
// and subscribed via pushManager.subscribe() — stores the subscription so
// the cron route (or any future server trigger) has somewhere to send to.
// Session-authenticated, not a bearer token: this is a browser action, not
// the Discord bot.

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const sub = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  // Admin client so re-subscribing the same endpoint under a different
  // signed-in profile (Harry's phone, then Sylvia's, on a shared device)
  // cleanly reassigns it rather than colliding with someone else's RLS-owned row.
  const admin = createAdminClient()
  const { error } = await admin.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    { onConflict: 'endpoint' },
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
