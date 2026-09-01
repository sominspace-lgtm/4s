'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

export interface CalendarEvent {
  id: string
  title: string
  event_date: string   // YYYY-MM-DD
  /** Optional (2026-08-27, see supabase/migrations/events_time.sql) —
   *  'HH:MM' 24-hour, or null for an all-day event. Only week/day views
   *  place an event by this; month view and the agenda never needed it and
   *  still don't. No end-time/duration field — this app has never modeled
   *  duration anywhere, so a timed event renders as a single marker at its
   *  start time, not a block. */
  event_time: string | null
  notes: string | null
  space_id: string | null
  created_at: string
}

// Real table (see supabase/migrations/events.sql), unlike gifts/renewals
// which live in the user_prefs.layout JSON blob — events are simple enough
// (title + date) that a dedicated table with its own RLS is the more direct
// fit, same as work_items/buy_items, rather than growing the shared blob.
export function useEvents() {
  const [items, setItems] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Primary household space — stamped on every new event so it shows on the
  // partner's Household calendar. Own-calendar reads stay owner-scoped.
  const { spaces, members } = useSharedSpaces('')
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id
    ?? spaces[0]?.id ?? null

  const load = useCallback(async () => {
    setLoading(true)
    // Explicit owner filter (2026-08-27) — events_sharing.sql adds a second
    // RLS SELECT policy so a recipient can read a row shared with them.
    // Without this filter, an unqualified select * would now also return
    // events OTHER people shared with this user, quietly merging into
    // "my own events" here. This hook stays exactly what it always was;
    // shared-with-me events are useSharedEvents' job, below.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setItems([]); setLoading(false); return }
    const { data } = await supabase.from('events').select('*').eq('user_id', user.id).order('event_date')
    setItems((data as CalendarEvent[] | null) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Called independently from Calendar's month/agenda views — see
  // useWorkItems.ts for why cross-instance sync needs an event.
  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:events-changed', onChanged)
    return () => window.removeEventListener('4s:events-changed', onChanged)
  }, [load])

  function notifyChanged() { window.dispatchEvent(new CustomEvent('4s:events-changed')) }

  async function add(title: string, event_date: string, notes: string | null = null, event_time: string | null = null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in') }
    const { data, error } = await supabase.from('events')
      .insert({ user_id: user.id, title, event_date, notes, event_time, space_id: spaceId })
      .select().single()
    if (error) return { error }
    if (data) setItems(prev => [...prev, data as CalendarEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
    notifyChanged()
    return { error: null }
  }

  async function remove(id: string) {
    const prev = items
    setItems(items.filter(i => i.id !== id))
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) { setItems(prev); return { error } }
    notifyChanged()
    return { error: null }
  }

  // Create an event straight onto a specific household space — "made in
  // household" (2026-08-27): an event added from the Household calendar
  // belongs to that space, not privately to whoever clicked Add. Since
  // 2026-09-01 that's just a space_id on the row, no separate share record.
  async function addShared(title: string, event_date: string, forSpaceId: string, event_time: string | null = null, notes: string | null = null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in') }
    const { data, error } = await supabase.from('events')
      .insert({ user_id: user.id, title, event_date, notes, event_time, space_id: forSpaceId })
      .select().single()
    if (error) return { error }
    if (data) setItems(prev => [...prev, data as CalendarEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
    notifyChanged()
    return { error: null }
  }

  return { items, loading, add, addShared, remove }
}

// Every event on a household space — both partners' — for the Household
// calendar. Since 2026-09-01 an event just carries space_id; RLS
// (events_select_space) grants every accepted member the read.
export function useSharedEvents(spaceId: string | null) {
  const supabase = createClient()
  const [items, setItems] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!spaceId) { setItems([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase.from('events').select('*').eq('space_id', spaceId)
    if (error) { setItems([]); setLoading(false); return }
    setItems((data as CalendarEvent[]).sort((a, b) => a.event_date.localeCompare(b.event_date)))
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:events-changed', onChanged)
    return () => window.removeEventListener('4s:events-changed', onChanged)
  }, [load])

  return { items, loading }
}
