'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface ShareLink {
  id: string
  owner_id: string
  item_type: string
  item_id: string
  shared_with_user_id: string | null
  space_id: string | null
  permission: 'view' | 'edit'
}

// Generic per-item sharing, backed by shared_item_links (see
// supabase/migrations/shared_spaces_and_item_sharing.sql). Works for any
// item_type — currently wired into Work Hub tasks ('work_item').
export function useItemSharing(itemType: string, itemId: string) {
  const supabase = createClient()
  const [links, setLinks] = useState<ShareLink[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('shared_item_links').select('*').eq('item_type', itemType).eq('item_id', itemId)
    setLinks(data ?? [])
    setLoading(false)
  }, [supabase, itemType, itemId])

  useEffect(() => { load() }, [load])

  async function shareWithPerson(userId: string, permission: 'view' | 'edit' = 'view'): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase.from('shared_item_links')
      .insert({ owner_id: user.id, item_type: itemType, item_id: itemId, shared_with_user_id: userId, permission })
      .select().single()
    if (error) return error.message
    setLinks(prev => [...prev, data])
    return null
  }

  async function shareWithSpace(spaceId: string, permission: 'view' | 'edit' = 'view'): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error } = await supabase.from('shared_item_links')
      .insert({ owner_id: user.id, item_type: itemType, item_id: itemId, space_id: spaceId, permission })
      .select().single()
    if (error) return error.message
    setLinks(prev => [...prev, data])
    return null
  }

  async function stopSharing(linkId?: string) {
    if (linkId) {
      await supabase.from('shared_item_links').delete().eq('id', linkId)
      setLinks(prev => prev.filter(l => l.id !== linkId))
    } else {
      await supabase.from('shared_item_links').delete().eq('item_type', itemType).eq('item_id', itemId)
      setLinks([])
    }
  }

  return { links, loading, shareWithPerson, shareWithSpace, stopSharing }
}
