'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { usePlaceFilters } from '@/lib/hooks/usePlaceFilters'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import PinList from '@/components/places/PinList'
import PinFilters, { DEFAULT_PIN_FILTERS, applyPinFilters, type PinFilterState } from '@/components/places/PinFilters'
import PlaceSheet from '@/components/places/PlaceSheet'
import AddPlacePanel from '@/components/places/AddPlacePanel'
import TripsPanel from '@/components/places/TripsPanel'
import TripDetail from '@/components/places/TripDetail'
import { useTrips, type Trip } from '@/lib/hooks/useTrips'

// Dynamic, ssr:false: maplibre-gl touches `window` at module scope and would
// hard-fail server rendering, and this keeps its ~230KB gzipped out of the
// dashboard's shared chunk — the other four tabs must not pay for a map they
// never load. See lib/map/style.ts and the implementation plan §5.3.
const PlaceMap = dynamic(() => import('@/components/places/PlaceMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
})

function MapSkeleton() {
  return (
    <div className="skeleton" style={{ height: '100%', minHeight: '260px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
  )
}

type SubTab = 'map' | 'pins' | 'trips'

const TABS: { id: SubTab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'pins', label: 'Pins' },
  { id: 'trips', label: 'Trips' },
]

// Places — "where are the places we care about?" Trips answers the other
// question, "where should we go next?" — a third sub-tab here rather than a
// tab of its own, since a trip's shortlist IS a set of these same pins.
// Deliberately its own top-level tab rather than a Household sub-tab: a
// full-bleed map needs the room, and burying it three levels down would mean
// nobody opens it casually.
export default function PlacesHub({ userId, theme, sharedOnly = false }: {
  userId: string
  theme: string
  /** Shared-device mode: show only pins and trips actually shared with the
   *  household, never personal ones. usePlaces/useTrips both return
   *  mine-or-a-space-I'm-in by RLS, so without this a private pin would
   *  surface on a screen anyone in the house can see. Same boundary the
   *  Household calendar already draws for trips. */
  sharedOnly?: boolean
}) {
  const { spaces } = useSharedSpaces(userId)
  const spaceId = spaces[0]?.id ?? null
  const { places: allPlaces, withLocation: allWithLocation, withoutLocation: allWithoutLocation, loading } = usePlaces()

  const shared = <T extends { space_id: string | null }>(rows: T[]) =>
    sharedOnly ? rows.filter(r => r.space_id !== null) : rows
  const places = useMemo(() => shared(allPlaces), [allPlaces, sharedOnly])
  const withLocation = useMemo(() => shared(allWithLocation), [allWithLocation, sharedOnly])
  const withoutLocation = useMemo(() => shared(allWithoutLocation), [allWithoutLocation, sharedOnly])

  const { filters: savedFilters, addFilter, removeFilter } = usePlaceFilters(spaceId)

  const [tab, setTab] = useState<SubTab>('map')
  const [filters, setFilters] = useState<PinFilterState>(DEFAULT_PIN_FILTERS)
  // An id, not a Place object — a stored object snapshot would go stale the
  // moment something (a photo upload, a note edit) changes the place while
  // the sheet is open, since usePlaces()'s own internal refresh wouldn't
  // touch a value sitting outside its state. Looking the place up fresh from
  // `places` every render means the open sheet always reflects live data.
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const selected = useMemo(() => places.find(p => p.id === selectedId) ?? null, [places, selectedId])

  const { trips: allTrips } = useTrips()
  const trips = useMemo(() => shared(allTrips), [allTrips, sharedOnly])
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId) ?? null, [trips, selectedTripId])

  const kindsInUse = useMemo(() => Array.from(new Set(places.map(p => p.kind))), [places])

  // Resolve the active saved radius filter (if any) to a center point —
  // looked up from allPlaces, not the already-filtered `places`, so a
  // filter's center pin still resolves even while other filters are narrowing
  // the visible set.
  const activeRadius = useMemo(() => {
    if (!filters.radiusFilterId) return null
    const f = savedFilters.find(sf => sf.id === filters.radiusFilterId)
    if (!f) return null
    const center = allPlaces.find(p => p.id === f.center_place_id)
    if (!center || center.lat == null || center.lng == null) return null
    return { lat: center.lat, lng: center.lng, km: f.radius_km }
  }, [filters.radiusFilterId, savedFilters, allPlaces])

  const filtered = useMemo(() => applyPinFilters(places, filters, activeRadius), [places, filters, activeRadius])
  const filteredWithLocation = useMemo(() => applyPinFilters(withLocation, filters, activeRadius), [withLocation, filters, activeRadius])
  const filteredWithoutLocation = useMemo(() => applyPinFilters(withoutLocation, filters, activeRadius), [withoutLocation, filters, activeRadius])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="tabs-wrap" style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap', background: 'var(--hover-bg)', borderRadius: '9px', padding: '0.25rem' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} className="btn press" style={{
              fontSize: '0.72rem', padding: '0.4em 0.9em',
              background: tab === tb.id ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
              color: tab === tb.id ? 'var(--gold)' : 'var(--muted)', border: 'none',
            }}>{tb.label}</button>
          ))}
        </div>
        {tab !== 'trips' && (
          <button onClick={() => setAdding(true)} className="btn btn-primary press" style={{ fontSize: '0.72rem' }}>
            + Save a place
          </button>
        )}
      </div>

      {tab !== 'trips' && (
        <PinFilters
          filters={filters}
          kindsInUse={kindsInUse}
          onChange={setFilters}
          savedFilters={savedFilters}
          placesWithLocation={withLocation}
          onAddFilter={(label, centerPlaceId, radiusKm) => addFilter(label, centerPlaceId, radiusKm)}
          onRemoveFilter={id => {
            if (filters.radiusFilterId === id) setFilters(f => ({ ...f, radiusFilterId: null }))
            removeFilter(id)
          }}
        />
      )}

      {tab === 'map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ height: '52vh', minHeight: '320px' }}>
            <PlaceMap places={filteredWithLocation} theme={theme} onSelect={p => setSelectedId(p.id)} />
          </div>
          {filteredWithoutLocation.length > 0 && (
            <div>
              <div style={{ fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75, marginBottom: '0.3rem' }}>
                {filteredWithoutLocation.length} without a location
              </div>
              <PinList places={filteredWithoutLocation} onSelect={p => setSelectedId(p.id)} />
            </div>
          )}
        </div>
      )}

      {tab === 'pins' && !loading && (
        <PinList places={filtered} onSelect={p => setSelectedId(p.id)} />
      )}

      {tab === 'trips' && (
        <TripsPanel spaceId={spaceId} hasSpace={spaces.length > 0} onSelect={t => setSelectedTripId(t.id)} sharedOnly={sharedOnly} />
      )}

      <PlaceSheet place={selected} open={!!selected} onClose={() => setSelectedId(null)} spaceId={spaceId} hasSpace={spaces.length > 0} />
      <AddPlacePanel open={adding} spaceId={spaceId} hasSpace={spaces.length > 0} onClose={() => setAdding(false)} />
      <TripDetail trip={selectedTrip} open={!!selectedTrip} onClose={() => setSelectedTripId(null)} />
    </div>
  )
}
