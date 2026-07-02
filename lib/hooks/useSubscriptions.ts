'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { differenceInDays, parseISO } from 'date-fns'

export interface Subscription {
  id: string
  name: string
  cost_monthly: number
  renewal_date: string | null
}

export type Urgency = 'soon' | 'near' | 'fine'

export function urgency(renewal: string | null): Urgency {
  if (!renewal) return 'fine'
  const days = differenceInDays(parseISO(renewal), new Date())
  if (days <= 7) return 'soon'
  if (days <= 30) return 'near'
  return 'fine'
}

export function useSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const supabase = createClient()

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('subscriptions').select('*').order('renewal_date', { ascending: true })
    if (data) setSubs(data)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  // See useWorkItems.ts / useBuyItems.ts for why this exists — this hook is
  // called independently in several places (Money hub, Brief summary card),
  // so a mutation in one instance needs to tell the others to reload.
  useEffect(() => {
    function onChanged() { fetch() }
    window.addEventListener('4s:subscriptions-changed', onChanged)
    return () => window.removeEventListener('4s:subscriptions-changed', onChanged)
  }, [fetch])

  async function add(name: string, cost: number, renewal_date: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('subscriptions').insert({ name, cost_monthly: cost, renewal_date, user_id: user.id }).select().single()
    if (data) setSubs(prev => [...prev, data].sort((a, b) => (a.renewal_date ?? '').localeCompare(b.renewal_date ?? '')))
    window.dispatchEvent(new CustomEvent('4s:subscriptions-changed'))
  }

  async function remove(id: string) {
    await supabase.from('subscriptions').delete().eq('id', id)
    setSubs(prev => prev.filter(s => s.id !== id))
    window.dispatchEvent(new CustomEvent('4s:subscriptions-changed'))
  }

  const total = subs.reduce((sum, s) => sum + Number(s.cost_monthly), 0)

  return { subs, add, remove, total }
}
