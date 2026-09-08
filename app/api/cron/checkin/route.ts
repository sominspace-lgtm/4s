import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser, type PushPayload } from '@/lib/push/send'
import type { SupabaseClient } from '@supabase/supabase-js'

// The weekly check-in nudge (Vercel Cron — see vercel.json). Runs once a
// day at 06:00 UTC, which is 10pm (PST) or 11pm (PDT) in
// America/Los_Angeles; the body no-ops unless it is currently the 10-11pm
// LA hour, so it stays a late-evening reminder year-round. It fires on
// Sunday night — the start of a new check-in week — and again Monday and
// Tuesday night for anyone who still hasn't checked in, then stops.
// Deduped per (week, day) so a given night sends at most one reminder.
//
// This used to live inside /api/cron/daily (once per week, ~9pm Sunday).
// Pulled out here so it lands late evening and can repeat.

async function safePush(admin: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
  try { return await sendPushToUser(admin, userId, payload) }
  catch (e) { console.error('[cron/checkin] push failed', { userId, err: e instanceof Error ? e.message : e }); return 0 }
}

function laParts(now: Date) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', weekday: 'short', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
  }).formatToParts(now)
  const get = (t: Intl.DateTimeFormatPartTypes) => p.find(x => x.type === t)?.value ?? ''
  return {
    weekday: get('weekday'),
    hour: parseInt(get('hour'), 10),
    date: `${get('year')}-${get('month')}-${get('day')}`,
  }
}

/** The Sunday that starts this check-in week, as YYYY-MM-DD — matches
 *  weekOfSunday() in lib/utils/checkinQuestions.ts. `date` is an LA-local
 *  YYYY-MM-DD. */
function weekSunday(date: string): string {
  const x = new Date(`${date}T12:00:00Z`)
  x.setUTCDate(x.getUTCDate() - x.getUTCDay())
  return x.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { weekday, hour, date } = laParts(new Date())
  // Only act in the 10-11pm LA hour (the 06:00-UTC run lands there year-
  // round, 10pm in winter / 11pm in summer), and only Sunday (first nudge)
  // through Tuesday (re-reminders). Every other invocation is a no-op.
  const nudgeDays = ['Sun', 'Mon', 'Tue']
  if ((hour !== 22 && hour !== 23) || !nudgeDays.includes(weekday)) {
    return NextResponse.json({ skipped: true, weekday, hour })
  }

  const admin = createAdminClient()
  const weekStart = weekSunday(date)

  const { data: subscribed } = await admin.from('push_subscriptions').select('user_id')
  const userIds = [...new Set((subscribed ?? []).map(r => r.user_id as string))]

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
    if (doneThisWeek.has(userId)) continue

    const [{ data: prefsRow }, { data: stateRow }] = await Promise.all([
      admin.from('user_prefs').select('layout').eq('user_id', userId).maybeSingle(),
      admin.from('push_notify_state').select('last_sent').eq('user_id', userId).maybeSingle(),
    ])
    const prefs = ((prefsRow?.layout as { notifyPrefs?: Record<string, boolean> } | null)?.notifyPrefs) ?? {}
    if (prefs['checkinNudge'] === false) continue

    const sent: Record<string, string> = (stateRow?.last_sent as Record<string, string> | null) ?? {}
    const key = `checkin:${weekStart}:${date}`
    if (sent[key] !== undefined) continue

    const partnerDone = spacePeople.some(people =>
      people.has(userId) && [...people].some(p => p !== userId && doneThisWeek.has(p)))
    const body = partnerDone
      ? 'Your partner checked in — your turn.'
      : weekday === 'Sun'
        ? 'Time for your weekly check-in.'
        : 'Still time for your weekly check-in.'

    const n = await safePush(admin, userId, { title: '4S', body, url: '/dashboard' })
    if (n > 0) notified++

    // Merge + prune keys older than ~30 days.
    const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)
    const merged: Record<string, string> = { [key]: date }
    for (const [k, v] of Object.entries(sent)) if (v >= cutoff) merged[k] = v
    await admin.from('push_notify_state').upsert({ user_id: userId, last_sent: merged })
  }

  return NextResponse.json({ ran: true, weekday, checked: userIds.length, notified })
}
