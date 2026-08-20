'use client'

import { useCallback, useEffect, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'

// Personal routines ("Morning routine", "Night routine") — a checklist done
// once a cadence period, distinct from a habit's daily tick-box grid. Lives
// in the SAME household_routines table Household's Routines/Maintenance use,
// just always with space_id null (personal), kind 'routine'. No new table
// for the routines themselves — the schema already supports this shape.
//
// What IS new here: a step inside a personal routine can be marked shared,
// which mirrors just that one step's label + done state into
// shared_routine_items for your partner to read. The routine row itself
// never becomes visible to them — see shared_routine_items.sql for why a
// mirror is the only correct way to do this under row-level RLS.

export interface RoutineItem {
  id: string
  label: string
  done: boolean
  /** Mirrored into shared_routine_items when true. Absent/false = private. */
  shared?: boolean
}

export interface PersonalRoutine {
  id: string
  name: string
  cadence_days: number
  items: RoutineItem[]
  last_done_at: string | null
  created_at: string
}

export interface SharedFromPartner {
  routine_id: string
  item_id: string
  label: string
  done: boolean
  updated_at: string
}

function newItemId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

// Days until due — negative = overdue. Same convention as household routines.
export function routineDue(r: PersonalRoutine): number {
  if (!r.last_done_at) return 0
  return r.cadence_days - differenceInCalendarDays(new Date(), new Date(r.last_done_at))
}

export function usePersonalRoutines(spaceId: string | null) {
  const supabase = createClient()
  const [routines, setRoutines] = useState<PersonalRoutine[]>([])
  const [sharedFromPartner, setSharedFromPartner] = useState<SharedFromPartner[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [own, partner] = await Promise.all([
      supabase.from('household_routines')
        .select('id, name, cadence_days, items, last_done_at, created_at')
        .is('space_id', null).eq('kind', 'routine').order('created_at'),
      spaceId && user
        ? supabase.from('shared_routine_items')
            .select('routine_id, item_id, label, done, updated_at')
            .eq('space_id', spaceId).neq('owner_id', user.id)
        : Promise.resolve({ data: [] as SharedFromPartner[] }),
    ])
    setRoutines((own.data as PersonalRoutine[] | null) ?? [])
    setSharedFromPartner((partner.data as SharedFromPartner[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  async function addRoutine(name: string, cadenceDays: number, labels: string[]): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const items: RoutineItem[] = labels.filter(l => l.trim()).map(label => ({ id: newItemId(), label: label.trim(), done: false }))
    const { data, error } = await supabase.from('household_routines')
      .insert({ user_id: user.id, space_id: null, kind: 'routine', name, cadence_days: cadenceDays, items })
      .select('id, name, cadence_days, items, last_done_at, created_at').single()
    if (error) return error.message
    setRoutines(prev => [...prev, data as PersonalRoutine])
    return null
  }

  async function removeRoutine(id: string) {
    // Cascades to shared_routine_items via its own FK, so a removed routine
    // also stops being visible to a partner, not just to you.
    await supabase.from('household_routines').delete().eq('id', id)
    setRoutines(prev => prev.filter(r => r.id !== id))
  }

  /** Writes a shared item's current label/done into the mirror. No-op if the
   *  item isn't marked shared — call sites check that before calling this. */
  async function syncMirror(item: RoutineItem, routineId: string) {
    if (!spaceId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('shared_routine_items').upsert(
      { space_id: spaceId, owner_id: user.id, routine_id: routineId, item_id: item.id, label: item.label, done: item.done, updated_at: new Date().toISOString() },
      { onConflict: 'routine_id,item_id' },
    )
  }

  async function toggleRoutineItem(routineId: string, itemId: string) {
    const r = routines.find(x => x.id === routineId)
    if (!r) return
    const items = r.items.map(i => (i.id === itemId ? { ...i, done: !i.done } : i))
    const { error } = await supabase.from('household_routines').update({ items }).eq('id', routineId)
    if (error) return
    setRoutines(prev => prev.map(x => (x.id === routineId ? { ...x, items } : x)))
    const changed = items.find(i => i.id === itemId)
    if (changed?.shared) await syncMirror(changed, routineId)
  }

  async function markRoutineDone(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const r = routines.find(x => x.id === id)
    if (!r || !user) return
    const items = r.items.map(i => ({ ...i, done: true }))
    const today = new Date().toISOString().slice(0, 10)
    const { error } = await supabase.from('household_routines')
      .update({ items, last_done_at: today, last_done_by: user.id }).eq('id', id)
    if (error) return
    setRoutines(prev => prev.map(x => (x.id === id ? { ...x, items, last_done_at: today } : x)))
    // Every shared step gets marked done in the mirror too — otherwise
    // "mark the whole routine done" would silently desync from what the
    // partner sees.
    await Promise.all(items.filter(i => i.shared).map(i => syncMirror(i, id)))
  }

  /** Turning sharing on writes the mirror row now (so it doesn't wait for the
   *  next toggle to appear); turning it off deletes it — a step you un-share
   *  should disappear for your partner immediately, not linger stale. */
  async function toggleItemShared(routineId: string, itemId: string) {
    if (!spaceId) return 'No shared space to share with yet'
    const r = routines.find(x => x.id === routineId)
    if (!r) return null
    const items = r.items.map(i => (i.id === itemId ? { ...i, shared: !i.shared } : i))
    const { error } = await supabase.from('household_routines').update({ items }).eq('id', routineId)
    if (error) return error.message
    setRoutines(prev => prev.map(x => (x.id === routineId ? { ...x, items } : x)))

    const changed = items.find(i => i.id === itemId)!
    if (changed.shared) {
      await syncMirror(changed, routineId)
    } else {
      await supabase.from('shared_routine_items').delete().eq('routine_id', routineId).eq('item_id', itemId)
    }
    return null
  }

  return {
    routines, sharedFromPartner, loading,
    addRoutine, removeRoutine, toggleRoutineItem, markRoutineDone, toggleItemShared,
  }
}
