'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { IconName } from '@/components/ui/Icon'

// The `4s:person-preferences-changed` event dispatched by add()/remove()
// below used to also drive usePersonPreferenceCounts() (removed 2026-08-21
// with the relationships garden, its only consumer) — left firing here in
// case another cross-instance-sync consumer wants it later; it's a no-op
// event with no listeners today, not dead code in the sense of doing harm.

export type PersonPreferenceCategory = 'preference' | 'like' | 'dislike' | 'idea' | 'general'

export interface PersonPreference {
  id: string
  person_id: string
  category: PersonPreferenceCategory
  text: string
  created_at: string
}

export const PERSON_CATEGORY_LABEL: Record<PersonPreferenceCategory, string> = {
  preference: 'Preference', like: 'Like', dislike: 'Dislike', idea: 'Idea', general: 'General',
}

export const PERSON_CATEGORY_ICON: Record<PersonPreferenceCategory, IconName> = {
  preference: 'heart', like: 'thumbsUp', dislike: 'thumbsDown', idea: 'lightbulb', general: 'brain',
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
