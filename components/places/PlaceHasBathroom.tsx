'use client'

import { usePlaces, type Place } from '@/lib/hooks/usePlaces'

// The plain, code-free half of "bathroom" on a pin (2026-09-17) — just
// whether one exists here at all, for a park or a store where there's
// nothing to remember, no code to save. Independent of
// PlaceBathroomCode.tsx: this can be checked with no code ever saved, and
// saving a code there checks this automatically (a code implies a
// bathroom), but unchecking this must never touch or delete a saved code —
// it's a lighter flag sitting next to, not gating, the fuller feature.
export default function PlaceHasBathroom({ place }: { place: Place }) {
  const { updatePlace } = usePlaces()

  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: 'var(--text)', cursor: 'pointer' }}>
      <input
        type="checkbox"
        checked={place.has_bathroom}
        onChange={() => updatePlace(place.id, { has_bathroom: !place.has_bathroom })}
      />
      There&rsquo;s a bathroom here
    </label>
  )
}
