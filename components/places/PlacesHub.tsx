'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePlaces, type Place } from '@/lib/hooks/usePlaces'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import PinList from '@/components/places/PinList'
import PinFilters, { DEFAULT_PIN_FILTERS, applyPinFilters, type PinFilterState } from '@/components/places/PinFilters'
import PlaceSheet from '@/components/places/PlaceSheet'
import AddPlacePanel from '@/components/places/AddPlacePanel'

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

type SubTab = 'map' | 'pins'

const TABS: { id: SubTab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'pins', label: 'Pins' },
  // Trips (Phase 4) adds a third entry here without touching anything above.
]

// Places — "where are the places we care about?" The counterpart is Travel,
// which answers "where should we go next?" (Phase 4+). Deliberately its own
// top-level tab rather than a Household sub-tab: a full-bleed map needs the
// room, and burying it three levels down would mean nobody opens it casually.
export default function PlacesHub({ userId, theme }: { userId: string; theme: string }) {
  const { spaces } = useSharedSpaces(userId)
  const spaceId = spaces[0]?.id ?? null
  const { places, withLocation, withoutLocation, loading } = usePlaces()

  const [tab, setTab] = useState<SubTab>('map')
  const [filters, setFilters] = useState<PinFilterState>(DEFAULT_PIN_FILTERS)
  const [selected, setSelected] = useState<Place | null>(null)
  const [adding, setAdding] = useState(false)

  const kindsInUse = useMemo(() => Array.from(new Set(places.map(p => p.kind))), [places])
  const filtered = useMemo(() => applyPinFilters(places, filters), [places, filters])
  const filteredWithLocation = useMemo(() => applyPinFilters(withLocation, filters), [withLocation, filters])
  const filteredWithoutLocation = useMemo(() => applyPinFilters(withoutLocation, filters), [withoutLocation, filters])

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
        <button onClick={() => setAdding(true)} className="btn btn-primary press" style={{ fontSize: '0.72rem' }}>
          + Save a place
        </button>
      </div>

      <PinFilters filters={filters} kindsInUse={kindsInUse} onChange={setFilters} />

      {tab === 'map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ height: '52vh', minHeight: '320px' }}>
            <PlaceMap places={filteredWithLocation} theme={theme} onSelect={setSelected} />
          </div>
          {filteredWithoutLocation.length > 0 && (
            <div>
              <div style={{ fontSize: '0.68rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75, marginBottom: '0.3rem' }}>
                {filteredWithoutLocation.length} without a location
              </div>
              <PinList places={filteredWithoutLocation} onSelect={setSelected} />
            </div>
          )}
        </div>
      )}

      {tab === 'pins' && !loading && (
        <PinList places={filtered} onSelect={setSelected} />
      )}

      <PlaceSheet place={selected} open={!!selected} onClose={() => setSelected(null)} />
      <AddPlacePanel open={adding} spaceId={spaceId} hasSpace={spaces.length > 0} onClose={() => setAdding(false)} />
    </div>
  )
}
