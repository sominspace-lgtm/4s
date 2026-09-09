'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// The fireflies guests drop on the pond (2026-09-09). They're `wish`-kind
// guest_contributions, but unlike the rest of the guest layer they persist
// forever and glow in the scene even with no gathering running — a slow
// record of everyone who's been over. Loaded by space, not by gathering,
// so the swarm is always there.
export interface VillageSpark {
  id: string
  glyph: string
  created_at: string
}

export function useVillageSparks(spaceId: string | null): VillageSpark[] {
  const supabase = createClient()
  const [sparks, setSparks] = useState<VillageSpark[]>([])

  const load = useCallback(async () => {
    if (!spaceId) { setSparks([]); return }
    const { data, error } = await supabase
      .from('guest_contributions')
      .select('id, meta, created_at')
      .eq('space_id', spaceId)
      .eq('kind', 'wish')
      .eq('status', 'visible')
      .order('created_at', { ascending: true })
      .limit(300)
    if (error) { setSparks([]); return } // migration not run yet
    setSparks((data ?? []).map(r => ({
      id: r.id as string,
      glyph: ((r.meta as Record<string, unknown>)?.glyph as string) || 'firefly',
      created_at: r.created_at as string,
    })))
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!spaceId) return
    const ch = supabase
      .channel(`village-sparks:${spaceId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'guest_contributions', filter: `space_id=eq.${spaceId}` },
        () => load())
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [supabase, spaceId, load])

  return sparks
}
