'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'

export interface Chore {
  id: string
  space_id: string | null
  name: string
  cadence_days: number
  last_done_at: string | null
  last_done_by: string | null
}

export interface Meal {
  id: string
  space_id: string | null
  meal_date: string
  slot: 'breakfast' | 'lunch' | 'dinner'
  title: string
  cook: string | null
}

export interface ShoppingItem {
  id: string
  space_id: string | null
  name: string
  qty: string | null
  category: string | null
  got: boolean
}

export interface HouseNote {
  id: string
  space_id: string | null
  body: string
  pinned: boolean
  created_at: string
}

export interface HouseRule {
  id: string
  space_id: string | null
  text: string
  category: string | null
  note: string | null
  active: boolean
  created_at: string
}

export interface InventoryItem {
  id: string
  space_id: string | null
  name: string
  room: string | null
  note: string | null
  created_at: string
}

/** Days until due. Negative = overdue. Never done = due now, not "overdue". */
export function choreDue(c: Chore): number {
  if (!c.last_done_at) return 0
  return c.cadence_days - differenceInCalendarDays(new Date(), parseISO(c.last_done_at))
}

export function useHousehold(spaceId: string | null) {
  const supabase = createClient()
  const [chores, setChores] = useState<Chore[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [shopping, setShopping] = useState<ShoppingItem[]>([])
  const [notes, setNotes] = useState<HouseNote[]>([])
  const [rules, setRules] = useState<HouseRule[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    // RLS already scopes rows to "mine or my spaces"; the filter here is just
    // about which view you're looking at (a specific household vs personal).
    const scope = <T extends { eq: (c: string, v: string) => T; is: (c: string, v: null) => T }>(q: T) =>
      spaceId ? q.eq('space_id', spaceId) : q.is('space_id', null)

    const [
      { data: c, error: ce }, { data: m, error: me }, { data: s, error: se }, { data: n, error: ne },
      { data: r, error: re }, { data: inv, error: ie },
    ] = await Promise.all([
      scope(supabase.from('household_chores').select('*').order('created_at')),
      scope(supabase.from('household_meals').select('*').order('meal_date')),
      scope(supabase.from('household_shopping').select('*').order('created_at')),
      // Pinned first, then newest — a fridge door reads top-down by urgency.
      scope(supabase.from('household_notes').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false })),
      scope(supabase.from('household_rules').select('*').order('created_at', { ascending: false })),
      scope(supabase.from('household_inventory').select('*').order('room').order('name')),
    ])
    const firstError = ce ?? me ?? se ?? ne ?? re ?? ie
    setError(firstError ? firstError.message : null)
    setChores((c as Chore[] | null) ?? [])
    setMeals((m as Meal[] | null) ?? [])
    setShopping((s as ShoppingItem[] | null) ?? [])
    setNotes((n as HouseNote[] | null) ?? [])
    setRules((r as HouseRule[] | null) ?? [])
    setInventory((inv as InventoryItem[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:household-changed', onChanged)
    return () => window.removeEventListener('4s:household-changed', onChanged)
  }, [load])

  function notify() { window.dispatchEvent(new CustomEvent('4s:household-changed')) }

  async function addChore(name: string, cadence_days: number) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_chores')
      .insert({ user_id: user.id, space_id: spaceId, name, cadence_days })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  // Marking done is the whole loop: it resets the clock and records WHO, so
  // "who actually does this" stops being an argument and becomes a fact
  // neither person has to remember.
  async function markChoreDone(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_chores')
      .update({ last_done_at: format(new Date(), 'yyyy-MM-dd'), last_done_by: user.id })
      .eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function removeChore(id: string) {
    const { error } = await supabase.from('household_chores').delete().eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function addMeal(meal_date: string, slot: Meal['slot'], title: string, cook: string | null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_meals')
      .insert({ user_id: user.id, space_id: spaceId, meal_date, slot, title, cook })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function removeMeal(id: string) {
    const { error } = await supabase.from('household_meals').delete().eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function addShopping(name: string, qty: string | null, category: string | null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_shopping')
      .insert({ user_id: user.id, space_id: spaceId, name, qty, category })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  // Ticking something off records who got it, same as chores — so the person
  // who did the shop doesn't have to announce it.
  async function toggleGot(id: string, got: boolean) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('household_shopping')
      .update({ got, got_at: got ? new Date().toISOString() : null, got_by: got ? user?.id ?? null : null })
      .eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  // Clearing the got items is one action, not N deletes — after a shop the
  // list is mostly ticked and nobody wants to tap twelve bins.
  async function clearGot() {
    const q = supabase.from('household_shopping').delete().eq('got', true)
    const { error } = await (spaceId ? q.eq('space_id', spaceId) : q.is('space_id', null))
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function removeShopping(id: string) {
    const { error } = await supabase.from('household_shopping').delete().eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function addNote(body: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_notes')
      .insert({ user_id: user.id, space_id: spaceId, body })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function toggleNotePin(id: string, pinned: boolean) {
    const { error } = await supabase.from('household_notes').update({ pinned }).eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function removeNote(id: string) {
    const { error } = await supabase.from('household_notes').delete().eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  // Rules and inventory are the two resources Discord already writes to
  // (`/rule`, `/save`, `/task`... land here too, but into chores) that had no
  // UI at all until now — same shape as everything above, just newer.
  async function addRule(text: string, category: string | null, note: string | null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_rules')
      .insert({ user_id: user.id, space_id: spaceId, text, category, note })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function toggleRuleActive(id: string, active: boolean) {
    const { error } = await supabase.from('household_rules').update({ active, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function removeRule(id: string) {
    const { error } = await supabase.from('household_rules').delete().eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function addInventoryItem(name: string, room: string | null, note: string | null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_inventory')
      .insert({ user_id: user.id, space_id: spaceId, name, room, note })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function removeInventoryItem(id: string) {
    const { error } = await supabase.from('household_inventory').delete().eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  return {
    chores, meals, shopping, notes, rules, inventory, loading, error,
    addChore, markChoreDone, removeChore,
    addMeal, removeMeal,
    addShopping, toggleGot, clearGot, removeShopping,
    addNote, toggleNotePin, removeNote,
    addRule, toggleRuleActive, removeRule,
    addInventoryItem, removeInventoryItem,
  }
}
