'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { weekOfMonday } from '@/lib/utils/checkinQuestions'

export interface CheckinAnswer {
  questionKey: string
  questionText: string | null
  answer: string
}

export interface Checkin {
  id: string
  user_id: string
  space_id: string
  week_of: string
  answers: CheckinAnswer[]
  completed_at: string
}

// One row per (space, person, week). Answered natively in 4S now
// (components/checkin) — the companion bot still pushes rows too, and both
// paths land here. `checkins_write_own` RLS (for all on user_id = auth.uid())
// lets the browser upsert directly, so no admin route is needed.
//
// Pass `userId` to enable writing — it resolves the shared space the same
// way HouseholdHub does. Read-only callers (HouseholdHub's history view)
// pass nothing.
export function useCheckins(userId: string | null = null) {
  const supabase = createClient()
  const { spaces, members } = useSharedSpaces(userId ?? '')
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? spaces[0]?.id ?? null

  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('checkins')
      .select('*')
      .order('week_of', { ascending: false })
      .limit(40)
    setCheckins((data as Checkin[] | null) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    load()
    function onChanged() { load() }
    window.addEventListener('4s:checkins-changed', onChanged)
    return () => window.removeEventListener('4s:checkins-changed', onChanged)
  }, [load])

  const submitCheckin = useCallback(async (answers: CheckinAnswer[]): Promise<{ error: string | null }> => {
    if (!userId || !spaceId) return { error: 'No shared space yet' }
    const week = weekOfMonday()
    // One submission per week, no edits after (2026-09-03). Guard on what we
    // have loaded, and rely on the (space_id, user_id, week_of) unique
    // constraint as the real backstop — this is a plain insert, not an upsert.
    if (checkins.some(c => c.user_id === userId && c.week_of.slice(0, 10) >= week)) {
      return { error: 'You’ve already checked in this week.' }
    }
    const clean = answers
      .filter(a => typeof a.questionKey === 'string' && typeof a.answer === 'string' && a.answer.trim())
      .map(a => ({ questionKey: a.questionKey, questionText: a.questionText ?? null, answer: a.answer.slice(0, 2000) }))
    if (clean.length === 0) return { error: 'Nothing to save' }
    const { error } = await supabase.from('checkins').insert(
      { user_id: userId, space_id: spaceId, week_of: week, answers: clean, completed_at: new Date().toISOString() },
    )
    if (error) {
      return { error: error.code === '23505' ? 'You’ve already checked in this week.' : error.message }
    }
    window.dispatchEvent(new CustomEvent('4s:checkins-changed'))
    return { error: null }
  }, [supabase, userId, spaceId, checkins])

  /** This user's row for the current week, if it exists. */
  const thisWeek = checkins.find(c => c.user_id === userId && c.week_of.slice(0, 10) >= weekOfMonday())

  return { checkins, loading, submitCheckin, thisWeekMine: thisWeek ?? null }
}

export interface CheckinWeek {
  weekOf: string
  byUser: Record<string, Checkin>
}

/** Consecutive most-recent weeks this user has a check-in for. The current
 *  week is skipped if it isn't done yet, so a streak doesn't read as broken
 *  mid-week — it just doesn't tick up until you check in. */
export function checkinStreak(checkins: Checkin[], userId: string | null): number {
  if (!userId) return 0
  const weeks = groupCheckinsByWeek(checkins) // newest first
  const thisWeek = weekOfMonday()
  let streak = 0
  for (const w of weeks) {
    const mine = userId in w.byUser
    if (w.weekOf >= thisWeek && !mine) continue // current week, not yet done
    if (!mine) break
    streak++
  }
  return streak
}

/** Midnight-UTC epoch ms for a YYYY-MM-DD(...) date string. */
export function dayMs(dateStr: string): number {
  return Date.parse(`${dateStr.slice(0, 10)}T00:00:00Z`)
}
export const WEEK_WINDOW_MS = 6 * 24 * 60 * 60 * 1000

// Groups the flat row list into one entry per week, both partners' answers
// together. NOT a fixed Monday/Sunday bucket — the two partners often answer
// a couple of days apart, and the companion bot's own week boundary doesn't
// always match a calendar week, so a fixed anchor split the same week's two
// answers into two "one of you answered" entries (2026-09-01 report: 8/25
// and 8/17 showed one person when both had checked in). Instead: rows whose
// dates are within 6 days of any row already in a bucket join that bucket.
export function groupCheckinsByWeek(checkins: Checkin[]): CheckinWeek[] {
  // Rows are processed newest-first; a row joins a bucket only if it's within
  // 6 days of that bucket's NEWEST row (its anchor), never a chained middle
  // row — otherwise a long run of near-daily check-ins could collapse weeks
  // apart into one bucket.
  const buckets: (CheckinWeek & { _anchor: number })[] = []
  for (const c of [...checkins].sort((a, b) => b.week_of.localeCompare(a.week_of))) {
    const t = dayMs(c.week_of)
    let bucket = buckets.find(b => Math.abs(b._anchor - t) <= WEEK_WINDOW_MS)
    if (!bucket) { bucket = { weekOf: c.week_of.slice(0, 10), byUser: {}, _anchor: t }; buckets.push(bucket) }
    bucket.byUser[c.user_id] = c
  }
  return buckets
    .map((b): CheckinWeek => ({ weekOf: b.weekOf, byUser: b.byUser }))
    .sort((a, b) => b.weekOf.localeCompare(a.weekOf))
}
