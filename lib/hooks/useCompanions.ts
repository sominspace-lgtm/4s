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
  // Accepted rows where I'm the INVITEE only ever store MY OWN address in
  // invitee_email (the inviter typed it when they sent the invite) — the
  // inviter's email isn't in this table at all, only their uuid. Resolving it
  // needs the admin client, so it's fetched server-side via the same route
  // shared-with-me already uses for this exact lookup, keyed by companion id.
  const [friendEmails, setFriendEmails] = useState<Record<string, string>>({})
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

  async function loadFriendEmails() {
    const res = await fetch('/api/companions/shared-with-me').then(r => r.json()).catch(() => null)
    if (!res?.items) return
    const map: Record<string, string> = {}
    for (const item of res.items as { id: string; inviterEmail: string }[]) map[item.id] = item.inviterEmail
    setFriendEmails(map)
  }

  useEffect(() => { load(); loadFriendEmails() }, [userId])

  // useCompanions() runs independently in the Friends panel, the Shared hub,
  // and Brief — same pattern as the other hooks: broadcast on mutation so
  // every instance reloads instead of going stale.
  useEffect(() => {
    function onChanged() { load(); loadFriendEmails() }
    window.addEventListener('4s:companions-changed', onChanged)
    return () => window.removeEventListener('4s:companions-changed', onChanged)
  }, [userId])

  // The email that identifies "the other person" on a companion row, whichever
  // side of the invite you're on. Inviter's side: invitee_email already names
  // who you invited. Invitee's side: invitee_email is YOUR OWN address, so the
  // friend is resolved from friendEmails instead — falling back to
  // invitee_email only while that lookup is still in flight, never as a
  // silent wrong answer.
  function friendEmailOf(c: Companion): string {
    return c.inviter_id === userId ? c.invitee_email : (friendEmails[c.id] ?? c.invitee_email)
  }

  // The other person's user id, whichever side of the invite you're on. This
  // is not just a display concern like friendEmailOf: code that shares an
  // item "with c.invitee_id" on an invitee-side row targets YOUR OWN id
  // (that's what accept() sets it to), so a share meant for a friend who
  // invited you would silently share with yourself instead. Only meaningful
  // once accepted, since invitee_id is null until then.
  function friendIdOf(c: Companion): string | null {
    return c.inviter_id === userId ? c.invitee_id : c.inviter_id
  }

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

  return { companions, sent, received, active, loading, error, invite, accept, decline, remove, updateSharedSections, friendEmailOf, friendIdOf }
}
