'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import type { CareSubject } from '@/lib/utils/careTypes'

export interface CareEntry {
  id: string
  user_id: string
  space_id: string | null
  subject: string
  kind: string
  note: string | null
  detail: string | null
  logged_at: string
  created_at: string
}

// The care log (see supabase/migrations/care_log.sql). 'somi' is stamped
// onto the household space so both partners see and add to it; 'self' is
// personal (space_id null). Same "one hook, cross-instance sync via a
// window event" shape as useEvents / useHabits.
export function useCareLog(subject: CareSubject) {
  const supabase = createClient()
  const { spaces, members } = useSharedSpaces('')
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id
    ?? spaces[0]?.id ?? null
  const shared = subject !== 'self'

  const [entries, setEntries] = useState<CareEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setEntries([]); setLoading(false); return }
    setLoading(true)
    let q = supabase.from('care_logs').select('*').eq('subject', subject).order('logged_at', { ascending: false }).limit(200)
    // Personal ('self') stays strictly this user's; 'somi' reads by space
    // so a partner's entries show too (RLS allows both, this narrows it).
    q = shared && spaceId ? q.eq('space_id', spaceId) : q.eq('user_id', user.id).is('space_id', null)
    const { data, error } = await q
    if (error) { setEntries([]); setLoading(false); return } // table missing = migration not run
    setEntries((data as CareEntry[] | null) ?? [])
    setLoading(false)
  }, [supabase, subject, shared, spaceId])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const onChanged = () => load()
    window.addEventListener('4s:care-changed', onChanged)
    return () => window.removeEventListener('4s:care-changed', onChanged)
  }, [load])

  const log = useCallback(async (kind: string, opts?: { note?: string; detail?: string; loggedAt?: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    if (shared && !spaceId) return { error: 'Set up a shared space first' }
    const row = {
      user_id: user.id,
      space_id: shared ? spaceId : null,
      subject,
      kind: kind.trim(),
      note: opts?.note?.trim() || null,
      detail: opts?.detail?.trim() || null,
      logged_at: opts?.loggedAt ?? new Date().toISOString(),
    }
    const { data, error } = await supabase.from('care_logs').insert(row).select().single()
    if (error) return { error: error.message }
    setEntries(prev => [data as CareEntry, ...prev].sort((a, b) => b.logged_at.localeCompare(a.logged_at)))
    window.dispatchEvent(new CustomEvent('4s:care-changed'))
    return { error: null }
  }, [supabase, subject, shared, spaceId])

  const remove = useCallback(async (id: string) => {
    const prev = entries
    setEntries(entries.filter(e => e.id !== id))
    const { error } = await supabase.from('care_logs').delete().eq('id', id)
    if (error) { setEntries(prev); return }
    window.dispatchEvent(new CustomEvent('4s:care-changed'))
  }, [supabase, entries])

  // Most recent entry per kind, and which kinds were logged today (local).
  const { lastByKind, doneToday } = useMemo(() => {
    const last: Record<string, CareEntry> = {}
    const today = new Set<string>()
    const todayStr = new Date().toDateString()
    for (const e of entries) {
      if (!last[e.kind]) last[e.kind] = e
      if (new Date(e.logged_at).toDateString() === todayStr) today.add(e.kind)
    }
    return { lastByKind: last, doneToday: today }
  }, [entries])

  return { entries, loading, log, remove, lastByKind, doneToday, canShare: !shared || !!spaceId }
}
