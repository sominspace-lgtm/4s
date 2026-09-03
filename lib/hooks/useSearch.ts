'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SearchResult {
  id: string
  type: 'work' | 'wishlist' | 'habit' | 'note'
  title: string
  subtitle?: string
  domain?: string
  color?: string
}

/** A note's display title — quick notes have an empty title, body only. */
function noteTitle(n: { title?: string | null; body?: string | null }): string {
  const line = (n.title || n.body || '').split('\n').find(l => l.trim()) ?? ''
  return line.length > 80 ? line.slice(0, 80) + '…' : (line || 'Untitled')
}

const QUESTION_RE = /\?\s*$|^(who|what|whats|when|where|why|how|did|do|does|is|are|should|can|which)\b/i

export function useSearch() {
  const supabase = createClient()
  const [results, setResults] = useState<SearchResult[]>([])
  const [aiAnswer, setAiAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function search(q: string) {
    const query = q.trim()
    if (!query) { setResults([]); setAiAnswer(null); return }
    setLoading(true)
    setAiAnswer(null)
    const term = `%${query}%`

    const [work, wishlist, habits, notes] = await Promise.all([
      supabase.from('work_items').select('id, title, status, project').ilike('title', term).limit(5),
      supabase.from('wishlist_items').select('id, name, category').ilike('name', term).limit(5),
      supabase.from('habits').select('id, name, category').ilike('name', term).limit(4),
      // Title OR body — quick notes (⌘K) are body-only.
      supabase.from('notes').select('id, title, body, pinned').or(`title.ilike.${term},body.ilike.${term}`).limit(5),
    ])

    const out: SearchResult[] = []
    for (const r of work.data ?? []) out.push({ id: r.id, type: 'work', title: r.title, subtitle: r.project ? `${r.project} · ${r.status}` : r.status })
    for (const r of wishlist.data ?? []) out.push({ id: r.id, type: 'wishlist', title: r.name, subtitle: r.category ?? 'Wishlist' })
    for (const r of habits.data ?? []) out.push({ id: r.id, type: 'habit', title: r.name, subtitle: r.category ?? 'Habit' })
    for (const r of notes.data ?? []) out.push({ id: r.id, type: 'note', title: noteTitle(r), subtitle: r.pinned ? 'Pinned note' : 'Note' })

    setResults(out)
    setLoading(false)

    // A phrased question, or nothing matched literally — try a semantic pass
    // over recent items. Silent no-op if AI is unavailable.
    const worthAsking = QUESTION_RE.test(query) || (out.length === 0 && query.split(/\s+/).length >= 3)
    if (!worthAsking) return

    try {
      const [rw, rn] = await Promise.all([
        supabase.from('work_items').select('id, title, status, project').order('created_at', { ascending: false }).limit(15),
        supabase.from('notes').select('id, title, body, pinned').order('updated_at', { ascending: false }).limit(15),
      ])
      const byId = new Map<string, SearchResult>()
      for (const r of out) byId.set(r.id, r)
      const cand: { id: string; type: SearchResult['type']; title: string }[] = []
      for (const r of rw.data ?? []) { cand.push({ id: r.id, type: 'work', title: r.title }); byId.set(r.id, byId.get(r.id) ?? { id: r.id, type: 'work', title: r.title, subtitle: r.project ? `${r.project} · ${r.status}` : r.status }) }
      for (const r of rn.data ?? []) { const tt = noteTitle(r); cand.push({ id: r.id, type: 'note', title: tt }); byId.set(r.id, byId.get(r.id) ?? { id: r.id, type: 'note', title: tt, subtitle: r.pinned ? 'Pinned note' : 'Note' }) }

      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'search', query, items: cand }),
      })
      if (!res.ok) return
      const { result } = await res.json() as { result: { answer: string | null; matchIds: string[] } }
      if (result?.answer) setAiAnswer(result.answer)
      const ranked = (result?.matchIds ?? []).map(id => byId.get(id)).filter((r): r is SearchResult => !!r)
      if (ranked.length) {
        const rankedIds = new Set(ranked.map(r => r.id))
        setResults([...ranked, ...out.filter(r => !rankedIds.has(r.id))])
      }
    } catch { /* AI off / rate-limited — literal results stand */ }
  }

  function clear() { setResults([]); setAiAnswer(null) }

  return { results, aiAnswer, loading, search, clear }
}
