'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

export function useDomainTouched() {
  const [touched, setTouched] = useState<Record<string, string>>({})
  const supabase = createClient()

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('domain_touched').select('domain_id, last_touched')
    if (data) {
      const map: Record<string, string> = {}
      data.forEach(r => { map[r.domain_id] = r.last_touched })
      setTouched(map)
    }
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  async function touch(domainId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in') }
    const today = format(new Date(), 'yyyy-MM-dd')
    // Explicit onConflict: without it, supabase-js can only infer a conflict
    // target from a single-column primary key. domain_touched's real key is
    // the (user_id, domain_id) pair, so an inferred upsert either silently
    // inserts a duplicate row per touch or errors — neither is what "mark
    // this domain reviewed today" should do. Requires the unique constraint
    // in supabase/migrations/domain_touched.sql.
    const { error } = await supabase.from('domain_touched')
      .upsert({ user_id: user.id, domain_id: domainId, last_touched: today }, { onConflict: 'user_id,domain_id' })
    if (error) {
      console.error('Failed to record domain touch:', error.message)
      return { error }
    }
    setTouched(prev => ({ ...prev, [domainId]: today }))
    return { error: null }
  }

  return { touched, touch }
}
