'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface HorizonPlace {
  id: string
  name: string
  first_visited_on: string
}

/**
 * Places you've actually been together, for the far horizon of the village.
 *
 * `space_id is not null` is the real "shared" test, not the status. usePlaces
 * deliberately loads personal and space pins in one list, so filtering on
 * status alone would put a solo user's private restaurants on a horizon that
 * is supposed to mean "somewhere we both went".
 *
 * Not built on usePlaces() for a second reason: that hook does select('*') and
 * pulls details and provenance jsonb plus photo paths, which is a lot of bytes
 * for what ends up as seven dots and a line.
 *
 * Returns [] for a solo user, and the scene draws nothing rather than drawing
 * an empty band. Absent, not empty.
 */
export function useSharedHorizon(enabled: boolean): HorizonPlace[] {
  const supabase = createClient()
  const [places, setPlaces] = useState<HorizonPlace[]>([])

  const load = useCallback(async () => {
    if (!enabled) { setPlaces([]); return }
    const { data } = await supabase
      .from('places')
      .select('id, name, first_visited_on')
      .eq('status', 'good')
      .not('space_id', 'is', null)
      .not('first_visited_on', 'is', null)
      .order('first_visited_on', { ascending: true })
      .limit(7)
    setPlaces((data as HorizonPlace[] | null) ?? [])
  }, [supabase, enabled])

  useEffect(() => { load() }, [load])

  return places
}
