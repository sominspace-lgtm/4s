'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Companion {
  id: string
  inviter_id: string
  invitee_email: string
  invitee_id: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export function useCompanions(userId: string) {
  const supabase = createClient()
  const [companions, setCompanions] = useState<Companion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('companions')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { setError(error.message); setLoading(false); return }
    setCompanions(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [userId])

  async function invite(email: string): Promise<string | null> {
    const { error } = await supabase
      .from('companions')
      .insert({ inviter_id: userId, invitee_email: email.toLowerCase().trim() })
    if (error) return error.message
    await load()
    return null
  }

  async function accept(id: string): Promise<void> {
    const { error } = await supabase
      .from('companions')
      .update({ status: 'accepted', invitee_id: userId })
      .eq('id', id)
    if (error) throw new Error(error.message)
    await load()
  }

  async function decline(id: string): Promise<void> {
    const { error } = await supabase
      .from('companions')
      .update({ status: 'declined' })
      .eq('id', id)
    if (error) throw new Error(error.message)
    await load()
  }

  async function remove(id: string): Promise<void> {
    const { error } = await supabase
      .from('companions')
      .delete()
      .eq('id', id)
    if (error) throw new Error(error.message)
    await load()
  }

  // Split into sent (I invited) and received (invited to me)
  const sent = companions.filter(c => c.inviter_id === userId)
  const received = companions.filter(c => c.invitee_id === userId || (c.status === 'pending' && c.inviter_id !== userId))
  const active = companions.filter(c => c.status === 'accepted')

  return { companions, sent, received, active, loading, error, invite, accept, decline, remove }
}
