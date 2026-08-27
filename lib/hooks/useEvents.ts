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
    const { data } = await supabase.from('events').select('*').order('event_date')
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

  return { items, loading, add, remove }
}
