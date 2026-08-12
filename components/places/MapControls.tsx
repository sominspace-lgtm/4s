'use client'

import type maplibregl from 'maplibre-gl'
import { boundsOf } from '@/lib/utils/geo'
import type { Place } from '@/lib/hooks/usePlaces'

// A themed control stack, built from plain buttons rather than MapLibre's
// IControl API — simpler to keep everything in React, and the app already
// re-skins MapLibre's own controls with the .places-map CSS block in
// globals.css if the built-in ones are ever added back for gesture parity.
export default function MapControls({ map, places }: {
  map: maplibregl.Map
  places: Place[]
}) {
  const btnStyle: React.CSSProperties = {
    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px',
    color: 'var(--text)', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1,
  }

  function fitToPins() {
    const bounds = boundsOf(places.map(p => ({ lat: p.lat!, lng: p.lng! })))
    if (bounds) map.fitBounds([[bounds.west, bounds.south], [bounds.east, bounds.north]], { padding: 40 })
  }

  function locate() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      map.easeTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 13 })
    })
  }

  return (
    <div style={{
      position: 'absolute', top: '0.7rem', right: '0.7rem', zIndex: 1,
      display: 'flex', flexDirection: 'column', gap: '0.35rem',
    }}>
      <button onClick={() => map.zoomIn()} className="press" style={btnStyle} aria-label="Zoom in">+</button>
      <button onClick={() => map.zoomOut()} className="press" style={btnStyle} aria-label="Zoom out">−</button>
      <button onClick={locate} className="press" style={btnStyle} aria-label="My location">◎</button>
      {places.length > 0 && (
        <button onClick={fitToPins} className="press" style={btnStyle} aria-label="Fit to pins">⤢</button>
      )}
    </div>
  )
}
