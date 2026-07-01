'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

export interface WatchItem {
  id: string
  type: 'price' | 'restock' | 'appointment' | 'supplement'
  name: string
  note: string | null
  last_checked: string
  status: string
}

export function useWatchItems() {
  const [items, setItems] = useState<WatchItem[]>([])
  const supabase = createClient()

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('watch_items').select('*').order('created_at')
    if (data) setItems(data)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  async function add(type: WatchItem['type'], name: string, note: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('watch_items').insert({ type, name, note: note || null, user_id: user.id }).select().single()
    if (data) setItems(prev => [...prev, data])
  }

  async function remove(id: string) {
    await supabase.from('watch_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function markChecked(id: string) {
    const today = format(new Date(), 'yyyy-MM-dd')
    await supabase.from('watch_items').update({ last_checked: today }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, last_checked: today } : i))
  }

  return { items, add, remove, markChecked }
}
