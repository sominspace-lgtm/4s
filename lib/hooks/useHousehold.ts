'use client'

import { useCallback, useEffect, useState } from 'react'
import { logWin } from '@/lib/household/wins'
import { createClient } from '@/lib/supabase/client'
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'

export interface Chore {
  id: string
  space_id: string | null
  name: string
  cadence_days: number
  last_done_at: string | null
  last_done_by: string | null
  // Free-text grouping, same idea as ShoppingItem.category but user-defined
  // rather than a fixed list (2026-08-26) — see
  // supabase/migrations/household_chores_folders.sql.
  folder: string | null
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
  /** The saved recipe this meal cooks, if any (2026-10-13). Optional, a meal can stay just a title. */
  recipe_id?: string | null
  /** How many servings are being made. null = the recipe's own. */
  servings?: number | null
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

/** The dinner planned for `date` (default today), or null. This filter was
 *  copy-pasted in TonightCard / MealsCard / AmbientInfo — one home now. */
export function dinnerFor(meals: Meal[], date: Date = new Date()): Meal | null {
  const key = format(date, 'yyyy-MM-dd')
  return meals.find(m => m.slot === 'dinner' && m.meal_date.slice(0, 10) === key) ?? null
}

/** Away mode (2026-10-21): the household's pause, from household_away.sql. */
export interface Away { from: string; until: string }

/** Is the pause running today (not just planned)? */
export function awayActive(a: Away | null, today = format(new Date(), 'yyyy-MM-dd')): boolean {
  return !!a && a.from <= today && today <= a.until
}

export function useHousehold(spaceId: string | null) {
  const supabase = createClient()
  const [chores, setChores] = useState<Chore[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [shopping, setShopping] = useState<ShoppingItem[]>([])
  const [rules, setRules] = useState<HouseRule[]>([])
  const [moveinItems, setMoveinItems] = useState<MoveinItem[]>([])
  const [away, setAwayState] = useState<Away | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    // RLS already scopes rows to "mine or my spaces"; the filter here is just
    // about which view you're looking at (a specific household vs personal).
    const scope = <T extends { eq: (c: string, v: string) => T; is: (c: string, v: null) => T }>(q: T) =>
      spaceId ? q.eq('space_id', spaceId) : q.is('space_id', null)

    const [
      { data: c, error: ce }, { data: m, error: me }, { data: s, error: se },
      { data: r, error: re }, { data: mv, error: mve },
    ] = await Promise.all([
      scope(supabase.from('household_chores').select('*').order('created_at')),
      scope(supabase.from('household_meals').select('*').order('meal_date')),
      scope(supabase.from('household_shopping').select('*').order('created_at')),
      scope(supabase.from('household_rules').select('*').order('created_at', { ascending: false })),
      scope(supabase.from('household_movein_items').select('*').order('created_at')),
    ])
    const firstError = ce ?? me ?? se ?? re ?? mve
    setError(firstError ? firstError.message : null)
    // Away mode: while the pause runs, every chore is frozen where it stood
    // the day you left, by moving its last-done date forward by the days
    // gone so far. Only on screen; the real dates move once, when you are
    // back (household_back). A missing column (SQL not run yet) means no pause.
    let choreRows = c
    let a: Away | null = null
    if (spaceId) {
      const { data: sp } = await supabase.from('shared_spaces').select('away_from, away_until').eq('id', spaceId).maybeSingle()
      if (sp?.away_from && sp?.away_until) a = { from: String(sp.away_from).slice(0, 10), until: String(sp.away_until).slice(0, 10) }
    }
    const today = format(new Date(), 'yyyy-MM-dd')
    if (a && spaceId && today > a.until) {
      // The trip is over: make the shift real, then show the chores as they are.
      await supabase.rpc('household_back', { p_space: spaceId })
      a = null
      const { data: fresh } = await supabase.from('household_chores').select('*').eq('space_id', spaceId).order('created_at')
      if (fresh) choreRows = fresh
    }
    setAwayState(a)
    const gone = a && awayActive(a, today) ? differenceInCalendarDays(parseISO(today), parseISO(a.from)) : 0
    setChores(((choreRows as Chore[] | null) ?? []).map(ch => (gone > 0 && ch.last_done_at
      ? { ...ch, last_done_at: format(addDays(parseISO(ch.last_done_at), gone), 'yyyy-MM-dd') }
      : ch)))
    setMeals((m as Meal[] | null) ?? [])
    setShopping((s as ShoppingItem[] | null) ?? [])
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

  async function addChore(name: string, cadence_days: number, folder: string | null = null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_chores')
      .insert({ user_id: user.id, space_id: spaceId, name, cadence_days, folder })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  // Rename a chore or change how often it comes round (2026-10-15).
  async function updateChore(id: string, patch: { name?: string; cadence_days?: number; folder?: string | null }) {
    const { error } = await supabase.from('household_chores').update(patch).eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function setChoreFolder(id: string, folder: string | null) {
    const { error } = await supabase.from('household_chores').update({ folder }).eq('id', id)
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
    if (chore) void logWin(supabase, spaceId, user.id, 'chore', chore.name)
    await load(); notify(); return { error: null }
  }

  async function removeChore(id: string) {
    const { error } = await supabase.from('household_chores').delete().eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function addMeal(
    meal_date: string, slot: Meal['slot'], title: string, cook: string | null,
    extra?: { kind?: Meal['kind']; place_id?: string | null; recipe_id?: string | null; servings?: number | null },
  ) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_meals')
      .insert({
        user_id: user.id, space_id: spaceId, meal_date, slot, title, cook,
        kind: extra?.kind ?? 'cooking', place_id: extra?.place_id ?? null,
        ...(extra?.recipe_id ? { recipe_id: extra.recipe_id } : {}),
        ...(extra?.servings ? { servings: extra.servings } : {}),
      })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  // Several meals at once (copy a week, fill the week from favorites): one
  // insert and one reload instead of one of each per meal.
  async function addMeals(rows: { meal_date: string; slot: Meal['slot']; title: string; recipe_id?: string | null; servings?: number | null; kind?: Meal['kind'] }[]) {
    if (rows.length === 0) return { error: null }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_meals').insert(rows.map(r => ({
      user_id: user.id, space_id: spaceId, meal_date: r.meal_date, slot: r.slot, title: r.title,
      kind: r.kind ?? 'cooking', ...(r.recipe_id ? { recipe_id: r.recipe_id } : {}), ...(r.servings ? { servings: r.servings } : {}),
    })))
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function removeMeal(id: string) {
    const { error } = await supabase.from('household_meals').delete().eq('id', id)
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function updateMeal(id: string, fields: Partial<Pick<Meal, 'notes' | 'recipe_url' | 'kind' | 'place_id' | 'title' | 'recipe_id' | 'servings' | 'cook' | 'meal_date' | 'slot'>>) {
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

  async function updateRule(id: string, fields: Partial<Pick<HouseRule, 'text' | 'category' | 'note'>>) {
    const { error } = await supabase.from('household_rules').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
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

  // Many list items in one go (a recipe's ingredients): one insert, one reload.
  async function addShoppingMany(items: { name: string; qty: string | null; category: string | null }[]) {
    if (items.length === 0) return { error: null }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('household_shopping')
      .insert(items.map(i => ({ user_id: user.id, space_id: spaceId, name: i.name, qty: i.qty, category: i.category })))
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function setAway(from: string, until: string) {
    if (!spaceId) return { error: 'No household yet' }
    const { error } = await supabase.rpc('household_set_away', { p_space: spaceId, p_from: from, p_until: until })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  async function endAway() {
    if (!spaceId) return { error: 'No household yet' }
    const { error } = await supabase.rpc('household_back', { p_space: spaceId })
    if (error) { setError(error.message); return { error: error.message } }
    await load(); notify(); return { error: null }
  }

  return {
    chores, meals, shopping, rules, moveinItems, loading, error,
    away, setAway, endAway,
    addChore, markChoreDone, removeChore, setChoreFolder, updateChore,
    addMeal, addMeals, removeMeal, updateMeal,
    addShopping, addShoppingMany, toggleGot, clearGot, removeShopping,
    addRule, updateRule, toggleRuleActive, removeRule,
    addMoveinItem, toggleMoveinGot, removeMoveinItem,
  }
}
