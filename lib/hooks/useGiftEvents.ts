'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { differenceInDays, parseISO } from 'date-fns'

export interface GiftEvent {
  id: string
  name: string
  date: string        // YYYY-MM-DD — month/day used when recurring
  recurring: boolean
  relation: string | null
  budget: number | null
  giftIdea: string | null
}

export function nextOccurrence(item: GiftEvent): Date {
  const d = parseISO(item.date)
  if (!item.recurring) { d.setHours(0, 0, 0, 0); return d }
  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let next = new Date(today.getFullYear(), d.getMonth(), d.getDate())
  if (next < todayMidnight) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate())
  return next
}

export function daysUntil(item: GiftEvent): number {
  return differenceInDays(nextOccurrence(item), new Date())
}

function makeId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `ge_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

// Stored inside the same user_prefs.layout JSON column used for section
// order/visibility and Focus View config — read-merge-write on every save
// so this hook never clobbers those sibling keys, and no schema migration
// is needed for a new table.
export function useGiftEvents() {
  const [items, setItems] = useState<GiftEvent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase.from('user_prefs').select('layout').eq('user_id', user.id).single()
    const stored = (data?.layout?.giftEvents as GiftEvent[] | undefined) ?? []
    setItems(stored)
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // See useWorkItems.ts for why this exists — this hook is called
  // independently in several places (Gifts card, Brief summary card),
  // so a mutation in one instance needs to tell the others to reload.
  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:gift-events-changed', onChanged)
    return () => window.removeEventListener('4s:gift-events-changed', onChanged)
  }, [load])

  async function save(next: GiftEvent[]) {
    setItems(next)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: row } = await supabase.from('user_prefs').select('layout').eq('user_id', user.id).single()
    const nextLayout = { ...(row?.layout ?? {}), giftEvents: next }
    await supabase.from('user_prefs').upsert({ user_id: user.id, layout: nextLayout })
    window.dispatchEvent(new CustomEvent('4s:gift-events-changed'))
  }

  function add(event: Omit<GiftEvent, 'id'>) {
    save([...items, { ...event, id: makeId() }])
  }

  function update(id: string, patch: Partial<GiftEvent>) {
    save(items.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  function remove(id: string) {
    save(items.filter(i => i.id !== id))
  }

  const sorted = [...items].sort((a, b) => daysUntil(a) - daysUntil(b))

  return { items: sorted, loading, add, update, remove }
}
