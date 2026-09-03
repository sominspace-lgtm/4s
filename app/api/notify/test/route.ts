import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push/send'

// A push the user fires at themselves from the Notifications panel, to
// confirm the whole chain works (a live subscription row, the VAPID keys,
// the service worker) without waiting for a real trigger like the Sunday
// check-in nudge. Session-authed; delivers only to the caller.
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sent = await sendPushToUser(createAdminClient(), user.id, {
      title: '4S', body: 'Test notification — push is working.', url: '/dashboard',
    })
    return NextResponse.json({ sent })
  } catch (e) {
    // Almost always "VAPID keys are not configured" — surface it plainly.
    return NextResponse.json({ error: e instanceof Error ? e.message : 'send failed' }, { status: 500 })
  }
}
