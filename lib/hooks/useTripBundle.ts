'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ItineraryKind = 'activity' | 'travel' | 'stay' | 'food' | 'note'

export interface ItineraryItem {
  id: string
  trip_id: string
  place_id: string | null
  title: string
  item_date: string | null
  time_label: string | null
  sort_order: number
  kind: ItineraryKind
  notes: string | null
  done: boolean
  created_at: string
}

export type BudgetCategory = 'flights' | 'stay' | 'food' | 'transport' | 'activities' | 'other'

export interface BudgetItem {
  id: string
  trip_id: string
  label: string
  category: BudgetCategory
  amount: number
  currency: string
  source: 'user' | 'ai-estimate'
  confidence: 'high' | 'medium' | 'low' | null
  estimate_basis: string | null
  paid: boolean
  created_at: string
}

export interface TripPlace {
  id: string
  trip_id: string
  place_id: string
  note: string | null
  created_at: string
  place: { id: string; name: string; kind: string; city: string | null } | null
}

// Everything under one trip, loaded together — mirrors the bot's
// loadTripBundle (lib/household/travel.ts) for the same reason: a trip
// detail view wants itinerary + budget + shortlist at once, not three
// separate loading states. Unlike the bot's version this goes straight
// through the browser Supabase client under RLS, not the bearer-token route
// — the web session already has its own auth, so there's no reason to route
// through the bot-facing API just to read the same own-or-space rows.
//
// spaceId is the TRIP's own space_id (Trip.space_id), not a general
// "current space" — it has to be threaded through to every insert below
// (2026-08-25 fix). Without it, every insert here only ever set user_id, so
// itinerary/budget/shortlist rows added to a SHARED trip were only visible
// to whoever happened to add them — the RLS policy on each of these three
// tables is `user_id = auth.uid() OR (space_id is not null AND
// is_space_member(...))`, so a null space_id silently drops the second
// branch and the row becomes invisible to the other partner.
export function useTripBundle(tripId: string | null, spaceId: string | null = null) {
  const supabase = createClient()
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([])
  const [budget, setBudget] = useState<BudgetItem[]>([])
  const [shortlist, setShortlist] = useState<TripPlace[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!tripId) { setItinerary([]); setBudget([]); setShortlist([]); setLoading(false); return }
    setLoading(true)
    const [itinRes, budgetRes, shortlistRes] = await Promise.all([
      supabase.from('itinerary_items').select('*').eq('trip_id', tripId).order('item_date').order('sort_order'),
      supabase.from('trip_budget_items').select('*').eq('trip_id', tripId).order('created_at'),
      supabase.from('trip_places').select('id, trip_id, place_id, note, created_at, place:places(id, name, kind, city)').eq('trip_id', tripId),
    ])
    setItinerary((itinRes.data as ItineraryItem[] | null) ?? [])
    setBudget((budgetRes.data as BudgetItem[] | null) ?? [])
    setShortlist((shortlistRes.data as unknown as TripPlace[] | null) ?? [])
    setLoading(false)
  }, [supabase, tripId])

  useEffect(() => { load() }, [load])

  async function addItineraryItem(fields: {
    title: string; item_date?: string | null; time_label?: string | null; kind?: ItineraryKind; notes?: string | null; place_id?: string | null
  }) {
    if (!tripId) return { error: 'No trip open' }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error: e } = await supabase.from('itinerary_items').insert({
      user_id: user.id, space_id: spaceId, trip_id: tripId,
      title: fields.title, item_date: fields.item_date ?? null, time_label: fields.time_label ?? null,
      kind: fields.kind ?? 'activity', notes: fields.notes ?? null, place_id: fields.place_id ?? null,
    })
    if (e) return { error: e.message }
    await load(); return { error: null }
  }

  async function updateItineraryItem(id: string, fields: Partial<Pick<ItineraryItem,
    'title' | 'item_date' | 'time_label' | 'sort_order' | 'kind' | 'notes' | 'done'
  >>) {
    const { error: e } = await supabase.from('itinerary_items').update(fields).eq('id', id)
    if (e) return { error: e.message }
    await load(); return { error: null }
  }

  async function removeItineraryItem(id: string) {
    const { error: e } = await supabase.from('itinerary_items').delete().eq('id', id)
    if (e) return { error: e.message }
    await load(); return { error: null }
  }

  async function addBudgetItem(fields: { label: string; category?: BudgetCategory; amount: number; currency?: string; paid?: boolean }) {
    if (!tripId) return { error: 'No trip open' }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    // source is always 'user' here — an AI-guessed number can only ever land
    // as 'ai-estimate' through the (not yet built) assistant's own validated
    // write path, never through this direct-entry form. See
    // supabase/migrations/places_travel.sql's note on trip_budget_items.source.
    const { error: e } = await supabase.from('trip_budget_items').insert({
      user_id: user.id, space_id: spaceId, trip_id: tripId, label: fields.label,
      category: fields.category ?? 'other', amount: fields.amount,
      currency: fields.currency ?? 'USD', source: 'user', paid: fields.paid ?? false,
    })
    if (e) return { error: e.message }
    await load(); return { error: null }
  }

  async function updateBudgetItem(id: string, fields: Partial<Pick<BudgetItem, 'label' | 'category' | 'amount' | 'paid'>>) {
    const { error: e } = await supabase.from('trip_budget_items').update(fields).eq('id', id)
    if (e) return { error: e.message }
    await load(); return { error: null }
  }

  async function removeBudgetItem(id: string) {
    const { error: e } = await supabase.from('trip_budget_items').delete().eq('id', id)
    if (e) return { error: e.message }
    await load(); return { error: null }
  }

  async function addToShortlist(placeId: string, note?: string | null) {
    if (!tripId) return { error: 'No trip open' }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error: e } = await supabase.from('trip_places')
      .upsert({ user_id: user.id, space_id: spaceId, trip_id: tripId, place_id: placeId, note: note ?? null }, { onConflict: 'trip_id,place_id' })
    if (e) return { error: e.message }
    await load(); return { error: null }
  }

  async function removeFromShortlist(placeId: string) {
    if (!tripId) return { error: 'No trip open' }
    const { error: e } = await supabase.from('trip_places').delete().eq('trip_id', tripId).eq('place_id', placeId)
    if (e) return { error: e.message }
    await load(); return { error: null }
  }

  const spentTotal = budget.filter(b => b.source === 'user' && b.paid).reduce((sum, b) => sum + Number(b.amount), 0)
  const plannedTotal = budget.filter(b => b.source === 'user').reduce((sum, b) => sum + Number(b.amount), 0)

  return {
    itinerary, budget, shortlist, loading, spentTotal, plannedTotal,
    addItineraryItem, updateItineraryItem, removeItineraryItem,
    addBudgetItem, updateBudgetItem, removeBudgetItem,
    addToShortlist, removeFromShortlist,
  }
}
