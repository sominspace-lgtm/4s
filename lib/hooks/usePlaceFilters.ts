'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface PlaceFilter {
  id: string
  user_id: string
  space_id: string | null
  label: string
  center_place_id: string
  radius_km: number
  created_at: string
}

// Custom pin filters (2026-08-24) -- a saved, named radius around an
// existing pin ("Near Our Home", "Downtown SLO", whatever), so Places' map
// and pin list can be switched to show only what falls inside it. Same
// shared "for all" access as useDateIdeas -- either of you can add or
// remove a filter.
export function usePlaceFilters(spaceId: string | null) {
  const supabase = createClient()
  const [filters, setFilters] = useState<PlaceFilter[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const scope = spaceId
      ? supabase.from('place_filters').select('*').eq('space_id', spaceId)
      : supabase.from('place_filters').select('*').is('space_id', null)
    const { data } = await scope.order('created_at')
    setFilters((data as PlaceFilter[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  async function addFilter(label: string, centerPlaceId: string, radiusKm: number): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase.from('place_filters')
      .insert({ user_id: user.id, space_id: spaceId, label, center_place_id: centerPlaceId, radius_km: radiusKm })
      .select().single()
    if (error) return error.message
    setFilters(prev => [...prev, data as PlaceFilter])
    return null
  }

  async function removeFilter(id: string) {
    await supabase.from('place_filters').delete().eq('id', id)
    setFilters(prev => prev.filter(f => f.id !== id))
  }

  return { filters, loading, addFilter, removeFilter }
}
