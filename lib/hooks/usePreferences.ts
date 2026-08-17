'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type PreferenceCategory = 'preference' | 'like' | 'dislike' | 'decision' | 'general'

export interface Preference {
  id: string
  user_id: string
  space_id: string | null
  category: PreferenceCategory
  text: string
  note: string | null
  created_at: string
  updated_at: string
}

export const CATEGORY_LABEL: Record<PreferenceCategory, string> = {
  preference: '💛 Preference', like: '👍 Like', dislike: '👎 Dislike', decision: '✅ Decision', general: '🧠 General',
}

// Same pattern as usePlaces: not scoped to one space at load time. RLS
// already limits reads to "mine or a space I'm in" — Personal has no space
// picker the way Household does, so this just shows everything visible,
// same idiom Places already established for exactly this situation.
export function usePreferences() {
  const supabase = createClient()
  const [preferences, setPreferences] = useState<Preference[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('preferences').select('*').order('created_at', { ascending: false })
    setPreferences((data as Preference[] | null) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function addPreference(category: PreferenceCategory, text: string, note?: string | null): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase.from('preferences')
      .insert({ user_id: user.id, category, text, note: note ?? null })
      .select().single()
    if (error) return error.message
    setPreferences(prev => [data as Preference, ...prev])
    return null
  }

  async function removePreference(id: string) {
    await supabase.from('preferences').delete().eq('id', id)
    setPreferences(prev => prev.filter(p => p.id !== id))
  }

  return { preferences, loading, addPreference, removePreference }
}
