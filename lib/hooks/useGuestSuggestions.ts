'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface GuestSuggestion {
  id: string
  place: string
  why: string | null
  guestName: string | null
  createdAt: string
}

// Places a guest recommended (kind 'spot') across every gathering this space
// has hosted. Read-only review list — the host turns one into a real pin or
// dismisses it (status -> 'hidden'). Never a pin on its own.
export function useGuestSuggestions(spaceId: string | null) {
  const supabase = createClient()
  const [suggestions, setSuggestions] = useState<GuestSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!spaceId) { setSuggestions([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('guest_contributions')
      .select('id, guest_name, body, meta, created_at')
      .eq('space_id', spaceId)
      .eq('kind', 'spot')
      .eq('status', 'visible')
      .order('created_at', { ascending: false })
    setSuggestions(((data as { id: string; guest_name: string | null; body: string | null; meta: Record<string, unknown> | null; created_at: string }[] | null) ?? [])
      .map(r => ({
        id: r.id,
        place: String(r.meta?.place ?? '').trim() || 'A place',
        why: (r.body ?? '').trim() || null,
        guestName: r.guest_name,
        createdAt: r.created_at,
      })))
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  const dismiss = useCallback(async (id: string) => {
    setSuggestions(prev => prev.filter(s => s.id !== id))
    await supabase.from('guest_contributions').update({ status: 'hidden' }).eq('id', id)
  }, [supabase])

  return { suggestions, loading, dismiss, reload: load }
}
