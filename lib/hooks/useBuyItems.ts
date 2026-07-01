'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, differenceInDays, parseISO, addDays } from 'date-fns'

export interface BuyItem {
  id: string
  name: string
  cadence_days: number
  last_bought: string
  buy_url: string | null
}

export function daysUntilDue(item: BuyItem): number {
  const due = addDays(parseISO(item.last_bought), item.cadence_days)
  return differenceInDays(due, new Date())
}

export function useBuyItems() {
  const [items, setItems] = useState<BuyItem[]>([])
  const supabase = createClient()

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('buy_items').select('*').order('created_at')
    if (data) setItems(data)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  async function add(name: string, cadence_days: number, buy_url: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('buy_items')
      .insert({ name, cadence_days, buy_url: buy_url || null, user_id: user.id })
      .select().single()
    if (data) setItems(prev => [...prev, data])
  }

  async function markBought(id: string) {
    const today = format(new Date(), 'yyyy-MM-dd')
    await supabase.from('buy_items').update({ last_bought: today }).eq('id', id)
    setItems(prev => prev.map(i => i.id === id ? { ...i, last_bought: today } : i))
  }

  async function remove(id: string) {
    await supabase.from('buy_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, add, markBought, remove }
}
