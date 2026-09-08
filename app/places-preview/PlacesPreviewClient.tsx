'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import MapPinPanel from '@/components/places/MapPinPanel'
import type { Place } from '@/lib/hooks/usePlaces'
import type { LngLatBounds } from '@/lib/utils/geo'

const PlaceMap = dynamic(() => import('@/components/places/PlaceMap'), { ssr: false })

export default function PlacesPreviewClient({ places, error }: { places: Place[]; error: string | null }) {
  const withLocation = places.filter(p => p.lat != null && p.lng != null)
  const [viewport, setViewport] = useState<LngLatBounds | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)

  const inView = useMemo(() => {
    if (!viewport) return withLocation
    return withLocation.filter(p =>
      p.lng! >= viewport.west && p.lng! <= viewport.east && p.lat! >= viewport.south && p.lat! <= viewport.north)
  }, [withLocation, viewport])

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', minHeight: '100vh', background: '#111', color: '#eee' }}>
      <div style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
        {error && <div style={{ color: 'salmon' }}>Query error: {error}</div>}
        Total places: {places.length} — with lat/lng: {withLocation.length} — in view: {inView.length}
      </div>
      <div style={{ position: 'relative', height: '80vh', border: '1px solid #444' }}>
        <PlaceMap
          places={withLocation}
          theme="forest"
          onSelect={p => setFocusId(p.id + ':' + Date.now())}
          onViewportChange={setViewport}
          focusPlaceId={focusId ? focusId.split(':')[0] : null}
        />
        <MapPinPanel
          places={inView}
          totalCount={withLocation.length}
          onSelect={p => setFocusId(p.id + ':' + Date.now())}
        />
      </div>
    </div>
  )
}
