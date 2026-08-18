'use client'

import { useCallback, useEffect, useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

// How many of the last 7 days you stopped and wrote something down — a capture
// or a "what do you need right now" entry. This is what makes Rest Lake clear.
//
// It counts DISTINCT DAYS, not entries, on purpose: the lake is about how often
// you paused, not how much you produced. Ten thoughts in one evening is one day
// of pausing.
//
// Deliberately NOT built on useCaptures(): that hook filters `.is('domain', null)`
// so it can back the inbox, which means filing a capture into a Life domain
// would remove it from the count and the lake would drain retroactively for
// tidying up. Reflection is a thing that happened on a day; sorting it later
// doesn't un-happen it.
export function useReflectionDays(days = 7): number {
  const supabase = createClient()
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    const cutoff = subDays(new Date(), days).toISOString()
    const [captures, needs] = await Promise.all([
      supabase.from('captures').select('created_at').gte('created_at', cutoff),
      supabase.from('needs').select('created_at').gte('created_at', cutoff),
    ])
    const seen = new Set<string>()
    for (const row of [...(captures.data ?? []), ...(needs.data ?? [])]) {
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
    window.addEventListener('4s:captures-changed', onChanged)
    return () => window.removeEventListener('4s:captures-changed', onChanged)
  }, [load])

  return count
}
