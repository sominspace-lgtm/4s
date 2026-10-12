'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type WishStatus = 'wanted' | 'bought' | 'dropped'

export interface Wish {
  id: string
  user_id: string
  space_id: string | null
  name: string
  url: string | null
  image_url: string | null
  store: string | null
  price: number | null
  target_price: number | null
  list: string
  /** 1 = nice to have, 2 = want, 3 = really want */
  priority: 1 | 2 | 3
  for_who: string | null
  notes: string | null
  status: WishStatus
  bought_at: string | null
  bought_price: number | null
  reserved_by: string | null
  last_checked: string
  created_at: string
}

export type WishDraft = Partial<Pick<Wish,
  'name' | 'url' | 'image_url' | 'store' | 'price' | 'target_price' | 'list' | 'priority' | 'for_who' | 'notes' | 'space_id'
>>

export const WISH_LISTS = ['Someday', 'Soon', 'Home', 'Clothes', 'Tech', 'Gifts', 'Experiences']

/** Price is at or under the target the person set. */
export function atTarget(w: Wish): boolean {
  return w.status === 'wanted' && w.price != null && w.target_price != null && w.price <= w.target_price
}

// The wishlist (2026-10-12). Reads your own wishes plus anything a partner
// shared into the household (RLS decides what comes back). A partner can
// claim a shared wish through claim_wish() without being able to edit it.
export function useWishlist() {
  const supabase = createClient()
  const [wishes, setWishes] = useState<Wish[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: { user } }, { data, error: e }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('wish_items').select('*').order('created_at', { ascending: false }),
    ])
    setUserId(user?.id ?? null)
    if (e) setError('The wishlist is not set up on the server yet.')
    else { setError(null); setWishes((data as Wish[] | null) ?? []) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const on = () => load()
    window.addEventListener('4s:wish-changed', on)
    return () => window.removeEventListener('4s:wish-changed', on)
  }, [load])

  const notify = () => window.dispatchEvent(new CustomEvent('4s:wish-changed'))

  async function add(d: WishDraft): Promise<string | null> {
    const name = (d.name ?? '').trim()
    if (!name) return 'Give it a name.'
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { error: e } = await supabase.from('wish_items').insert({ ...d, name, user_id: user.id })
    if (e) return e.message
    await load(); notify()
    return null
  }

  async function update(id: string, patch: WishDraft & { status?: WishStatus; bought_at?: string | null; bought_price?: number | null; last_checked?: string }): Promise<string | null> {
    const { error: e } = await supabase.from('wish_items').update(patch).eq('id', id)
    if (e) return e.message
    await load(); notify()
    return null
  }

  async function remove(id: string): Promise<string | null> {
    const { error: e } = await supabase.from('wish_items').delete().eq('id', id)
    if (e) return e.message
    await load(); notify()
    return null
  }

  async function claim(id: string, on: boolean): Promise<string | null> {
    const { error: e } = await supabase.rpc('claim_wish', { wish_id: id, claim: on })
    if (e) return e.message
    await load(); notify()
    return null
  }

  return { wishes, loading, userId, error, add, update, remove, claim }
}
