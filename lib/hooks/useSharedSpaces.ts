'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SharedSpace {
  id: string
  name: string
  owner_id: string
  created_at: string
}

export interface SpaceMember {
  id: string
  space_id: string
  member_email: string
  member_id: string | null
  status: 'pending' | 'accepted'
  invited_by: string
}

// Backed by shared_spaces / shared_space_members — see
// supabase/migrations/shared_spaces_and_item_sharing.sql. If that migration
// hasn't been run yet, calls fail quietly and hooks return empty lists
// instead of crashing the dashboard.
export function useSharedSpaces(userId: string) {
  const supabase = createClient()
  const [spaces, setSpaces] = useState<SharedSpace[]>([])
  const [members, setMembers] = useState<SpaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(true) // false if the migration hasn't been run

  const load = useCallback(async () => {
    setLoading(true)
    const [spacesRes, membersRes] = await Promise.all([
      supabase.from('shared_spaces').select('*').order('created_at'),
      supabase.from('shared_space_members').select('*'),
    ])
    if (spacesRes.error) { setReady(false); setLoading(false); return }
    setSpaces(spacesRes.data ?? [])
    setMembers(membersRes.data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function createSpace(name: string): Promise<string | null> {
    const { data, error } = await supabase.from('shared_spaces').insert({ name, owner_id: userId }).select().single()
    if (error) return error.message
    setSpaces(prev => [...prev, data])
    return null
  }

  async function removeSpace(id: string) {
    await supabase.from('shared_spaces').delete().eq('id', id)
    setSpaces(prev => prev.filter(s => s.id !== id))
  }

  async function inviteMember(spaceId: string, email: string): Promise<string | null> {
    const { data, error } = await supabase.from('shared_space_members')
      .insert({ space_id: spaceId, member_email: email.toLowerCase().trim(), invited_by: userId })
      .select().single()
    if (error) return error.message
    setMembers(prev => [...prev, data])
    return null
  }

  async function removeMember(id: string) {
    await supabase.from('shared_space_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  function membersOf(spaceId: string) {
    return members.filter(m => m.space_id === spaceId)
  }

  return { spaces, members, loading, ready, createSpace, removeSpace, inviteMember, removeMember, membersOf }
}
