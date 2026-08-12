import type { SupabaseClient } from '@supabase/supabase-js'
import type { HouseholdCaller } from '@/lib/household/resources'

// Shared scoping for the bot-facing trip/itinerary/budget routes under
// app/api/household/travel/*. These aren't in the flat RESOURCES allowlist
// (lib/household/resources.ts) because trips are NESTED data — an itinerary
// item's scope is its trip's scope, not a column on the item itself in the
// same way a flat table's space_id is. `[resource]/[id]` PATCH has no notion
// of "does this itinerary item belong to a trip in my space"; it would
// happily patch across the nesting boundary in a code path where RLS isn't
// running (the admin client). Every function here exists to close exactly
// that gap: resolve the trip first, refuse if it isn't the caller's, only
// then touch the child row.

export interface Trip {
  id: string
  user_id: string
  space_id: string | null
  title: string
  destination: string | null
  start_date: string | null
  end_date: string | null
  status: string
  notes: string | null
  budget_total: number | null
  currency: string
  created_at: string
  updated_at: string
}

export interface TripPlace {
  id: string
  trip_id: string
  place_id: string
  note: string | null
  created_at: string
  place: Record<string, unknown> | null
}

export interface ItineraryItem {
  id: string
  trip_id: string
  place_id: string | null
  title: string
  item_date: string | null
  time_label: string | null
  sort_order: number
  kind: string
  notes: string | null
  done: boolean
  created_at: string
}

export interface BudgetItem {
  id: string
  trip_id: string
  label: string
  category: string
  amount: number
  currency: string
  source: 'user' | 'ai-estimate'
  confidence: string | null
  estimate_basis: string | null
  paid: boolean
  created_at: string
}

export interface TripBundle {
  trip: Trip
  places: TripPlace[]
  itinerary: ItineraryItem[]
  budget: BudgetItem[]
}

/** Resolves a tripId to a Trip, but ONLY if it belongs to the caller's space
 *  — this is the single check every nested route must pass before touching
 *  a child row. Returns null for "not found" and "not yours" alike, on
 *  purpose: a bot token must not be able to distinguish the two by response
 *  shape (that would leak which trip ids exist in other households). */
export async function assertTripInSpace(
  admin: SupabaseClient, tripId: string, caller: HouseholdCaller,
): Promise<Trip | null> {
  const { data } = await admin
    .from('trips')
    .select('*')
    .eq('id', tripId)
    .eq('space_id', caller.spaceId)
    .maybeSingle()
  return (data as Trip | null) ?? null
}

/** One request, whole trip — Discord renders a trip in a single embed, and
 *  the bot's 8s default timeout can't absorb four sequential round trips. */
export async function loadTripBundle(
  admin: SupabaseClient, tripId: string, caller: HouseholdCaller,
): Promise<TripBundle | null> {
  const trip = await assertTripInSpace(admin, tripId, caller)
  if (!trip) return null

  const [placesRes, itineraryRes, budgetRes] = await Promise.all([
    admin.from('trip_places')
      .select('id, trip_id, place_id, note, created_at, place:places(id, name, kind, city, lat, lng)')
      .eq('trip_id', tripId).eq('space_id', caller.spaceId),
    admin.from('itinerary_items')
      .select('id, trip_id, place_id, title, item_date, time_label, sort_order, kind, notes, done, created_at')
      .eq('trip_id', tripId).eq('space_id', caller.spaceId)
      .order('item_date').order('sort_order'),
    admin.from('trip_budget_items')
      .select('id, trip_id, label, category, amount, currency, source, confidence, estimate_basis, paid, created_at')
      .eq('trip_id', tripId).eq('space_id', caller.spaceId)
      .order('created_at'),
  ])

  return {
    trip,
    places: (placesRes.data as unknown as TripPlace[] | null) ?? [],
    itinerary: (itineraryRes.data as ItineraryItem[] | null) ?? [],
    budget: (budgetRes.data as BudgetItem[] | null) ?? [],
  }
}

/** A place_id from a request body is untrusted until proven to be in the
 *  caller's space — same reasoning as assertTripInSpace, for the other
 *  direction (adding an existing place onto a trip). */
export async function assertPlaceInSpace(
  admin: SupabaseClient, placeId: string, caller: HouseholdCaller,
): Promise<boolean> {
  const { data } = await admin
    .from('places')
    .select('id')
    .eq('id', placeId)
    .eq('space_id', caller.spaceId)
    .maybeSingle()
  return !!data
}
