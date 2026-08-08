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

/** Days until due. Negative = overdue. Never done = due now, not "overdue". */
export function choreDue(c: Chore): number {
  if (!c.last_done_at) return 0
  return c.cadence_days - differenceInCalendarDays(new Date(), parseISO(c.last_done_at))
}

export function useHousehold(spaceId: string | null) {
  const supabase = createClient()
  const [chores, setChores] = useState<Chore[]>([])
  const [meals, setMeals] = useState<Meal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    // RLS already scopes rows to "mine or my spaces"; the filter here is just
    // about which view you're looking at (a specific household vs personal).
    const choreQ = supabase.from('household_chores').select('*').order('created_at')
    const mealQ = supabase.from('household_meals').select('*').order('meal_date')
    const [{ data: c, error: ce }, { data: m, error: me }] = await Promise.all([
      spaceId ? choreQ.eq('space_id', spaceId) : choreQ.is('space_id', null),
      spaceId ? mealQ.eq('space_id', spaceId) : mealQ.is('space_id', null),
    ])
    if (ce || me) setError((ce ?? me)!.message)
    else setError(null)
    setChores((c as Chore[] | null) ?? [])
    setMeals((m as Meal[] | null) ?? [])
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

  return { chores, meals, loading, error, addChore, markChoreDone, removeChore, addMeal, removeMeal }
}
