import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHostRecipients } from '@/lib/guest/portal'
import { sendPushToUser } from '@/lib/push/send'

// Sends one mail message and pushes everyone else in the space (2026-09-22).
// The insert itself could happen straight from the client like every other
// household table — RLS already allows it — but push delivery needs the
// admin client to read push_subscriptions, so this route does both in one
// call rather than having the client insert, then separately hit a
// notify-only endpoint (a message sent with no push if the second call
// failed would be a confusing half-delivered state).
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const spaceId = (body.spaceId as string ?? '').trim()
  const text = (body.body as string ?? '').trim()
  if (!spaceId || !text) return NextResponse.json({ error: 'spaceId and body are required' }, { status: 400 })
  if (text.length > 2000) return NextResponse.json({ error: 'That message is too long.' }, { status: 400 })

  // Insert via the caller's own session, not the admin client — RLS's
  // mail_send policy is the actual authorization check (space membership +
  // from_user_id = auth.uid()), so a stranger passing an arbitrary spaceId
  // is rejected by the database itself, not by application logic here.
  const { data: message, error } = await supabase
    .from('mail_messages')
    .insert({ space_id: spaceId, from_user_id: user.id, body: text })
    .select('id, created_at')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const admin = createAdminClient()
  const recipients = (await resolveHostRecipients(spaceId)).filter(id => id !== user.id)
  const preview = text.length > 120 ? `${text.slice(0, 117)}...` : text
  let sent = 0
  for (const id of recipients) {
    try { sent += await sendPushToUser(admin, id, { title: 'New mail', body: preview, url: '/dashboard' }) }
    catch { /* VAPID unset / delivery error — the message itself already saved */ }
  }

  return NextResponse.json({ ok: true, id: message.id, created_at: message.created_at, pushed: sent })
}
