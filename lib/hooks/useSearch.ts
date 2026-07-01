'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SearchResult {
  id: string
  type: 'capture' | 'work' | 'wishlist' | 'habit' | 'note'
  title: string
  subtitle?: string
  domain?: string
  color?: string
}

export function useSearch() {
  const supabase = createClient()
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  async function search(q: string) {
    if (!q.trim()) { setResults([]); return }
    setLoading(true)
    const term = `%${q.trim()}%`

    const [captures, work, wishlist, habits] = await Promise.all([
      supabase.from('captures').select('id, text, domain').ilike('text', term).limit(5),
      supabase.from('work_items').select('id, title, status, project').ilike('title', term).limit(5),
      supabase.from('wishlist_items').select('id, name, category').ilike('name', term).limit(5),
      supabase.from('habits').select('id, name, category').ilike('name', term).limit(4),
    ])

    const out: SearchResult[] = []

    for (const r of captures.data ?? []) {
      out.push({ id: r.id, type: 'capture', title: r.text, subtitle: r.domain ? `Domain · ${r.domain}` : 'Capture', domain: r.domain })
    }
    for (const r of work.data ?? []) {
      out.push({ id: r.id, type: 'work', title: r.title, subtitle: r.project ? `${r.project} · ${r.status}` : r.status })
    }
    for (const r of wishlist.data ?? []) {
      out.push({ id: r.id, type: 'wishlist', title: r.name, subtitle: r.category ?? 'Wishlist' })
    }
    for (const r of habits.data ?? []) {
      out.push({ id: r.id, type: 'habit', title: r.name, subtitle: r.category ?? 'Habit' })
    }

    setResults(out)
    setLoading(false)
  }

  function clear() { setResults([]) }

  return { results, loading, search, clear }
}
