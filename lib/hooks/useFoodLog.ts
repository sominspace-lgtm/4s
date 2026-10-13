'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

export type FoodSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export const FOOD_SLOTS: FoodSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']

export interface FoodEntry {
  id: string
  day: string
  slot: FoodSlot
  name: string
  calories: number
  protein: number | null
  carbs: number | null
  fat: number | null
  recipe_id: string | null
  servings: number | null
  created_at: string
}

export type FoodDraft = Pick<FoodEntry, 'name' | 'slot' | 'calories'> & Partial<Pick<FoodEntry, 'protein' | 'carbs' | 'fat' | 'recipe_id' | 'servings'>> & { day?: string }

export function sumDay(entries: FoodEntry[]) {
  return entries.reduce((t, e) => ({
    calories: t.calories + (Number(e.calories) || 0),
    protein: t.protein + (Number(e.protein) || 0),
    carbs: t.carbs + (Number(e.carbs) || 0),
    fat: t.fat + (Number(e.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
}

// A personal calorie log (2026-10-13), by day. Loads a range so the day view
// and the week strip share one query. Only ever your own rows (RLS).
export function useFoodLog(from: string, to: string) {
  const supabase = createClient()
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('food_log').select('*').gte('day', from).lte('day', to).order('created_at')
    if (e) setError('The calorie log is not set up on the server yet.')
    else { setError(null); setEntries((data as FoodEntry[] | null) ?? []) }
    setLoading(false)
  }, [supabase, from, to])

  useEffect(() => { load() }, [load])

  async function add(d: FoodDraft): Promise<string | null> {
    const name = d.name.trim()
    if (!name) return 'Say what it was.'
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { error: e } = await supabase.from('food_log').insert({ ...d, name, user_id: user.id, day: d.day ?? format(new Date(), 'yyyy-MM-dd') })
    if (e) return e.message
    await load()
    return null
  }

  async function remove(id: string): Promise<string | null> {
    setEntries(prev => prev.filter(x => x.id !== id))
    const { error: e } = await supabase.from('food_log').delete().eq('id', id)
    if (e) { await load(); return e.message }
    return null
  }

  return { entries, loading, error, add, remove }
}

/** The daily calorie goal, on your own preferences row. */
export function useCalorieGoal(userId: string) {
  const supabase = createClient()
  const [goal, setGoalState] = useState<number | null>(null)

  useEffect(() => {
    supabase.from('user_prefs').select('calorie_goal').eq('user_id', userId).maybeSingle()
      .then(({ data }) => setGoalState((data as { calorie_goal?: number | null } | null)?.calorie_goal ?? null))
  }, [supabase, userId])

  async function setGoal(n: number | null): Promise<string | null> {
    const v = n && n > 0 ? Math.round(n) : null
    setGoalState(v)
    const { error } = await supabase.from('user_prefs').upsert({ user_id: userId, calorie_goal: v })
    return error ? error.message : null
  }

  return { goal, setGoal }
}
