'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Energy } from './useWorkItems'

export type DateIdeaStatus = 'idea' | 'planned' | 'done'

export type PriceRange = '$' | '$$' | '$$$' | '$$$$'

export interface DateIdea {
  id: string
  space_id: string | null
  title: string
  status: DateIdeaStatus
  energy: Energy | null
  place_id: string | null
  tags: string[]
  notes: string | null
  /** Free-text grouping — "Special Days", "Monterey Day", whatever. Same
   *  collapsible-group idea Watchlist uses for games/shows, just open-ended
   *  instead of a fixed domain. */
  area: string | null
  price_range: PriceRange | null
  created_at: string
  updated_at: string
}

// Date Ideas (2026-08-22) — split out of the generic household_lists
// checklist into its own shared, organizable concept: a status (idea ->
// planned -> done), an optional energy level (same 'light'/'medium'/'deep'
// vocabulary work_items already uses, so "what do we have energy for
// tonight" reads the same way across the app), an optional linked pin
// (where), and free tags for your own sorting. Shared "for all" access,
// same as household_lists/chores — either of you can edit any idea.
export function useDateIdeas(spaceId: string | null) {
  const supabase = createClient()
  const [ideas, setIdeas] = useState<DateIdea[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const scope = spaceId
      ? supabase.from('date_ideas').select('*').eq('space_id', spaceId)
      : supabase.from('date_ideas').select('*').is('space_id', null)
    const { data } = await scope.order('created_at')
    setIdeas((data as DateIdea[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  async function addIdea(title: string, extra?: Partial<Pick<DateIdea, 'area' | 'energy' | 'price_range' | 'place_id' | 'notes' | 'tags'>>): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase.from('date_ideas')
      .insert({ user_id: user.id, space_id: spaceId, title, ...extra })
      .select().single()
    if (error) return error.message
    setIdeas(prev => [...prev, data as DateIdea])
    return null
  }

  async function update(id: string, fields: Partial<Pick<DateIdea, 'title' | 'status' | 'energy' | 'place_id' | 'tags' | 'notes' | 'area' | 'price_range'>>) {
    const { error } = await supabase.from('date_ideas')
      .update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
    if (!error) setIdeas(prev => prev.map(i => (i.id === id ? { ...i, ...fields } : i)))
  }

  async function removeIdea(id: string) {
    await supabase.from('date_ideas').delete().eq('id', id)
    setIdeas(prev => prev.filter(i => i.id !== id))
  }

  return { ideas, loading, addIdea, update, removeIdea }
}
