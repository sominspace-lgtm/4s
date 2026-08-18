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
    return null
  }

  async function remove(id: string) {
    await supabase.from('person_preferences').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return { items, loading, add, remove }
}
