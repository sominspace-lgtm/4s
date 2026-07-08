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
    if (!user) return
    await supabase.from(table).insert({ user_id: user.id, ...fields })
    window.dispatchEvent(new CustomEvent(event))
  }

  async function update(id: string, patch: Record<string, unknown>) {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } as T : i)))
    await supabase.from(table).update(patch).eq('id', id)
    window.dispatchEvent(new CustomEvent(event))
  }

  async function remove(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from(table).delete().eq('id', id)
    window.dispatchEvent(new CustomEvent(event))
  }

  return { items, loading, add, update, remove }
}
