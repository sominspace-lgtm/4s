'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
      .insert({ user_id: user.id, title, event_date, notes, event_time })
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

  // Create AND immediately share to a household space, in one call — "made
  // in household" (2026-08-27): an event added directly from the Household
  // calendar should show up for every member there, not sit privately under
  // whoever happened to click Add. Two inserts (events row, then its
  // shared_item_links row) rather than a DB trigger — same "two round
  // trips, no schema coupling" reasoning useSharedWorkItems' own header
  // comment already documents for the read side.
  async function addShared(title: string, event_date: string, spaceId: string, event_time: string | null = null, notes: string | null = null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in') }
    const { data, error } = await supabase.from('events')
      .insert({ user_id: user.id, title, event_date, notes, event_time })
      .select().single()
    if (error) return { error }
    const { error: shareError } = await supabase.from('shared_item_links')
      .insert({ owner_id: user.id, item_type: 'event', item_id: data.id, space_id: spaceId })
    if (shareError) return { error: shareError }
    if (data) setItems(prev => [...prev, data as CalendarEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
    notifyChanged()
    window.dispatchEvent(new CustomEvent('4s:item-sharing-changed:event'))
    return { error: null }
  }

  return { items, loading, add, addShared, remove }
}

// Events someone shared into a household space — the mirror of
// useSharedWorkItems (see its own header comment for why this is two round
// trips instead of one embedded query: shared_item_links.item_id is a loose
// polymorphic reference, not a foreign key). Both queries are covered by
// events_sharing.sql's RLS; no further schema change needed.
export function useSharedEvents(spaceId: string | null) {
  const supabase = createClient()
  const [items, setItems] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!spaceId) { setItems([]); setLoading(false); return }
    setLoading(true)
    const { data: links } = await supabase
      .from('shared_item_links')
      .select('item_id')
      .eq('item_type', 'event')
      .eq('space_id', spaceId)
    const ids = (links ?? []).map(l => l.item_id as string)
    if (ids.length === 0) { setItems([]); setLoading(false); return }
    const { data, error } = await supabase.from('events').select('*').in('id', ids)
    if (error) { setItems([]); setLoading(false); return }
    setItems((data as CalendarEvent[]).sort((a, b) => a.event_date.localeCompare(b.event_date)))
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:events-changed', onChanged)
    window.addEventListener('4s:item-sharing-changed:event', onChanged)
    return () => {
      window.removeEventListener('4s:events-changed', onChanged)
      window.removeEventListener('4s:item-sharing-changed:event', onChanged)
    }
  }, [load])

  return { items, loading }
}
