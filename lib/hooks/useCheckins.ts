'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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

// Written by the companion bot's DM-based weekly check-in flow, one row per
// (space, person, week). Read-only here — see checkins.sql: only the
// answering partner can write their own row, so there is no addCheckin/edit
// in this hook on purpose. Own-or-space RLS means both partners' rows for the
// same week both come back in one query; the component groups them.
export function useCheckins() {
  const supabase = createClient()
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

  useEffect(() => { load() }, [load])

  return { checkins, loading }
}

export interface CheckinWeek {
  weekOf: string
  byUser: Record<string, Checkin>
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
