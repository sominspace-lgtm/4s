'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Companion {
  id: string
  inviter_id: string
  invitee_email: string
  invitee_id: string | null
  status: 'pending' | 'accepted' | 'declined'
  shared_sections: string[]
  created_at: string
}

export const SHAREABLE_SECTIONS = [
  { id: 'work',      label: 'Tasks',               note: 'Items you mark ⇆' },
  { id: 'habits',    label: 'Habits',              note: 'Habits you mark ⇆' },
  { id: 'capture',   label: 'Quick Add · Inbox',   note: 'Your idea inbox' },
  { id: 'domains',   label: 'All of Life',         note: 'Notes in all domains' },
  { id: 'wishlist',  label: 'Wishlist',            note: 'Your full wishlist' },
  { id: 'buylist',   label: 'Buy Again',           note: 'Items to buy' },
  { id: 'spending',  label: 'Renewals',            note: 'Monthly spending' },
]

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
    setCompanions((data ?? []).map(c => ({ ...c, shared_sections: c.shared_sections ?? [] })))
    setLoading(false)
  }

  useEffect(() => { load() }, [userId])

  // useCompanions() runs independently in the Friends panel, the Shared hub,
  // and Brief — same pattern as the other hooks: broadcast on mutation so
  // every instance reloads instead of going stale.
  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:companions-changed', onChanged)
    return () => window.removeEventListener('4s:companions-changed', onChanged)
  }, [userId])

  function notifyChanged() { window.dispatchEvent(new CustomEvent('4s:companions-changed')) }

  async function invite(email: string): Promise<string | null> {
    const { error } = await supabase
      .from('companions')
      .insert({ inviter_id: userId, invitee_email: email.toLowerCase().trim() })
    if (error) return error.message
    await load(); notifyChanged(); return null
  }

  async function accept(id: string): Promise<void> {
    const { error } = await supabase.from('companions').update({ status: 'accepted', invitee_id: userId }).eq('id', id)
    if (error) throw new Error(error.message)
    await load(); notifyChanged()
  }

  async function decline(id: string): Promise<void> {
    const { error } = await supabase.from('companions').update({ status: 'declined' }).eq('id', id)
    if (error) throw new Error(error.message)
    await load(); notifyChanged()
  }

  async function remove(id: string): Promise<void> {
    const { error } = await supabase.from('companions').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await load(); notifyChanged()
  }

  async function updateSharedSections(id: string, sections: string[]): Promise<void> {
    const { error } = await supabase.from('companions').update({ shared_sections: sections }).eq('id', id)
    if (error) throw new Error(error.message)
    setCompanions(prev => prev.map(c => c.id === id ? { ...c, shared_sections: sections } : c))
    notifyChanged()
  }

  const sent = companions.filter(c => c.inviter_id === userId)
  const received = companions.filter(c => c.invitee_id === userId || (c.status === 'pending' && c.inviter_id !== userId))
  const active = companions.filter(c => c.status === 'accepted')

  return { companions, sent, received, active, loading, error, invite, accept, decline, remove, updateSharedSections }
}
