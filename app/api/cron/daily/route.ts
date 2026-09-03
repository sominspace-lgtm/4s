import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { dueUrgency } from '@/lib/hooks/useWorkItems'
import { sendPushToUser, type PushPayload } from '@/lib/push/send'
import type { SupabaseClient } from '@supabase/supabase-js'

// One bad subscription or a missing VAPID key shouldn't 500 the whole run
// and skip everyone after it — log and move on.
async function safePush(admin: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
  try { return await sendPushToUser(admin, userId, payload) }
  catch (e) { console.error('[cron/daily] push failed', { userId, err: e instanceof Error ? e.message : e }); return 0 }
}

// The one scheduled server nudge (Vercel Cron, daily at 04:00 UTC — which is
// ~8-9pm the evening before in America/Los_Angeles, so the weekly check-in
// nudge lands Sunday evening. See vercel.json).
// Was `waiting-notice`, overdue tasks only; now a few kinds, each gated by
// the user's own notifyPrefs (user_prefs.layout.notifyPrefs, missing = on)
// and deduped per-kind via push_notify_state.last_sent so a kind fires at
// most once per its own natural window.
//
// Still the product's promise: named, never counted; nothing alarmist;
// nothing that follows you around out of guilt.

type Kind = 'overdueTasks' | 'subRenewal' | 'checkinNudge'

/** The Sunday that starts this check-in week, as YYYY-MM-DD — matches
 *  weekOfSunday() in lib/utils/checkinQuestions.ts (Sunday-anchored 2026-09-03). */
function weekSunday(d: Date): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  x.setUTCDate(x.getUTCDate() - x.getUTCDay())
  return x.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  // Reckoned in the household's timezone (America/Los_Angeles, matching the old
  // Discord check-in bot), not UTC — so "Sunday" and "this week" mean the same
  // thing to the person reading the push as they do here. The cron runs daily
  // at 04:00 UTC (see vercel.json), which is ~8-9pm the previous day in LA, so
  // the check-in nudge lands Sunday evening.
  const la = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const laPart = (t: Intl.DateTimeFormatPartTypes) => la.find(p => p.type === t)?.value ?? ''
  const today = `${laPart('year')}-${laPart('month')}-${laPart('day')}`
  const isSunday = laPart('weekday') === 'Sun'
  const weekStart = weekSunday(new Date(`${today}T12:00:00Z`))

  const { data: subscribed } = await admin.from('push_subscriptions').select('user_id')
  const userIds = [...new Set((subscribed ?? []).map(r => r.user_id as string))]

  // For the check-in nudge: who's checked in this week, and who shares a
  // space with whom — so the reminder can say "your partner checked in,
  // your turn" instead of the generic line.
  const [{ data: weekRows }, { data: allSpaces }, { data: allMembers }] = await Promise.all([
    admin.from('checkins').select('user_id').gte('week_of', weekStart),
    admin.from('shared_spaces').select('id, owner_id'),
    admin.from('shared_space_members').select('space_id, member_id, status'),
  ])
  const doneThisWeek = new Set((weekRows ?? []).map(r => r.user_id as string))
  const spacePeople: Set<string>[] = (allSpaces ?? []).map(s => {
    const people = new Set<string>([s.owner_id as string])
    for (const m of allMembers ?? []) {
      if (m.space_id === s.id && m.status === 'accepted' && m.member_id) people.add(m.member_id as string)
    }
    return people
  })

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
        await safePush(admin, userId, {
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
          await safePush(admin, userId, { title: '4S', body: `${s.name} renews ${days === 0 ? 'today' : 'tomorrow'}.`, url: '/dashboard' })
          fresh[key] = today
          notified++
        }
      }
    }

    // 3. Sunday-evening check-in nudge — if this week (LA-local) has no row for
    //    this user yet. `isSunday` and `weekStart` are both reckoned in
    //    America/Los_Angeles above, so this fires on the 04:00-UTC run whose
    //    LA-local time is Sunday ~9pm.
    if (isSunday && on('checkinNudge') && sent[`checkin:${weekStart}`] === undefined && !doneThisWeek.has(userId)) {
      const partnerDone = spacePeople.some(people =>
        people.has(userId) && [...people].some(p => p !== userId && doneThisWeek.has(p)))
      const n = await safePush(admin, userId, {
        title: '4S',
        body: partnerDone ? 'Your partner checked in — your turn.' : 'Time for your weekly check-in.',
        url: '/dashboard',
      })
      fresh[`checkin:${weekStart}`] = today
      if (n > 0) notified++
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
