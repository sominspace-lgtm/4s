'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePlaces, type Place } from '@/lib/hooks/usePlaces'
import type { Trip } from '@/lib/hooks/useTrips'
import { haversineKm, formatDistance } from '@/lib/utils/geo'
import { kindSpec } from '@/lib/constants/placeKinds'
import PlaceSheet from '@/components/places/PlaceSheet'

const PlaceMap = dynamic(() => import('@/components/places/PlaceMap'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '0.75rem' }}>Loading map…</div>,
})

// Replaces the old Lists/Info tab (2026-09-23): what's actually useful while
// you're out is a map of what's around you, the same list as distance, and a
// one-tap way to save somewhere new before you forget — not a place to browse
// every saved list. Bathroom codes moved OUT entirely: they're saved through
// a pin's own detail sheet now (PlaceBathroomCode.tsx, opened by tapping a
// pin right here), never through a separate list-editing UI.
//
// Self-contained, same shape as TripsPanel: its own selection state and its
// own PlaceSheet instance, rather than reaching into PlacesHub's Map-tab
// state — tapping a pin here opens detail here, same as tapping a trip opens
// TripDetail there.
export default function NearbyTab({ spaceId, hasSpace, theme, sharedOnly = false, trips = [] }: {
  spaceId: string | null
  hasSpace: boolean
  theme: string
  sharedOnly?: boolean
  trips?: Trip[]
}) {
  const { withLocation: allWithLocation, addPlace } = usePlaces()
  const withLocation = useMemo(
    () => (sharedOnly ? allWithLocation.filter(p => p.space_id !== null) : allWithLocation),
    [allWithLocation, sharedOnly],
  )

  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => withLocation.find(p => p.id === selectedId) ?? null, [withLocation, selectedId])

  const [markingName, setMarkingName] = useState('')
  const [markShared, setMarkShared] = useState(false)
  const [marking, setMarking] = useState(false)

  function locate() {
    if (!navigator.geolocation) { setError("This browser can't share your location."); return }
    setLocating(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      pos => { setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false) },
      () => { setError("Couldn't get your location — check the browser's location permission."); setLocating(false) },
    )
  }

  const nearest = useMemo(() => {
    if (!origin) return []
    return withLocation
      .map(p => ({ place: p, km: haversineKm(origin, { lat: p.lat as number, lng: p.lng as number }) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 20)
  }, [withLocation, origin])

  // "Mark a pin here" — the quick path, not the full Add Place form
  // (AddPlacePanel geocodes a typed address; this uses the coordinates we
  // already have from locate() above, so it's one field, not several).
  async function markHere() {
    if (!origin || !markingName.trim()) return
    setMarking(true)
    const { error: e } = await addPlace(
      { name: markingName.trim(), lat: origin.lat, lng: origin.lng, shared: markShared },
      spaceId,
    )
    setMarking(false)
    if (!e) { setMarkingName(''); setMarkShared(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {!origin ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
          <button onClick={locate} disabled={locating} className="btn btn-secondary press" style={{ fontSize: '0.74rem' }}>
            {locating ? 'Finding you…' : '◎ Show what\'s nearby'}
          </button>
          {error && <div style={{ fontSize: '0.68rem', color: 'var(--rose)' }}>{error}</div>}
        </div>
      ) : (
        <>
          <div style={{ position: 'relative', height: '280px', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <PlaceMap places={nearest.map(n => n.place)} theme={theme} onSelect={p => setSelectedId(p.id)} />
          </div>

          {/* Mark a pin at wherever "here" was when we located you — the
              point of doing this here rather than the full Add Place flow
              is that there's nothing to fill in except a name. */}
          <div className="organic" style={{ padding: '0.8rem 0.9rem', border: '1px solid var(--border)', background: 'var(--hover-bg)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div className="t-label">Mark a pin here</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <input
                value={markingName} onChange={e => setMarkingName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') markHere() }}
                placeholder="What's here?" style={{
                  flex: 1, minWidth: '10rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
                  padding: '0.5rem 0.7rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.76rem', outline: 'none',
                }}
              />
              <button onClick={markHere} disabled={marking || !markingName.trim()} className="btn btn-primary press" style={{ fontSize: '0.72rem' }}>
                {marking ? 'Saving…' : 'Drop pin'}
              </button>
            </div>
            {hasSpace && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: 'var(--muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={markShared} onChange={e => setMarkShared(e.target.checked)} />
                Share with household
              </label>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span className="t-label">Closest first</span>
              <button onClick={locate} disabled={locating} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.66rem', padding: 0 }}>
                {locating ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {nearest.length === 0 && (
              <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
                Nothing pinned near here yet — mark one above.
              </div>
            )}

            {nearest.map(({ place, km }: { place: Place; km: number }) => (
              <button
                key={place.id}
                onClick={() => setSelectedId(place.id)}
                className="press"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', textAlign: 'left',
                  padding: '0.4rem 0', borderBottom: '1px solid var(--faint)', background: 'none', border: 'none', cursor: 'pointer',
                }}
              >
                <span style={{ color: `var(${kindSpec(place.kind).color})`, flexShrink: 0 }}>{kindSpec(place.kind).icon}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {place.name}
                </span>
                <span style={{ fontSize: '0.66rem', color: 'var(--muted)', flexShrink: 0 }}>{formatDistance(km)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      <PlaceSheet place={selected} open={!!selected} onClose={() => setSelectedId(null)} spaceId={spaceId} hasSpace={hasSpace} trips={trips} />
    </div>
  )
}
