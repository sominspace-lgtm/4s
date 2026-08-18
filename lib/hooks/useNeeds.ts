'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Need {
  id: string
  user_id: string
  space_id: string | null
  text: string
  created_at: string
}

// "What do you need right now" — private by default (space_id null on
// creation, same as the bot's bespoke create route). Not scoped to one
// space at load time, same idiom usePlaces/usePreferences already use —
// RLS returns "mine or a space I'm in" regardless of query filter.
export function useNeeds() {
  const supabase = createClient()
  const [needs, setNeeds] = useState<Need[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('needs').select('*').order('created_at', { ascending: false })
    setNeeds((data as Need[] | null) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function addNeed(text: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase.from('needs')
      .insert({ user_id: user.id, space_id: null, text })
      .select().single()
    if (error) return error.message
    setNeeds(prev => [data as Need, ...prev])
    return null
  }

  // The one way a need becomes visible to a partner — an explicit action,
  // never a default.
  async function shareNeed(id: string, spaceId: string): Promise<string | null> {
    const { error } = await supabase.from('needs').update({ space_id: spaceId }).eq('id', id)
    if (error) return error.message
    setNeeds(prev => prev.map(n => (n.id === id ? { ...n, space_id: spaceId } : n)))
    return null
  }

  async function removeNeed(id: string) {
    await supabase.from('needs').delete().eq('id', id)
    setNeeds(prev => prev.filter(n => n.id !== id))
  }

  return { needs, loading, addNeed, shareNeed, removeNeed }
}
