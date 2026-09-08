'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { usePlaceFilters } from '@/lib/hooks/usePlaceFilters'
import { usePlacePhotos } from '@/lib/hooks/usePlacePhotos'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useDateIdeas } from '@/lib/hooks/useDateIdeas'
import { kindSpec } from '@/lib/constants/placeKinds'
import MapPinPanel from '@/components/places/MapPinPanel'
import PinFilters, { DEFAULT_PIN_FILTERS, applyPinFilters, type PinFilterState } from '@/components/places/PinFilters'
import PlaceSheet from '@/components/places/PlaceSheet'
import AddPlacePanel from '@/components/places/AddPlacePanel'
import TripsPanel from '@/components/places/TripsPanel'
import TripDetail from '@/components/places/TripDetail'
import { useTrips } from '@/lib/hooks/useTrips'
import type { LngLatBounds } from '@/lib/utils/geo'

// Dynamic, ssr:false: maplibre-gl touches `window` at module scope and would
// hard-fail server rendering, and this keeps its ~230KB gzipped out of the
// dashboard's shared chunk.
const PlaceMap = dynamic(() => import('@/components/places/PlaceMap'), {
  ssr: false,
  loading: () => <MapSkeleton />,
})

function MapSkeleton() {
  return (
    <div className="skeleton" style={{ height: '100%', minHeight: '260px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
  )
}

// 'pins' is a legacy alias kept so an old deep link still resolves.
type ForcedTab = 'map' | 'pins' | 'trips'

// Three starter suggestions for a brand-new pin collection (2026-09-09).
const STARTERS: { kind: string; label: string }[] = [
  { kind: 'cafe', label: 'Add a coffee spot' },
  { kind: 'gym', label: 'Add your gym' },
  { kind: 'park', label: 'Add a park nearby' },
]

// Places — the map is the home surface (2026-09-09): a docked pin list under
// it that narrows to what's on screen, chip filters up top, and Trips as its
// own pill for "where should we go next".
export default function PlacesHub({ userId, theme, sharedOnly = false, forcedTab }: {
  userId: string
  theme: string
  sharedOnly?: boolean
  forcedTab?: ForcedTab
}) {
  const { spaces, members } = useSharedSpaces(userId)
  // The space the household actually uses — the one with an accepted member,
  // not spaces[0] (which can be an empty solo space).
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id
    ?? spaces[0]?.id ?? null
  const { places: allPlaces, withLocation: allWithLocation, withoutLocation: allWithoutLocation, loading } = usePlaces()
  const { ideas } = useDateIdeas(spaceId)

  const shared = <T extends { space_id: string | null }>(rows: T[]) =>
    sharedOnly ? rows.filter(r => r.space_id !== null) : rows
  const places = useMemo(() => shared(allPlaces), [allPlaces, sharedOnly])
  const withLocation = useMemo(() => shared(allWithLocation), [allWithLocation, sharedOnly])
  const withoutLocation = useMemo(() => shared(allWithoutLocation), [allWithoutLocation, sharedOnly])

  const { filters: savedFilters, addFilter, removeFilter } = usePlaceFilters(spaceId)

  const tab: 'map' | 'trips' = forcedTab === 'trips' ? 'trips' : 'map'
  const [filters, setFilters] = useState<PinFilterState>(DEFAULT_PIN_FILTERS)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [adding, setAdding] = useState<{ kind?: string } | null>(null)
  const [viewport, setViewport] = useState<LngLatBounds | null>(null)
  const selected = useMemo(() => places.find(p => p.id === selectedId) ?? null, [places, selectedId])

  const { trips: allTrips } = useTrips()
  const trips = useMemo(() => shared(allTrips), [allTrips, sharedOnly])
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const selectedTrip = useMemo(() => trips.find(t => t.id === selectedTripId) ?? null, [trips, selectedTripId])

  const dateIdeaIds = useMemo(
    () => new Set(ideas.filter(i => i.place_id).map(i => i.place_id as string)),
    [ideas],
  )

  const kindsInUse = useMemo(() => Array.from(new Set(places.map(p => p.kind))), [places])
  const tagsInUse = useMemo(() => Array.from(new Set(places.flatMap(p => p.tags))).sort(), [places])

  const activeRadius = useMemo(() => {
    if (!filters.radiusFilterId) return null
    const f = savedFilters.find(sf => sf.id === filters.radiusFilterId)
    if (!f) return null
    const center = allPlaces.find(p => p.id === f.center_place_id)
    if (!center || center.lat == null || center.lng == null) return null
    return { lat: center.lat, lng: center.lng, km: f.radius_km }
  }, [filters.radiusFilterId, savedFilters, allPlaces])

  const dateIdeaFilter = <T extends { id: string }>(rows: T[]) =>
    filters.dateIdeaOnly ? rows.filter(r => dateIdeaIds.has(r.id)) : rows

  const filteredWithLocation = useMemo(
    () => dateIdeaFilter(applyPinFilters(withLocation, filters, activeRadius)),
    [withLocation, filters, activeRadius, dateIdeaIds],
  )
  const filteredWithoutLocation = useMemo(
    () => dateIdeaFilter(applyPinFilters(withoutLocation, filters, activeRadius)),
    [withoutLocation, filters, activeRadius, dateIdeaIds],
  )
  const filteredAll = useMemo(
    () => dateIdeaFilter(applyPinFilters(places, filters, activeRadius)),
    [places, filters, activeRadius, dateIdeaIds],
  )

  const thumbs = usePlacePhotos(filteredAll)

  // Pins actually on screen right now (plus every no-location pin, which
  // has nowhere to be on the map but still belongs in the list).
  const inView = useMemo(() => {
    if (!viewport) return filteredWithLocation
    return filteredWithLocation.filter(p =>
      p.lng! >= viewport.west && p.lng! <= viewport.east && p.lat! >= viewport.south && p.lat! <= viewport.north)
  }, [filteredWithLocation, viewport])
  const panelPlaces = useMemo(() => [...inView, ...filteredWithoutLocation], [inView, filteredWithoutLocation])

  function openPin(id: string) {
    setSelectedId(id)
    setFocusId(id + ':' + Date.now()) // force the effect even for the same pin
  }
  const focusPlaceId = focusId ? focusId.split(':')[0] : null

  const chip = (active: boolean, color?: string): React.CSSProperties => ({
    fontSize: '0.66rem', padding: '0.3rem 0.65rem', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${active ? (color ?? 'var(--gold)') : 'var(--border)'}`,
    background: active ? `color-mix(in srgb, ${color ?? 'var(--gold)'} 14%, transparent)` : 'transparent',
    color: active ? (color ?? 'var(--gold)') : 'var(--muted)', whiteSpace: 'nowrap',
  })

  const showStarters = !loading && places.length === 0 && tab === 'map'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: '0.8rem' }}>
        {tab === 'map' && (
          <button onClick={() => setAdding({})} className="btn btn-primary press" style={{ fontSize: '0.72rem' }}>
            + Save a place
          </button>
        )}
      </div>

      {tab === 'map' && !showStarters && (
        <>
          {/* Always-visible chip row — kind, Near us, Date ideas. The full
              search / status / saved-area drawer stays below. */}
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
            <button onClick={() => setFilters(f => ({ ...f, nearbyOnly: !f.nearbyOnly }))} className="press" style={chip(filters.nearbyOnly)}>
              Near us
            </button>
            {dateIdeaIds.size > 0 && (
              <button onClick={() => setFilters(f => ({ ...f, dateIdeaOnly: !f.dateIdeaOnly }))} className="press" style={chip(filters.dateIdeaOnly, 'var(--rose)')}>
                ♥ Date ideas
              </button>
            )}
            {kindsInUse.map(k => {
              const spec = kindSpec(k)
              const active = filters.kind === k
              return (
                <button key={k} onClick={() => setFilters(f => ({ ...f, kind: active ? null : k }))} className="press" style={chip(active, `var(${spec.color})`)}>
                  <span aria-hidden style={{ marginRight: '0.25rem' }}>{spec.icon}</span>{spec.label}
                </button>
              )
            })}
          </div>

          <PinFilters
            filters={filters}
            kindsInUse={kindsInUse}
            tagsInUse={tagsInUse}
            onChange={setFilters}
            savedFilters={savedFilters}
            placesWithLocation={withLocation}
            onAddFilter={(label, centerPlaceId, radiusKm) => addFilter(label, centerPlaceId, radiusKm)}
            onRemoveFilter={id => {
              if (filters.radiusFilterId === id) setFilters(f => ({ ...f, radiusFilterId: null }))
              removeFilter(id)
            }}
          />
        </>
      )}

      {tab === 'map' && showStarters && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>No places saved yet.</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>
            Pin the spots you don&rsquo;t want to have to remember. Start with one:
          </div>
          {STARTERS.map(s => (
            <button key={s.kind} onClick={() => setAdding({ kind: s.kind })} className="press" style={{
              textAlign: 'left', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '0.8rem 1rem', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', color: 'var(--text)',
            }}>
              <span aria-hidden style={{ color: `var(${kindSpec(s.kind).color})`, marginRight: '0.5rem' }}>{kindSpec(s.kind).icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'map' && !showStarters && (
        <div style={{ position: 'relative', height: 'min(68vh, 620px)', minHeight: '380px' }}>
          <PlaceMap
            places={filteredWithLocation}
            theme={theme}
            onSelect={p => openPin(p.id)}
            onViewportChange={setViewport}
            focusPlaceId={focusPlaceId}
          />
          <MapPinPanel
            places={panelPlaces}
            totalCount={filteredWithLocation.length + filteredWithoutLocation.length}
            onSelect={p => openPin(p.id)}
            thumbs={thumbs}
            dateIdeaIds={dateIdeaIds}
          />
        </div>
      )}

      {tab === 'trips' && (
        <TripsPanel spaceId={spaceId} hasSpace={spaces.length > 0} onSelect={t => setSelectedTripId(t.id)} sharedOnly={sharedOnly} />
      )}

      <PlaceSheet place={selected} open={!!selected} onClose={() => setSelectedId(null)} spaceId={spaceId} hasSpace={spaces.length > 0} trips={trips} />
      <AddPlacePanel open={!!adding} initialKind={adding?.kind} spaceId={spaceId} hasSpace={spaces.length > 0} onClose={() => setAdding(null)} />
      <TripDetail trip={selectedTrip} open={!!selectedTrip} onClose={() => setSelectedTripId(null)} />
    </div>
  )
}
