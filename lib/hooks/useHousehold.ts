'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

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
  // Added 2026-08-21 — see supabase/migrations/household_meals_notes_recipe.sql.
  // Both optional: a meal can stay just a title, same as before this existed.
  notes: string | null
  recipe_url: string | null
  // "Eating out" as a real option rather than a fake recipe title
  // (2026-08-24). Defaults to 'cooking' in the DB, so every row that existed
  // before this keeps its exact previous meaning. place_id optionally points
  // at the restaurant's real pin instead of storing its name a second time.
  kind: 'cooking' | 'eating_out'
  place_id: string | null
}

export interface ShoppingItem {
  id: string
  space_id: string | null
  name: string
  qty: string | null
  category: string | null
  got: boolean
  // Written on every add/toggle (see addShopping/toggleGot below) but never
  // surfaced in the UI until now — who added it, and who actually bought it.
  user_id: string
  got_by: string | null
  got_at: string | null
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

export interface MoveinItem {
  id: string
  space_id: string | null
  name: string
  category: string | null
  got: boolean
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
  const [moveinItems, setMoveinItems] = useState<MoveinItem[]>([])
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
      { data: r, error: re }, { data: mv, error: mve },
    ] = await Promise.all([
      scope(supabase.from('household_chores').select('*').order('created_at')),
      scope(supabase.from('household_meals').select('*').order('meal_date')),
      scope(supabase.from('household_shopping').select('*').order('created_at')),
      // Pinned first, then newest — a fridge door reads top-down by urgency.
      scope(supabase.from('household_notes').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false })),
      scope(supabase.from('household_rules').select('*').order('created_at', { ascending: false })),
      scope(supabase.from('household_movein_items').select('*').order('created_at')),
    ])
    const firstError = ce ?? me ?? se ?? ne ?? re ?? mve
    setError(firstError ? firstError.message : null)
    setChores((c as Chore[] | null) ?? [])
    setMeals((m as Meal[] | null) ?? [])
    setShopping((s as ShoppingItem[] | null) ?? [])
    setNotes((n as HouseNote[] | null) ?? [])
    setRules((r as HouseRule[] | null) ?? [])
    setMoveinItems((mv as MoveinItem[] | null) ?? [])
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
    const chore = chores.find(c => c.id === id)
    // A late completion shouldn't push the whole future schedule later. If
    // the chore was already overdue, anchor the new cycle to when it WAS
    // due, not to today — otherwise a chore done 3 days late drifts 3 days
    // later every time it runs late, and a "week apart" chore quietly
    // becomes 10, then 14, then 20 days apart. Completing on time or early
    // still anchors to today, same as before.
    const today = new Date()
    let anchor = format(today, 'yyyy-MM-dd')
    if (chore?.last_done_at) {
      const wasDue = addDays(parseISO(chore.last_done_at), chore.cadence_days)
      if (wasDue < today) anchor = format(wasDue, 'yyyy-MM-dd')
    }
    const { error } = await supabase.from('household_chores')
      .update({ last_done_at: anchor, last_done_by: user.id })
      .eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function removeChore(id: string) {
    const { error } = await supabase.from('household_chores').delete().eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function addMeal(
    meal_date: string, slot: Meal['slot'], title: string, cook: string | null,
    extra?: { kind?: Meal['kind']; place_id?: string | null },
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_meals')
      .insert({
        user_id: user.id, space_id: spaceId, meal_date, slot, title, cook,
        kind: extra?.kind ?? 'cooking', place_id: extra?.place_id ?? null,
      })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function removeMeal(id: string) {
    const { error } = await supabase.from('household_meals').delete().eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function updateMeal(id: string, fields: Partial<Pick<Meal, 'notes' | 'recipe_url' | 'kind' | 'place_id' | 'title'>>) {
    const { error } = await supabase.from('household_meals').update(fields).eq('id', id)
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

  // Rules is a resource Discord already writes to (`/rule`, `/save`, `/task`...
  // land here too, but into chores) that had no UI at all until now — same
  // shape as everything above, just newer.
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

  // Move-in items (2026-08-12) — same got/got_at/got_by shape as shopping,
  // deliberately a separate table (see the migration header): furniture and
  // appliances are a different rhythm than groceries, not the same list.
  async function addMoveinItem(name: string, category: string | null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_movein_items')
      .insert({ user_id: user.id, space_id: spaceId, name, category })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function toggleMoveinGot(id: string, got: boolean) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('household_movein_items')
      .update({ got, got_at: got ? new Date().toISOString() : null, got_by: got ? user?.id ?? null : null })
      .eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function removeMoveinItem(id: string) {
    const { error } = await supabase.from('household_movein_items').delete().eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  return {
    chores, meals, shopping, notes, rules, moveinItems, loading, error,
    addChore, markChoreDone, removeChore,
    addMeal, removeMeal, updateMeal,
    addShopping, toggleGot, clearGot, removeShopping,
    addNote, toggleNotePin, removeNote,
    addRule, toggleRuleActive, removeRule,
    addMoveinItem, toggleMoveinGot, removeMoveinItem,
  }
}
