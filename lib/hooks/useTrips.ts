'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type TripStatus = 'dreaming' | 'planning' | 'booked' | 'travelling' | 'done' | 'cancelled'

export interface Trip {
  id: string
  user_id: string
  space_id: string | null
  title: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  status: TripStatus
  notes: string | null
  budget_total: number | null
  currency: string
  created_at: string
  updated_at: string
}

export interface NewTripInput {
  title: string
  destination?: string | null
  start_date?: string | null
  end_date?: string | null
  notes?: string | null
  budget_total?: number | null
  shared?: boolean
}

// Same "no space filter at load time" idiom as usePlaces/useGoals — RLS
// already limits reads to mine-or-a-space-I'm-in, and a trip can be personal
// (space_id null, dreaming about a solo trip) or shared, same as a pin.
export function useTrips() {
  const supabase = createClient()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error: e } = await supabase
      .from('trips')
      .select('*')
      .order('start_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
    setError(e ? e.message : null)
    setTrips((data as Trip[] | null) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    function onChanged() { load() }
    window.addEventListener('4s:trips-changed', onChanged)
    return () => window.removeEventListener('4s:trips-changed', onChanged)
  }, [load])

  function notify() { window.dispatchEvent(new CustomEvent('4s:trips-changed')) }

  async function addTrip(input: NewTripInput, spaceId: string | null) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in', trip: null }
    const { data, error: e } = await supabase.from('trips').insert({
      user_id: user.id,
      space_id: input.shared ? spaceId : null,
      title: input.title,
      destination: input.destination ?? null,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      notes: input.notes ?? null,
      budget_total: input.budget_total ?? null,
    }).select().single()
    if (e) { setError(e.message); return { error: e.message, trip: null } }
    await load(); notify()
    return { error: null, trip: data as Trip }
  }

  async function updateTrip(id: string, fields: Partial<Pick<Trip,
    'title' | 'destination' | 'start_date' | 'end_date' | 'status' | 'notes' | 'budget_total'
  >>) {
    const { error: e } = await supabase.from('trips')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (e) { setError(e.message); return { error: e.message } }
    await load(); notify(); return { error: null }
  }

  async function removeTrip(id: string) {
    const { error: e } = await supabase.from('trips').delete().eq('id', id)
    if (e) { setError(e.message); return { error: e.message } }
    await load(); notify(); return { error: null }
  }

  return { trips, loading, error, addTrip, updateTrip, removeTrip }
}
