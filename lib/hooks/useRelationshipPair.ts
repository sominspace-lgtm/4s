'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface RelationshipPair {
  id: string
  requester_id: string
  partner_email: string
  partner_id: string | null
  status: 'pending' | 'confirmed'
  created_at: string
}

// The dual-consent gate for Companion sync — deliberately separate from
// useCompanions() (generic friends/task-sharing). Only the invited partner
// can move a pair from pending to confirmed (enforced by RLS, not just this
// hook), so this can never be a one-sided grant of access.
export function useRelationshipPair(userId: string, userEmail: string) {
  const supabase = createClient()
  const [pairs, setPairs] = useState<RelationshipPair[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('relationship_pairs')
      .select('*')
      .order('created_at', { ascending: false })
    setPairs(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:relationship-pair-changed', onChanged)
    return () => window.removeEventListener('4s:relationship-pair-changed', onChanged)
  }, [load])

  function notifyChanged() { window.dispatchEvent(new CustomEvent('4s:relationship-pair-changed')) }

  async function invite(email: string): Promise<string | null> {
    const { error } = await supabase
      .from('relationship_pairs')
      .insert({ requester_id: userId, partner_email: email.toLowerCase().trim() })
    if (error) return error.message
    await load(); notifyChanged(); return null
  }

  async function confirm(id: string): Promise<string | null> {
    const { error } = await supabase
      .from('relationship_pairs')
      .update({ status: 'confirmed', partner_id: userId })
      .eq('id', id)
    if (error) return error.message
    await load(); notifyChanged(); return null
  }

  async function remove(id: string): Promise<void> {
    await supabase.from('relationship_pairs').delete().eq('id', id)
    await load(); notifyChanged()
  }

  const confirmed = pairs.find(p => p.status === 'confirmed') ?? null
  const sentPending = pairs.filter(p => p.status === 'pending' && p.requester_id === userId)
  // Received: I'm the invited partner (matched by email, since partner_id
  // is only set once I confirm) and it's still pending my confirmation.
  const receivedPending = pairs.filter(p =>
    p.status === 'pending' && p.requester_id !== userId && p.partner_email.toLowerCase() === userEmail.toLowerCase()
  )

  return { pairs, confirmed, sentPending, receivedPending, loading, invite, confirm, remove }
}
