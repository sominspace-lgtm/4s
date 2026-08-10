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
// DEAD as of 2026-08-07 — nothing in the app calls this any more.
//
// Gift occasions moved into the `people` table so a person is written down
// once instead of once here and once there; see useGiftOccasions() in
// usePeople.ts and supabase/migrations/contacts_unify_gifts.sql. Kept only
// so the shape of the old JSON is documented next to the migration that
// reads it — delete once you've confirmed the backfill landed.
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
    const prev = items
    setItems(next)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setItems(prev); return { error: new Error('Not signed in') } }
    const { data: row } = await supabase.from('user_prefs').select('layout').eq('user_id', user.id).single()
    const nextLayout = { ...(row?.layout ?? {}), giftEvents: next }
    const { error } = await supabase.from('user_prefs').upsert({ user_id: user.id, layout: nextLayout })
    if (error) {
      setItems(prev)
      console.error('Failed to save gift events:', error.message)
      return { error }
    }
    window.dispatchEvent(new CustomEvent('4s:gift-events-changed'))
    return { error: null }
  }

  function add(event: Omit<GiftEvent, 'id'>) {
    return save([...items, { ...event, id: makeId() }])
  }

  function update(id: string, patch: Partial<GiftEvent>) {
    return save(items.map(i => i.id === id ? { ...i, ...patch } : i))
  }

  function remove(id: string) {
    return save(items.filter(i => i.id !== id))
  }

  const sorted = [...items].sort((a, b) => daysUntil(a) - daysUntil(b))

  return { items: sorted, loading, add, update, remove }
}
