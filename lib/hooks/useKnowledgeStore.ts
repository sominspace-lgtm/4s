'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Generic owner-scoped CRUD store with cross-instance sync — the shared shape
// behind the "structured knowledge" Life-OS systems (Decision Memory, Home
// Brain). RLS keeps rows private; the event keeps every instance in sync.
export function useKnowledgeStore<T extends { id: string }>(
  table: string,
  columns: string,
  event: string,
  order: string = 'created_at',
) {
  const supabase = createClient()
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase.from(table).select(columns).order(order, { ascending: false })
    setItems((data as T[] | null) ?? [])
    setLoading(false)
  }, [table, columns, order])

  useEffect(() => {
    load()
    const on = () => load()
    window.addEventListener(event, on)
    return () => window.removeEventListener(event, on)
  }, [load, event])

  async function add(fields: Record<string, unknown>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in') }
    const { error } = await supabase.from(table).insert({ user_id: user.id, ...fields })
    if (error) {
      console.error(`Failed to add to ${table}:`, error.message)
      return { error }
    }
    window.dispatchEvent(new CustomEvent(event))
    return { error: null }
  }

  async function update(id: string, patch: Record<string, unknown>) {
    const prev = items
    setItems(p => p.map(i => (i.id === id ? { ...i, ...patch } as T : i)))
    const { error } = await supabase.from(table).update(patch).eq('id', id)
    if (error) {
      setItems(prev)
      console.error(`Failed to update ${table}:`, error.message)
      return { error }
    }
    window.dispatchEvent(new CustomEvent(event))
    return { error: null }
  }

  async function remove(id: string) {
    const prev = items
    setItems(p => p.filter(i => i.id !== id))
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      setItems(prev)
      console.error(`Failed to delete from ${table}:`, error.message)
      return { error }
    }
    window.dispatchEvent(new CustomEvent(event))
    return { error: null }
  }

  return { items, loading, add, update, remove }
}
