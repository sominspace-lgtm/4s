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

// Every own-or-space table (household_lists, goals, itinerary_items via
// trips) needs the same "which spaces can this user see" resolution to
// query correctly from the admin client, which has no RLS to do it for free.
// Was inlined three times over; extracted once kind #4 was about to make it
// four.
async function resolveSpaceIds(admin: SupabaseClient, userId: string): Promise<string[]> {
  const [{ data: ownedSpaces }, { data: memberRows }] = await Promise.all([
    admin.from('shared_spaces').select('id').eq('owner_id', userId),
    admin.from('shared_space_members').select('space_id').eq('member_id', userId).eq('status', 'accepted'),
  ])
  return [...new Set([...(ownedSpaces ?? []).map(s => s.id as string), ...(memberRows ?? []).map(m => m.space_id as string)])]
}

/** Own-or-space filter for a `.or()` clause, given the ids from
 *  resolveSpaceIds — the same shape household_lists' query already built by
 *  hand, now shared so the two new kinds below don't retype it. */
function ownOrSpaceFilter(userId: string, spaceIds: string[]): string {
  return `user_id.eq.${userId}${spaceIds.length ? `,space_id.in.(${spaceIds.join(',')})` : ''}`
}

// A scheduled server nudge (Vercel Cron, daily at 04:00 UTC — see
// vercel.json). Overdue tasks and a subscription renewing tomorrow. The
// weekly check-in nudge lives in its own cron now (/api/cron/checkin).
// Was `waiting-notice`, overdue tasks only; now a couple of kinds, each
// gated by the user's own notifyPrefs (user_prefs.layout.notifyPrefs,
// missing = on) and deduped per-kind via push_notify_state.last_sent so a
// kind fires at most once per its own natural window.
//
// Still the product's promise: named, never counted; nothing alarmist;
// nothing that follows you around out of guilt.

type Kind = 'overdueTasks' | 'subRenewal' | 'listReminder' | 'goalStale' | 'tripItem'

// Must match STALE_AFTER_DAYS in lib/hooks/useGoals.ts — duplicated rather
// than imported because that file is 'use client' and this is a server
// route; if the in-app threshold for "gone quiet" ever changes, this needs
// the same edit.
const GOAL_STALE_AFTER_DAYS = 21

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  // Reckoned in the household's timezone (America/Los_Angeles), not UTC — so
  // "today" and "tomorrow" mean the same thing to the person reading the
  // push as they do here.
  const la = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const laPart = (t: Intl.DateTimeFormatPartTypes) => la.find(p => p.type === t)?.value ?? ''
  const today = `${laPart('year')}-${laPart('month')}-${laPart('day')}`

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

    // 3. List item reminders — any household_lists item with a remind_at
    // that's arrived (2026-09-22). Generalizes the same "due date" idea
    // Tasks/subscriptions already get, to the free-form Lists feature (the
    // point of the whole notify generalization this was added alongside —
    // see components/household/HouseholdCustomLists.tsx).
    // household_lists/goals/trips can all be personal (space_id null) or
    // shared; this cron runs on the admin client (no RLS), so space
    // membership is resolved by hand once and reused by kinds 3-5.
    const spaceIds = (on('listReminder') || on('goalStale') || on('tripItem'))
      ? await resolveSpaceIds(admin, userId)
      : []

    if (on('listReminder')) {
      const { data: lists } = await admin.from('household_lists').select('id, name, items')
        .or(ownOrSpaceFilter(userId, spaceIds))
      for (const list of lists ?? []) {
        const items = (list.items as { id: string; label: string; done?: boolean; remind_at?: string | null }[]) ?? []
        for (const item of items) {
          if (item.done || !item.remind_at) continue
          if (Date.parse(item.remind_at) > now.getTime()) continue // not due yet
          const key = `listitem:${item.id}`
          if (sent[key] !== undefined) continue
          await safePush(admin, userId, { title: list.name as string, body: item.label, url: '/dashboard' })
          fresh[key] = today
          notified++
        }
      }
    }

    // 4. A goal that's gone quiet — the same STALE_AFTER_DAYS threshold
    // GoalsSection.tsx's in-app banner uses, pushed instead of waiting for
    // someone to happen to open Goals (2026-09-24). Keyed on the goal's own
    // last_touched_at, same idiom as a subscription's renewal_date above:
    // touching the goal (in-app "still on it", or a new next_action) changes
    // that timestamp, which naturally opens up a fresh notification the next
    // time it goes quiet, rather than permanently silencing that one goal
    // after its first nudge.
    if (on('goalStale')) {
      const { data: activeGoals } = await admin.from('goals').select('id, title, last_touched_at')
        .eq('status', 'active').or(ownOrSpaceFilter(userId, spaceIds))
      const staleCutoffMs = GOAL_STALE_AFTER_DAYS * 86_400_000
      for (const g of activeGoals ?? []) {
        const touchedAt = g.last_touched_at as string
        if (now.getTime() - Date.parse(touchedAt) < staleCutoffMs) continue
        const key = `goal:${g.id}:${touchedAt}`
        if (sent[key] !== undefined) continue
        await safePush(admin, userId, { title: '4S', body: `Still choosing "${g.title}"? It's been quiet a while.`, url: '/dashboard' })
        fresh[key] = today
        notified++
      }
    }

    // 5. Itinerary items happening today — "flight today", "dinner
    // reservation today" (2026-09-24). One push per trip, not per item, same
    // batching as overdue tasks above; keyed on the item's own item_date so
    // rescheduling it naturally opens a fresh notification for the new date.
    if (on('tripItem')) {
      const { data: items } = await admin.from('itinerary_items').select('id, trip_id, title, item_date, done')
        .eq('item_date', today).eq('done', false).or(ownOrSpaceFilter(userId, spaceIds))
      const due = (items ?? []).filter(i => sent[`tripitem:${i.id}:${i.item_date}`] === undefined)
      if (due.length > 0) {
        const tripIds = [...new Set(due.map(i => i.trip_id as string))]
        const { data: trips } = await admin.from('trips').select('id, title').in('id', tripIds)
        const tripTitle = new Map((trips ?? []).map(t => [t.id as string, t.title as string]))
        const byTrip = new Map<string, typeof due>()
        for (const item of due) {
          const list = byTrip.get(item.trip_id as string) ?? []
          list.push(item)
          byTrip.set(item.trip_id as string, list)
        }
        for (const [tripId, tripItems] of byTrip) {
          const first = tripItems[0]
          await safePush(admin, userId, {
            title: tripTitle.get(tripId) ?? 'Trip',
            body: tripItems.length === 1 ? `Today: ${first.title}` : `Today: ${first.title} and ${tripItems.length - 1} more`,
            url: '/dashboard',
          })
          for (const item of tripItems) fresh[`tripitem:${item.id}:${item.item_date}`] = today
          notified++
        }
      }
    }

    // The Sunday-evening check-in nudge moved to its own cron
    // (/api/cron/checkin) so it lands at a predictable 10pm LA and repeats
    // Monday/Tuesday for anyone who hasn't checked in yet.

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
