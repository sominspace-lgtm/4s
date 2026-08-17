'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface MemoryLink {
  id: string
  space_id: string
  label: string
  url: string
  created_at: string
}

// One space can have several named links (Google Photos, iCloud, a shared
// Drive folder, whatever) — replaces the old single shared_spaces.memories_url
// field. Space-only, no personal variant: memories are inherently a shared
// concept the same way the old field already was.
export function useMemoryLinks(spaceId: string | null) {
  const supabase = createClient()
  const [links, setLinks] = useState<MemoryLink[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!spaceId) { setLinks([]); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('memory_links').select('*').eq('space_id', spaceId).order('created_at')
    setLinks((data as MemoryLink[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  async function addLink(label: string, url: string): Promise<string | null> {
    if (!spaceId) return 'Pick a shared space first'
    const { data, error } = await supabase.from('memory_links')
      .insert({ space_id: spaceId, label, url }).select().single()
    if (error) return error.message
    setLinks(prev => [...prev, data as MemoryLink])
    return null
  }

  async function removeLink(id: string) {
    await supabase.from('memory_links').delete().eq('id', id)
    setLinks(prev => prev.filter(l => l.id !== id))
  }

  return { links, loading, addLink, removeLink }
}
