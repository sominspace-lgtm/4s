'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ListItem {
  id: string
  label: string
  done: boolean
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

  async function addList(name: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase.from('household_lists')
      .insert({ user_id: user.id, space_id: spaceId, name, items: [] })
      .select().single()
    if (error) return error.message
    setLists(prev => [...prev, data as HouseholdList])
    return null
  }

  async function removeList(id: string) {
    await supabase.from('household_lists').delete().eq('id', id)
    setLists(prev => prev.filter(l => l.id !== id))
  }

  async function addItem(listId: string, label: string) {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    const items = [...list.items, { id: newItemId(), label, done: false }]
    const { error } = await supabase.from('household_lists').update({ items }).eq('id', listId)
    if (!error) setLists(prev => prev.map(l => (l.id === listId ? { ...l, items } : l)))
  }

  async function toggleItem(listId: string, itemId: string) {
    const list = lists.find(l => l.id === listId)
    if (!list) return
    const items = list.items.map(i => (i.id === itemId ? { ...i, done: !i.done } : i))
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

  return { lists, loading, addList, removeList, addItem, toggleItem, removeItem }
}
