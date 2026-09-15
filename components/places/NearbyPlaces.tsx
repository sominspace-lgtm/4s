'use client'

import { useState } from 'react'
import { usePlaces, type Place } from '@/lib/hooks/usePlaces'
import { haversineKm, formatDistance } from '@/lib/utils/geo'
import { kindSpec } from '@/lib/constants/placeKinds'

// "What's nearby" (2026-09-23) — the other half of Places → Info alongside
// Bathroom codes. Live distance from wherever you're standing right now to
// every pin you already have, closest first. Not a places-search/discovery
// feature (no new API, no results beyond pins you've already saved) — it
// answers "what do we already know about around here", which is the useful
// question when you're actually out and checking your phone.
//
// One-shot getCurrentPosition, same call MapControls.tsx's locate button
// already uses — no watchPosition, since this is "where am I right now",
// checked once per visit, not a live-updating tracker.
export default function NearbyPlaces() {
  const { withLocation } = usePlaces()
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  function findNearby() {
    if (!navigator.geolocation) { setError("This browser can't share your location."); return }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => { setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => { setError("Couldn't get your location — check the browser's location permission."); setLocating(false) },
    )
  }

  if (!origin) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
        <button onClick={findNearby} disabled={locating} className="btn btn-secondary press" style={{ fontSize: '0.72rem' }}>
          {locating ? 'Finding you…' : '◎ What\'s nearby'}
        </button>
        {error && <div style={{ fontSize: '0.68rem', color: 'var(--rose)' }}>{error}</div>}
      </div>
    )
  }

  const sorted = withLocation
    .map(p => ({ place: p, km: haversineKm(origin, { lat: p.lat as number, lng: p.lng as number }) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 15)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>Closest first</span>
        <button onClick={findNearby} disabled={locating} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.64rem', padding: 0 }}>
          {locating ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {sorted.length === 0 && (
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          No pinned places have a location yet.
        </div>
      )}

      {sorted.map(({ place, km }: { place: Place; km: number }) => (
        <div key={place.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid var(--faint)' }}>
          <span style={{ color: `var(${kindSpec(place.kind).color})`, flexShrink: 0 }}>{kindSpec(place.kind).icon}</span>
          <span style={{ flex: 1, minWidth: 0, fontSize: '0.76rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {place.name}
          </span>
          <span style={{ fontSize: '0.66rem', color: 'var(--muted)', flexShrink: 0 }}>{formatDistance(km)}</span>
        </div>
      ))}
    </div>
  )
}
