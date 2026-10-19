'use client'

import { useCallback, useEffect, useState } from 'react'
import { differenceInCalendarDays } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { newItemId, todayKey, itemDone, countSteps, type RoutineItem, type ParsedRoutine } from '@/lib/routines/items'
import { withToday } from '@/lib/routines/streak'
export type { RoutineItem }

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


export interface PersonalRoutine {
  id: string
  name: string
  cadence_days: number
  items: RoutineItem[]
  last_done_at: string | null
  created_at: string
  /** Days it was finished, newest first (gentle streaks, 2026-10-19). Absent until routine_streaks.sql runs. */
  done_days?: string[]
}

export interface SharedFromPartner {
  routine_id: string
  item_id: string
  label: string
  done: boolean
  updated_at: string
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
      // '*' rather than a column list, so a column added later (done_days)
      // comes through once it exists and nothing breaks before then.
      supabase.from('household_routines')
        .select('*')
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

  async function addRoutine(name: string, cadenceDays: number, labels: string[] | ParsedRoutine['items']): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const items: RoutineItem[] = labels
      .map(l => (typeof l === 'string' ? { label: l } : l))
      .filter(l => l.label.trim())
      .map(l => ({ ...l, id: newItemId(), label: l.label.trim(), done: false }))
    const { data, error } = await supabase.from('household_routines')
      .insert({ user_id: user.id, space_id: null, kind: 'routine', name, cadence_days: cadenceDays, items })
      .select('id, name, cadence_days, items, last_done_at, created_at').single()
    if (error) return error.message
    setRoutines(prev => [...prev, data as PersonalRoutine])
    return null
  }

  /** Rename, change how often, or rewrite the steps. A shared step whose
   *  words change is re-mirrored; one that was removed stops being shared. */
  async function updateRoutine(id: string, patch: { name?: string; cadence_days?: number; items?: RoutineItem[] }): Promise<string | null> {
    const before = routines.find(x => x.id === id)
    const { error } = await supabase.from('household_routines').update(patch).eq('id', id)
    if (error) return error.message
    setRoutines(prev => prev.map(x => (x.id === id ? { ...x, ...patch } : x)))
    if (patch.items && before) {
      const now = new Set(patch.items.map(i => i.id))
      await Promise.all([
        ...before.items.filter(i => i.shared && !now.has(i.id)).map(i =>
          supabase.from('shared_routine_items').delete().eq('routine_id', id).eq('item_id', i.id)),
        ...patch.items.filter(i => i.shared).map(i => syncMirror(i, id)),
      ])
    }
    return null
  }

  /** Mark today as a finished day for the streak. Its own update, so a
   *  database without the done_days column only loses the streak. */
  async function recordDay(id: string) {
    const r = routines.find(x => x.id === id)
    if (!r) return
    const done_days = withToday(r.done_days)
    const { error } = await supabase.from('household_routines').update({ done_days }).eq('id', id)
    if (!error) setRoutines(prev => prev.map(x => (x.id === id ? { ...x, done_days } : x)))
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
    // A tick from an earlier period no longer counts, so tapping it starts it fresh.
    const items = r.items.map(i => (i.id === itemId
      ? (itemDone(i, r.cadence_days) ? { ...i, done: false, done_on: null } : { ...i, done: true, done_on: todayKey() })
      : i))
    const { error } = await supabase.from('household_routines').update({ items }).eq('id', routineId)
    if (error) return
    setRoutines(prev => prev.map(x => (x.id === routineId ? { ...x, items } : x)))
    const changed = items.find(i => i.id === itemId)
    if (changed?.shared) await syncMirror(changed, routineId)
    // Ticking the last step finishes the day.
    const c = countSteps(items, r.cadence_days)
    if (c.total > 0 && c.done === c.total) await recordDay(routineId)
  }

  async function markRoutineDone(id: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const r = routines.find(x => x.id === id)
    if (!r || !user) return
    const today = todayKey()
    const items = r.items.map(i => (i.note ? i : { ...i, done: true, done_on: today }))
    const { error } = await supabase.from('household_routines')
      .update({ items, last_done_at: today, last_done_by: user.id }).eq('id', id)
    if (error) return
    setRoutines(prev => prev.map(x => (x.id === id ? { ...x, items, last_done_at: today } : x)))
    await recordDay(id)
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
    addRoutine, updateRoutine, removeRoutine, toggleRoutineItem, markRoutineDone, toggleItemShared,
  }
}
