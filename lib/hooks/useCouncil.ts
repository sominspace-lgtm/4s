'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek } from 'date-fns'

export type Verdict = 'fine' | 'watch' | 'quiet'

export interface DomainReflection {
  verdict: Verdict
  note: string
}

export interface CouncilEntry {
  id: string
  week_of: string
  verdicts: Record<string, DomainReflection>
  note: string | null
  created_at: string
}

export function useCouncil() {
  const [entries, setEntries] = useState<CouncilEntry[]>([])
  const supabase = createClient()

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('council_entries')
      .select('*')
      .order('week_of', { ascending: false })
      .limit(10)
    if (data) setEntries(data)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  async function save(verdicts: Record<string, DomainReflection>, note: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const week_of = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('council_entries')
      .upsert({ user_id: user.id, week_of, verdicts, note: note || null }, { onConflict: 'user_id,week_of' })
      .select().single()
    if (data) setEntries(prev => [data, ...prev.filter(e => e.week_of !== week_of)])
  }

  return { entries, save }
}
