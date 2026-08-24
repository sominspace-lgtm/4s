'use client'

import dynamic from 'next/dynamic'
import type { Place } from '@/lib/hooks/usePlaces'

const PlaceMap = dynamic(() => import('@/components/places/PlaceMap'), { ssr: false })

export default function PlacesPreviewClient({ places, error }: { places: Place[]; error: string | null }) {
  const withLocation = places.filter(p => p.lat != null && p.lng != null)
  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: '100vh', background: '#111', color: '#eee' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {error && <div style={{ color: 'salmon' }}>Query error: {error}</div>}
        Total places: {places.length} — with lat/lng: {withLocation.length}
      </div>
      <div style={{ height: '80vh', border: '1px solid #444' }}>
        <PlaceMap places={withLocation} theme="forest" onSelect={p => console.log('selected', p.name)} />
      </div>
    </div>
  )
}
