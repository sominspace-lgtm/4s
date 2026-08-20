import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dueUrgency } from '@/lib/hooks/useWorkItems'
import { sendPushToUser } from '@/lib/push/send'

// The server-side half of the waiting-notice that's lived in
// DashboardClient.tsx as a tab-only browser Notification() since it was
// written — this is what makes it real: it now reaches you whether the tab
// is open or not, via Vercel Cron (see vercel.json) hitting this once a day.
//
// Same rules as the original, on purpose — this is the one existing nudge in
// the whole app, not a new one:
// - at most once a day per person (push_notify_state, not localStorage,
//   since there's no browser here to hold that)
// - named, never counted ("X is still waiting", not "3 things overdue") —
//   the comment on the original explains why: a guilt notification
//   following the user out of the app is exactly what this product
//   promises not to be.

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  // Only people who've actually subscribed on some device — no reason to
  // touch work_items for anyone push can't reach anyway.
  const { data: subscribed } = await admin.from('push_subscriptions').select('user_id')
  const userIds = [...new Set((subscribed ?? []).map(r => r.user_id as string))]

  let notified = 0
  for (const userId of userIds) {
    const { data: state } = await admin.from('push_notify_state').select('last_waiting_notice_on').eq('user_id', userId).maybeSingle()
    if (state?.last_waiting_notice_on === today) continue

    const { data: items } = await admin.from('work_items').select('title, due_date, status').eq('user_id', userId).neq('status', 'done')
    const waiting = (items ?? []).filter(i => dueUrgency(i.due_date as string | null) === 'overdue')
    if (waiting.length === 0) continue

    await sendPushToUser(admin, userId, {
      title: '4S',
      body: waiting.length === 1
        ? `"${waiting[0].title}" is still waiting for you.`
        : `"${waiting[0].title}" and a few others are still waiting for you.`,
      url: '/dashboard',
    })
    await admin.from('push_notify_state').upsert({ user_id: userId, last_waiting_notice_on: today })
    notified++
  }

  return NextResponse.json({ checked: userIds.length, notified })
}
