'use client'

import { useCallback, useEffect, useState } from 'react'
import { logWin } from '@/lib/household/wins'
import { differenceInCalendarDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { newItemId, todayKey, itemDone, type RoutineItem } from '@/lib/routines/items'
export type { RoutineItem }

export type RoutineKind = 'routine' | 'maintenance'


export interface Routine {
  id: string
  space_id: string | null
  kind: RoutineKind
  name: string
  cadence_days: number
  items: RoutineItem[]
  last_done_at: string | null
  last_done_by: string | null
  created_at: string
}

// Days until due — negative = overdue. Never-done = due now, same
// convention choreDue() already uses for the flat chore list.
export function routineDue(r: Routine): number {
  if (!r.last_done_at) return 0
  return r.cadence_days - differenceInCalendarDays(new Date(), new Date(r.last_done_at))
}

export function useRoutines(spaceId: string | null) {
  const supabase = createClient()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const scope = spaceId
      ? supabase.from('household_routines').select('*').eq('space_id', spaceId)
      : supabase.from('household_routines').select('*').is('space_id', null)
    const { data } = await scope.order('created_at')
    setRoutines((data as Routine[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  async function addRoutine(kind: RoutineKind, name: string, cadenceDays: number, labels: string[]): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const items: RoutineItem[] = labels.filter(l => l.trim()).map(label => ({ id: newItemId(), label: label.trim(), done: false }))
    const { data, error } = await supabase.from('household_routines')
      .insert({ user_id: user.id, space_id: spaceId, kind, name, cadence_days: cadenceDays, items })
      .select().single()
    if (error) return error.message
    setRoutines(prev => [...prev, data as Routine])
    return null
  }

  async function updateRoutine(id: string, patch: { name?: string; cadence_days?: number; items?: RoutineItem[] }): Promise<string | null> {
    const { error } = await supabase.from('household_routines').update(patch).eq('id', id)
    if (error) return error.message
    setRoutines(prev => prev.map(x => (x.id === id ? { ...x, ...patch } : x)))
    return null
  }

  async function removeRoutine(id: string) {
    await supabase.from('household_routines').delete().eq('id', id)
    setRoutines(prev => prev.filter(r => r.id !== id))
  }

  async function toggleRoutineItem(id: string, itemId: string) {
    const r = routines.find(x => x.id === id)
    if (!r) return
    const items = r.items.map(i => (i.id === itemId
      ? (itemDone(i, r.cadence_days) ? { ...i, done: false, done_on: null } : { ...i, done: true, done_on: todayKey() })
      : i))
    const { error } = await supabase.from('household_routines').update({ items }).eq('id', id)
    if (!error) setRoutines(prev => prev.map(x => (x.id === id ? { ...x, items } : x)))
  }

  // Marking the whole thing done force-completes any unchecked sub-tasks and
  // resets the cadence clock — the "did it, moving on" action.
  async function markRoutineDone(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const r = routines.find(x => x.id === id)
    if (!r || !user) return
    const today = todayKey()
    const items = r.items.map(i => (i.note ? i : { ...i, done: true, done_on: today }))
    const { error } = await supabase.from('household_routines')
      .update({ items, last_done_at: today, last_done_by: user.id }).eq('id', id)
    if (!error) {
      setRoutines(prev => prev.map(x => (x.id === id ? { ...x, items, last_done_at: today, last_done_by: user.id } : x)))
      void logWin(supabase, r.space_id ?? spaceId, user.id, 'routine', r.name)
    }
  }

  return { routines, loading, addRoutine, updateRoutine, removeRoutine, toggleRoutineItem, markRoutineDone }
}
