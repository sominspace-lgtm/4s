'use client'

import { useCallback, useEffect, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

export type RoutineKind = 'routine' | 'maintenance'

export interface RoutineItem {
  id: string
  label: string
  done: boolean
}

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

function newItemId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
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

  async function removeRoutine(id: string) {
    await supabase.from('household_routines').delete().eq('id', id)
    setRoutines(prev => prev.filter(r => r.id !== id))
  }

  async function toggleRoutineItem(id: string, itemId: string) {
    const r = routines.find(x => x.id === id)
    if (!r) return
    const items = r.items.map(i => (i.id === itemId ? { ...i, done: !i.done } : i))
    const { error } = await supabase.from('household_routines').update({ items }).eq('id', id)
    if (!error) setRoutines(prev => prev.map(x => (x.id === id ? { ...x, items } : x)))
  }

  // Marking the whole thing done force-completes any unchecked sub-tasks and
  // resets the cadence clock — the "did it, moving on" action.
  async function markRoutineDone(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const r = routines.find(x => x.id === id)
    if (!r || !user) return
    const items = r.items.map(i => ({ ...i, done: true }))
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('household_routines')
      .update({ items, last_done_at: today, last_done_by: user.id }).eq('id', id)
    if (!error) setRoutines(prev => prev.map(x => (x.id === id ? { ...x, items, last_done_at: today, last_done_by: user.id } : x)))
  }

  return { routines, loading, addRoutine, removeRoutine, toggleRoutineItem, markRoutineDone }
}
