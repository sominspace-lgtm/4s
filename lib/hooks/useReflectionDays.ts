'use client'

import { useCallback, useEffect, useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

// How many of the last 7 days you stopped and wrote something down — a note
// or a "what do you need right now" entry. This is what makes Rest Lake clear.
//
// It counts DISTINCT DAYS, not entries, on purpose: the lake is about how often
// you paused, not how much you produced. Ten thoughts in one evening is one day
// of pausing. (Read straight off `notes.created_at` since 2026-09-04 — Quick
// Capture and its `captures` table are gone.)
export function useReflectionDays(days = 7): number {
  const supabase = createClient()
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    const cutoff = subDays(new Date(), days).toISOString()
    const [notes, needs] = await Promise.all([
      supabase.from('notes').select('created_at').gte('created_at', cutoff),
      supabase.from('needs').select('created_at').gte('created_at', cutoff),
    ])
    const seen = new Set<string>()
    for (const row of [...(notes.data ?? []), ...(needs.data ?? [])]) {
      // parseISO + format, never .slice(0, 10) — created_at is a timestamptz,
      // so slicing gives the UTC day and would file a 9pm entry under tomorrow
      // for anyone east of UTC.
      seen.add(format(parseISO(row.created_at as string), 'yyyy-MM-dd'))
    }
    setCount(Math.min(days, seen.size))
  }, [supabase, days])

  useEffect(() => { load() }, [load])

  // Same cross-instance sync idiom as the other hooks, so the lake responds
  // within a session rather than only on remount.
  useEffect(() => {
    const onChanged = () => { load() }
    window.addEventListener('4s:notes-changed', onChanged)
    return () => window.removeEventListener('4s:notes-changed', onChanged)
  }, [load])

  return count
}
