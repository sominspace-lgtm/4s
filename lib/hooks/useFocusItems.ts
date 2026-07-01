'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addDays, formatISO } from 'date-fns'

export interface FocusItem {
  id: string
  text: string
  type: 'focus' | 'problem'
  energy: 'low' | 'medium' | 'high'
  source: string
  first_seen: string
  snoozed_until: string | null
}

export function useFocusItems() {
  const [items, setItems] = useState<FocusItem[]>([])
  const supabase = createClient()

  const fetch = useCallback(async () => {
    const now = new Date().toISOString()
    const { data } = await supabase
      .from('focus_items')
      .select('*')
      .or(`snoozed_until.is.null,snoozed_until.lt.${now}`)
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  async function snooze(id: string, days: number) {
    const snoozed_until = formatISO(addDays(new Date(), days))
    await supabase.from('focus_items').update({ snoozed_until }).eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, snooze }
}
