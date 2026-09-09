'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface VillageRing {
  id: string
  space_id: string
  year: number
  note: string
  happened_on: string | null
  created_by: string | null
  created_at: string
}

// The archive tree carves a ring per year (2026-09-08). One row per year the
// household wants to mark; the note is what happened. Space-only, mirrors
// useMemoryLinks. `unique (space_id, year)` in the DB — writes upsert on that.
export function useVillageRings(spaceId: string | null) {
  const supabase = createClient()
  const [rings, setRings] = useState<VillageRing[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!spaceId) { setRings([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('village_rings').select('*').eq('space_id', spaceId).order('year')
    setRings((data as VillageRing[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  const setRing = useCallback(async (year: number, note: string, happenedOn?: string | null): Promise<string | null> => {
    if (!spaceId) return 'Pick a shared space first'
    const clean = note.trim()
    const { data: { user } } = await supabase.auth.getUser()
    if (!clean) {
      // An emptied note clears the ring.
      await supabase.from('village_rings').delete().eq('space_id', spaceId).eq('year', year)
      setRings(prev => prev.filter(r => r.year !== year))
      return null
    }
    const { data, error } = await supabase.from('village_rings')
      .upsert({ space_id: spaceId, year, note: clean, happened_on: happenedOn ?? null, created_by: user?.id ?? null },
        { onConflict: 'space_id,year' })
      .select().single()
    if (error) return error.message
    setRings(prev => {
      const row = data as VillageRing
      const rest = prev.filter(r => r.year !== year)
      return [...rest, row].sort((a, b) => a.year - b.year)
    })
    return null
  }, [supabase, spaceId])

  return { rings, loading, setRing, reload: load }
}
