'use client'

import { useCallback, useEffect, useState } from 'react'
import { subDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { WorkItem } from '@/lib/hooks/useWorkItems'

/**
 * The finished work the Village needs, which useWorkItems() cannot give it.
 *
 * useWorkItems filters `.neq('status', 'done')`, and taskStage() only ever
 * returns 'completed' or 'landmark' from inside its `status === 'done'` branch.
 * The two together meant phaseFor() could never produce those phases, so the
 * roofs, lit windows and gold ◆ in the Project District were unreachable code
 * and nothing you finished ever became a building. The skyline could only show
 * scaffolding.
 *
 * What gets DRAWN from this is only landmarks, and that restraint is the point:
 * ordinary completions are fetched too, but purely so the arrival line can say
 * "and a couple of things got finished". If every finished errand became a
 * building it would have to disappear once it aged past the cutoff, and a
 * skyline that shrinks is the same broken promise as a plant that shrinks.
 */
const RECENT_DAYS = 30

export function useVillageWork(): { done: WorkItem[]; loading: boolean } {
  const supabase = createClient()
  const [done, setDone] = useState<WorkItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const cutoff = subDays(new Date(), RECENT_DAYS).toISOString()
    const { data } = await supabase
      .from('work_items')
      .select('*')
      .eq('status', 'done')
      .or(`landmark.eq.true,completed_at.gte.${cutoff}`)
      .order('completed_at', { ascending: false })
      .limit(200)
    setDone((data as WorkItem[] | null) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const onChanged = () => { load() }
    window.addEventListener('4s:work-items-changed', onChanged)
    return () => window.removeEventListener('4s:work-items-changed', onChanged)
  }, [load])

  return { done, loading }
}
