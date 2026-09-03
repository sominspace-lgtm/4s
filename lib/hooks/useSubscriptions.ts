'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addMonths, addYears, differenceInDays, formatISO, parseISO, startOfToday } from 'date-fns'

export type Cadence = 'monthly' | 'yearly'
export type DueKind = 'by' | 'on'

export interface Subscription {
  id: string
  name: string
  /** Always the monthly-equivalent, so the running total stays honest — a
   *  yearly subscription stores charge/12 and displays it back ×12. */
  cost_monthly: number
  renewal_date: string | null
  cadence: Cadence
  due_kind: DueKind
  /** The cycle date this was last marked paid through. */
  paid_until: string | null
}

export type Urgency = 'paid' | 'soon' | 'near' | 'fine'

export function urgency(sub: Pick<Subscription, 'renewal_date' | 'paid_until'>): Urgency {
  if (sub.paid_until && parseISO(sub.paid_until) >= startOfToday()) return 'paid'
  if (!sub.renewal_date) return 'fine'
  const days = differenceInDays(parseISO(sub.renewal_date), new Date())
  if (days <= 7) return 'soon'
  if (days <= 30) return 'near'
  return 'fine'
}

export function useSubscriptions() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const supabase = createClient()

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('subscriptions').select('*').order('renewal_date', { ascending: true })
    if (data) setSubs(data as Subscription[])
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

  function notify() { window.dispatchEvent(new CustomEvent('4s:subscriptions-changed')) }

  async function add(name: string, costMonthly: number, renewal_date: string, cadence: Cadence = 'monthly', due_kind: DueKind = 'on') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in') }
    const { data, error } = await supabase.from('subscriptions')
      .insert({ name, cost_monthly: costMonthly, renewal_date: renewal_date || null, cadence, due_kind, user_id: user.id })
      .select().single()
    if (error) return { error }
    setSubs(prev => [...prev, data as Subscription].sort((a, b) => (a.renewal_date ?? '').localeCompare(b.renewal_date ?? '')))
    notify()
    return { error: null }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('subscriptions').delete().eq('id', id)
    if (error) return { error }
    setSubs(prev => prev.filter(s => s.id !== id))
    notify()
    return { error: null }
  }

  /** Mark the current cycle paid: record it and roll the renewal date
   *  forward by one cadence period. */
  async function markPaid(id: string) {
    const s = subs.find(x => x.id === id)
    if (!s || !s.renewal_date) return { error: new Error('No renewal date') }
    const d = parseISO(s.renewal_date)
    const next = s.cadence === 'yearly' ? addYears(d, 1) : addMonths(d, 1)
    const nextStr = formatISO(next, { representation: 'date' })
    const { error } = await supabase.from('subscriptions')
      .update({ paid_until: s.renewal_date, renewal_date: nextStr }).eq('id', id)
    if (error) return { error }
    setSubs(prev => prev.map(x => x.id === id ? { ...x, paid_until: s.renewal_date, renewal_date: nextStr } : x))
    notify()
    return { error: null }
  }

  const total = subs.reduce((sum, s) => sum + Number(s.cost_monthly), 0)

  return { subs, add, remove, markPaid, total }
}
