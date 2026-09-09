'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { GatheringMemory } from '@/lib/hooks/useGathering'

// The "Tonight at the Village" keepsakes from past gatherings, for the
// Household Reference tab (2026-09-10). A plain read of the same rows
// useGathering exposes, without its realtime channel or space-resolution
// side effects — the caller already has the space id.
export function useGatheringMemories(spaceId: string | null) {
  const supabase = createClient()
  const [memories, setMemories] = useState<GatheringMemory[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!spaceId) { setMemories([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('gathering_memories')
      .select('*')
      .eq('space_id', spaceId)
      .eq('status', 'visible')
      .order('happened_on', { ascending: false })
    setMemories((data as GatheringMemory[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  return { memories, loading, reload: load }
}
