import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dueUrgency } from '@/lib/hooks/useWorkItems'
import { sendPushToUser } from '@/lib/push/send'

// The one scheduled server nudge (Vercel Cron, once a day — see vercel.json).
// Was `waiting-notice`, overdue tasks only; now a few kinds, each gated by
// the user's own notifyPrefs (user_prefs.layout.notifyPrefs, missing = on)
// and deduped per-kind via push_notify_state.last_sent so a kind fires at
// most once per its own natural window.
//
// Still the product's promise: named, never counted; nothing alarmist;
// nothing that follows you around out of guilt.

type Kind = 'overdueTasks' | 'subRenewal' | 'checkinNudge'

/** Monday (ISO week start) of a date, as YYYY-MM-DD. */
function weekMonday(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7))
  return x.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const isSunday = now.getUTCDay() === 0
  const monday = weekMonday(now)

  const { data: subscribed } = await admin.from('push_subscriptions').select('user_id')
  const userIds = [...new Set((subscribed ?? []).map(r => r.user_id as string))]

  let notified = 0
  for (const userId of userIds) {
    const [{ data: prefsRow }, { data: stateRow }] = await Promise.all([
      admin.from('user_prefs').select('layout').eq('user_id', userId).maybeSingle(),
      admin.from('push_notify_state').select('last_sent').eq('user_id', userId).maybeSingle(),
    ])
    const prefs = ((prefsRow?.layout as { notifyPrefs?: Record<string, boolean> } | null)?.notifyPrefs) ?? {}
    const on = (k: Kind) => prefs[k] !== false
    const sent: Record<string, string> = (stateRow?.last_sent as Record<string, string> | null) ?? {}
    const fresh: Record<string, string> = {}

    // 1. Overdue tasks — once a day.
    if (on('overdueTasks') && sent[`overdue:${today}`] === undefined) {
      const { data: items } = await admin.from('work_items').select('title, due_date, status').eq('user_id', userId).neq('status', 'done')
      const waiting = (items ?? []).filter(i => dueUrgency(i.due_date as string | null) === 'overdue')
      if (waiting.length > 0) {
        await sendPushToUser(admin, userId, {
          title: '4S',
          body: waiting.length === 1
            ? `"${waiting[0].title}" is still waiting for you.`
            : `"${waiting[0].title}" and a few others are still waiting for you.`,
          url: '/dashboard',
        })
        fresh[`overdue:${today}`] = today
        notified++
      }
    }

    // 2. A subscription renewing tomorrow — once per (sub, renewal date).
    if (on('subRenewal')) {
      const { data: subs } = await admin.from('subscriptions').select('id, name, renewal_date').eq('user_id', userId)
      for (const s of subs ?? []) {
        const rd = s.renewal_date as string | null
        if (!rd) continue
        const days = Math.round((Date.parse(`${rd}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
        const key = `sub:${s.id}:${rd}`
        if (days >= 0 && days <= 1 && sent[key] === undefined) {
          await sendPushToUser(admin, userId, { title: '4S', body: `${s.name} renews ${days === 0 ? 'today' : 'tomorrow'}.`, url: '/dashboard' })
          fresh[key] = today
          notified++
        }
      }
    }

    // 3. Sunday check-in nudge — if this week has no row for this user.
    if (isSunday && on('checkinNudge') && sent[`checkin:${monday}`] === undefined) {
      const { data: mine } = await admin.from('checkins').select('id').eq('user_id', userId).gte('week_of', monday).limit(1)
      if (!mine || mine.length === 0) {
        await sendPushToUser(admin, userId, { title: '4S', body: 'Time for your weekly check-in.', url: '/dashboard' })
        fresh[`checkin:${monday}`] = today
        notified++
      }
    }

    if (Object.keys(fresh).length > 0) {
      // Prune keys older than ~30 days so the map doesn't grow forever.
      const cutoff = new Date(now.getTime() - 30 * 86_400_000).toISOString().slice(0, 10)
      const merged: Record<string, string> = { ...fresh }
      for (const [k, v] of Object.entries(sent)) if (v >= cutoff) merged[k] = v
      await admin.from('push_notify_state').upsert({ user_id: userId, last_sent: merged })
    }
  }

  return NextResponse.json({ checked: userIds.length, notified })
}
