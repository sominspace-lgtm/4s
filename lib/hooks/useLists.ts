'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ListItem {
  id: string
  label: string
  done: boolean
  /** Optional note alongside the label — a bathroom code, a booking
   *  reference, anything that doesn't belong in the title itself
   *  (2026-09-22). */
  note?: string
  /** Optional link to a Places pin (2026-09-22) — e.g. a "Dream hotels"
   *  item pointing at the real hotel once you've pinned it, or a
   *  "Bathroom codes" item pointing at which place the code is for.
   *  Nullable/absent on purpose: a list item doesn't have to be a place. */
  place_id?: string | null
  /** Optional reminder (2026-09-22) — same "due date" idea Tasks already
   *  has, generalized to any list item. Checked by the daily push cron;
   *  see app/api/cron/daily/route.ts's 'listReminder' kind. Cleared once
   *  the reminder fires so it doesn't repeat, and cleared on toggling done.
   */
  remind_at?: string | null
}

export interface HouseholdList {
  id: string
  space_id: string | null
  name: string
  items: ListItem[]
  created_at: string
}

function newItemId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

// Generic ad-hoc lists (2026-08-13) — "things to research", "gift ideas for
// Mom". Same own-or-space scoping as useHousehold's own resources.
export function useLists(spaceId: string | null) {
  const supabase = createClient()
  const [lists, setLists] = useState<HouseholdList[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const scope = spaceId
      ? supabase.from('household_lists').select('*').eq('space_id', spaceId)
      : supabase.from('household_lists').select('*').is('space_id', null)
    const { data } = await scope.order('created_at')
    setLists((data as HouseholdList[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  /** Returns the new list's id (so a caller can immediately addItem into it —
   *  see PlaceBathroomCode.tsx, which needs to create-then-populate in one
   *  action) alongside an error message. Existing callers that only cared
   *  about success/failure still work: they just ignore `.id`. */
  async function addList(name: string): Promise<{ id: string | null; error: string | null }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { id: null, error: 'Not signed in' }
    const { data, error } = await supabase.from('household_lists')
      .insert({ user_id: user.id, space_id: spaceId, name, items: [] })
      .select().single()
    if (error) return { id: null, error: error.message }
    setLists(prev => [...prev, data as HouseholdList])
    return { id: (data as HouseholdList).id, error: null }
  }

  async function removeList(id: string) {
    await supabase.from('household_lists').delete().eq('id', id)
    setLists(prev => prev.filter(l => l.id !== id))
  }

  async function addItem(listId: string, label: string, extra?: Pick<ListItem, 'note' | 'place_id' | 'remind_at'>) {
    const list = lists.find(l => l.id === listId)
    // No early return when the list isn't in local state yet — it used to
    // silently no-op here, which broke the exact case of "create a list then
    // immediately add an item to it" (PlaceBathroomCode.tsx): addList's
    // setLists schedules a re-render, it doesn't update THIS closure's
    // `lists` binding, so the very next addItem call in the same async
    // function always missed. A brand-new list's items are always `[]`, so
    // appending is still correct without the local copy; load() afterward
    // brings the row into state properly either way.
    const items = [...(list?.items ?? []), { id: newItemId(), label, done: false, ...extra }]
    const { error } = await supabase.from('household_lists').update({ items }).eq('id', listId)
    if (error) return
    if (list) setLists(prev => prev.map(l => (l.id === listId ? { ...l, items } : l)))
    else await load()
  }

  /** Patches one item in place — used for linking a place, adding a note, or
   *  setting/clearing a reminder without retyping the whole item. */
  async function updateItem(listId: string, itemId: string, patch: Partial<Omit<ListItem, 'id'>>) {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    const items = list.items.map(i => (i.id === itemId ? { ...i, ...patch } : i))
    const { error } = await supabase.from('household_lists').update({ items }).eq('id', listId)
    if (!error) setLists(prev => prev.map(l => (l.id === listId ? { ...l, items } : l)))
  }

  async function toggleItem(listId: string, itemId: string) {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    // Done also clears any pending reminder — a finished item has nothing
    // left to be reminded about, so a stale remind_at wouldn't do anything
    // except leave a future push about something already handled.
    const items = list.items.map(i => (i.id === itemId ? { ...i, done: !i.done, remind_at: i.done ? i.remind_at : null } : i))
    const { error } = await supabase.from('household_lists').update({ items }).eq('id', listId)
    if (!error) setLists(prev => prev.map(l => (l.id === listId ? { ...l, items } : l)))
  }

  async function removeItem(listId: string, itemId: string) {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    const items = list.items.filter(i => i.id !== itemId)
    const { error } = await supabase.from('household_lists').update({ items }).eq('id', listId)
    if (!error) setLists(prev => prev.map(l => (l.id === listId ? { ...l, items } : l)))
  }

  return { lists, loading, addList, removeList, addItem, updateItem, toggleItem, removeItem }
}
