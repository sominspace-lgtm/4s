'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PersonPreferenceCategory = 'preference' | 'like' | 'dislike' | 'idea' | 'general'

export interface PersonPreference {
  id: string
  person_id: string
  category: PersonPreferenceCategory
  text: string
  created_at: string
}

export const PERSON_CATEGORY_LABEL: Record<PersonPreferenceCategory, string> = {
  preference: '💛 Preference', like: '👍 Like', dislike: '👎 Dislike', idea: '💡 Idea', general: '🧠 General',
}

// One count per person, across everyone at once — for the relationships
// garden (2026-08-21), which needs every person's preference count to size
// their tree and can't reasonably run one query per person. RLS already
// scopes rows to the caller's own people, so no explicit filter is needed
// here the way usePersonPreferences needs `.eq('person_id', personId)`.
export function usePersonPreferenceCounts(): Record<string, number> {
  const supabase = createClient()
  const [counts, setCounts] = useState<Record<string, number>>({})

  const load = useCallback(async () => {
    const { data } = await supabase.from('person_preferences').select('person_id')
    const next: Record<string, number> = {}
    for (const row of (data as { person_id: string }[] | null) ?? []) {
      next[row.person_id] = (next[row.person_id] ?? 0) + 1
    }
    setCounts(next)
  }, [supabase])

  useEffect(() => {
    load()
    // Same cross-instance sync every other hook in this file's family uses —
    // adding/removing a preference on one person's card should update this
    // person's tree size without a full page reload.
    window.addEventListener('4s:person-preferences-changed', load)
    return () => window.removeEventListener('4s:person-preferences-changed', load)
  }, [load])

  return counts
}

// One instance per person card — each person's list is small (a handful of
// likes/dislikes), so there's no need for a single app-wide store the way
// usePreferences() covers everything personal at once.
export function usePersonPreferences(personId: string) {
  const supabase = createClient()
  const [items, setItems] = useState<PersonPreference[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('person_preferences')
      .select('*')
      .eq('person_id', personId)
      .order('created_at', { ascending: false })
    setItems((data as PersonPreference[] | null) ?? [])
    setLoading(false)
  }, [supabase, personId])

  useEffect(() => { load() }, [load])

  async function add(category: PersonPreferenceCategory, text: string) {
    const { data, error } = await supabase.from('person_preferences')
      .insert({ person_id: personId, category, text })
      .select().single()
    if (error) return error.message
    setItems(prev => [data as PersonPreference, ...prev])
    window.dispatchEvent(new CustomEvent('4s:person-preferences-changed'))
    return null
  }

  async function remove(id: string) {
    await supabase.from('person_preferences').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
    window.dispatchEvent(new CustomEvent('4s:person-preferences-changed'))
  }

  return { items, loading, add, remove }
}
