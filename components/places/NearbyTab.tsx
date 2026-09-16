'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePlaces, type Place } from '@/lib/hooks/usePlaces'
import { useLists } from '@/lib/hooks/useLists'
import type { Trip } from '@/lib/hooks/useTrips'
import { haversineKm, formatDistance } from '@/lib/utils/geo'
import { kindSpec, isBathroomIntent } from '@/lib/constants/placeKinds'
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

  // Which pins already have a saved bathroom code (PlaceBathroomCode.tsx
  // writes into this exact list) — used both to surface them on a bathroom-
  // intent search and to show the same 🚻 tag on the row without searching.
  const { lists } = useLists(spaceId)
  const codedPlaceIds = useMemo(() => {
    const codeList = lists.find(l => l.name.trim().toLowerCase() === 'bathroom codes')
    return new Set((codeList?.items ?? []).filter(i => i.place_id).map(i => i.place_id as string))
  }, [lists])

  const [query, setQuery] = useState('')
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

  const sortedByDistance = useMemo(() => {
    if (!origin) return []
    return withLocation
      .map(p => ({ place: p, km: haversineKm(origin, { lat: p.lat as number, lng: p.lng as number }) }))
      .sort((a, b) => a.km - b.km)
  }, [withLocation, origin])

  const nearest = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sortedByDistance.slice(0, 20)
    // Searching looks across every pin with a location, not just the
    // closest 20 — a match three streets further out shouldn't be hidden by
    // the default cap the way plain browsing is.
    const bathroomIntent = isBathroomIntent(q)
    return sortedByDistance.filter(({ place }) =>
      place.name.toLowerCase().includes(q) ||
      kindSpec(place.kind).label.toLowerCase().includes(q) ||
      (bathroomIntent && codedPlaceIds.has(place.id)),
    )
  }, [sortedByDistance, query, codedPlaceIds])

  // "Mark a pin here" — the quick path, not the full Add Place form
  // (AddPlacePanel geocodes a TYPED address; this already has real
  // coordinates from locate() above, so it reverse-geocodes instead — one
  // field to fill in, but the saved pin still gets a real address, never a
  // bare lat/lng pair standing in for one). A failed/slow lookup still saves
  // the pin — coordinates are always there for PlaceSheet to resolve later
  // (see its own self-healing effect), so a flaky geocoder is never the
  // reason "drop pin" doesn't work.
  async function markHere() {
    if (!origin || !markingName.trim()) return
    setMarking(true)
    const geo = await fetch(`/api/places/reverse-geocode?lat=${origin.lat}&lng=${origin.lng}`)
      .then(r => r.json()).catch(() => ({ found: false }))
    const { error: e } = await addPlace(
      {
        name: markingName.trim(), lat: origin.lat, lng: origin.lng, shared: markShared,
        ...(geo.found ? { address: geo.address, city: geo.city, country: geo.country } : {}),
      },
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
              <span className="t-label">{query.trim() ? 'Matching' : 'Closest first'}</span>
              <button onClick={locate} disabled={locating} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.66rem', padding: 0 }}>
                {locating ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>

            {/* Search by name, kind ("bathroom" finds every pin categorized
                that way), or a saved bathroom code on any pin at all. */}
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search nearby — try “bathroom”" style={{
                width: '100%', boxSizing: 'border-box', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
                padding: '0.45rem 0.65rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.76rem', outline: 'none',
                marginBottom: '0.5rem',
              }}
            />

            {nearest.length === 0 && (
              <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
                {query.trim() ? `Nothing nearby matches "${query.trim()}".` : 'Nothing pinned near here yet — mark one above.'}
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
                {codedPlaceIds.has(place.id) && (
                  <span title="Bathroom code saved" style={{ fontSize: '0.72rem', flexShrink: 0 }}>🚻</span>
                )}
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
