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
    if (!user) return
    const today = format(new Date(), 'yyyy-MM-dd')
    await supabase.from('domain_touched').upsert({ user_id: user.id, domain_id: domainId, last_touched: today })
    setTouched(prev => ({ ...prev, [domainId]: today }))
  }

  return { touched, touch }
}
