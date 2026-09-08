'use client'

import { useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

// Drop a pin onto a trip's shortlist from anywhere (2026-09-09) — the
// PlaceSheet's "Add to a trip" without spinning up a full useTripBundle
// instance. Same upsert as useTripBundle.addToShortlist; the trip's own
// space_id rides along for RLS.
export function useAddToTrip() {
  const supabase = createClient()

  return useCallback(async (tripId: string, placeId: string, tripSpaceId: string | null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not signed in' }
    const { error } = await supabase.from('trip_places').upsert(
      { user_id: user.id, space_id: tripSpaceId, trip_id: tripId, place_id: placeId },
      { onConflict: 'trip_id,place_id' },
    )
    if (error) return { error: error.message }
    window.dispatchEvent(new CustomEvent('4s:trips-changed'))
    return { error: null }
  }, [supabase])
}
