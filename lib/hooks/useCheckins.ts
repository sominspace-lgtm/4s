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

// The Monday (ISO week start) of whatever date string a row carries, so two
// partners whose rows land a day or two apart (different week-start
// conventions on the bot side) still group into the SAME week instead of
// each showing up as "one of you answered" (2026-09-01).
function weekStartOf(dateStr: string): string {
  const d = new Date(`${dateStr.slice(0, 10)}T00:00:00Z`)
  if (isNaN(d.getTime())) return dateStr.slice(0, 10)
  const dow = d.getUTCDay() // 0 = Sun
  d.setUTCDate(d.getUTCDate() - ((dow + 6) % 7)) // back up to Monday
  return d.toISOString().slice(0, 10)
}

// Groups the flat row list into one entry per week, both partners' answers
// together — the shape the UI actually wants, kept out of the hook so the
// hook stays a plain reflection of the table.
export function groupCheckinsByWeek(checkins: Checkin[]): CheckinWeek[] {
  const byWeek = new Map<string, CheckinWeek>()
  for (const c of checkins) {
    const key = weekStartOf(c.week_of)
    let week = byWeek.get(key)
    if (!week) { week = { weekOf: key, byUser: {} }; byWeek.set(key, week) }
    week.byUser[c.user_id] = c
  }
  return [...byWeek.values()].sort((a, b) => b.weekOf.localeCompare(a.weekOf))
}
