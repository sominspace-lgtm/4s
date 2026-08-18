'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SharedSpace {
  id: string
  name: string
  owner_id: string
  created_at: string
  memories_url: string | null
}

export interface SpaceMember {
  id: string
  space_id: string
  member_email: string
  member_id: string | null
  status: 'pending' | 'accepted'
  invited_by: string
  role: 'owner' | 'member'
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

  async function setMemoriesUrl(id: string, url: string | null): Promise<string | null> {
    const { error } = await supabase.from('shared_spaces').update({ memories_url: url }).eq('id', id)
    if (error) return error.message
    setSpaces(prev => prev.map(s => (s.id === id ? { ...s, memories_url: url } : s)))
    return null
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

  // Accepting binds the pending row to your account and makes you a full
  // co-owner (see the migration for why 'owner' — this isn't a
  // capability-restriction system, every accepted member has always been
  // able to do everything the space allows; role just names that honestly).
  async function acceptInvite(id: string): Promise<string | null> {
    const { data, error } = await supabase.from('shared_space_members')
      .update({ member_id: userId, status: 'accepted', role: 'owner' })
      .eq('id', id).select().single()
    if (error) return error.message
    setMembers(prev => prev.map(m => (m.id === id ? data : m)))
    await load() // the newly-joined space itself is now visible too
    return null
  }

  async function declineInvite(id: string) {
    await supabase.from('shared_space_members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  function membersOf(spaceId: string) {
    return members.filter(m => m.space_id === spaceId)
  }

  // Pending invites addressed to this email, not yet claimed by anyone —
  // RLS now surfaces these (see shared_space_roles_and_accept.sql) even
  // though the invitee isn't a member yet.
  function invitesFor(email: string) {
    const lower = email.toLowerCase()
    return members.filter(m => m.status === 'pending' && !m.member_id && m.member_email.toLowerCase() === lower)
  }

  return {
    spaces, members, loading, ready,
    createSpace, removeSpace, setMemoriesUrl,
    inviteMember, removeMember, acceptInvite, declineInvite, membersOf, invitesFor,
  }
}
