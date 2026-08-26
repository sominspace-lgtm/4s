'use client'

import { useState } from 'react'
import { kindSpec, KIND_ORDER } from '@/lib/constants/placeKinds'
import type { Place, PlaceStatus } from '@/lib/hooks/usePlaces'
import type { PlaceFilter } from '@/lib/hooks/usePlaceFilters'
import { haversineKm } from '@/lib/utils/geo'
import Icon, { type IconName } from '@/components/ui/Icon'

export interface PinFilterState {
  query: string
  kind: string | null
  status: PlaceStatus | null
  /** Multi-select — 'nearby', 'hidden-gem', or any freeform tag a pin carries. Matches if a pin has ANY of these (2026-08-24). */
  tags: string[]
  /** Active saved radius filter's id (see PlaceFilter) — 'null' means show everything. */
  radiusFilterId: string | null
}

export const DEFAULT_PIN_FILTERS: PinFilterState = { query: '', kind: null, status: null, tags: [], radiusFilterId: null }

const STATUS_CHIPS: { id: PlaceStatus; label: string; icon?: IconName }[] = [
  { id: 'idea', label: 'Want to go' },
  { id: 'good', label: 'Good', icon: 'thumbsUp' },
  { id: 'hmm', label: 'Hmm', icon: 'shrug' },
  { id: 'bad', label: 'Not again', icon: 'thumbsDown' },
]

const inputStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
  padding: '0.3rem 0.55rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', outline: 'none',
}

export default function PinFilters({ filters, kindsInUse, tagsInUse, onChange, savedFilters, placesWithLocation, onAddFilter, onRemoveFilter }: {
  filters: PinFilterState
  kindsInUse: string[]
  tagsInUse: string[]
  onChange: (next: PinFilterState) => void
  /** Custom named radius filters ("Near Our Home", "Downtown SLO", …), see usePlaceFilters. */
  savedFilters: PlaceFilter[]
  /** Candidates for a new filter's center — must already have a pin (lat/lng). */
  placesWithLocation: Place[]
  onAddFilter: (label: string, centerPlaceId: string, radiusKm: number) => void
  onRemoveFilter: (id: string) => void
}) {
  const availableKinds = KIND_ORDER.filter(k => kindsInUse.includes(k))
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [centerId, setCenterId] = useState('')
  const [radiusKm, setRadiusKm] = useState('3')
  // Collapsed by default (2026-08-24) — search + status + kind + tag + area
  // chips is a lot of vertical space to spend before the map even shows.
  // Stays open automatically once a filter is active, since that's exactly
  // the moment you need to see (and clear) what's narrowing the pins.
  const activeCount = (filters.kind ? 1 : 0) + (filters.status ? 1 : 0) + filters.tags.length + (filters.radiusFilterId ? 1 : 0) + (filters.query.trim() ? 1 : 0)
  const [open, setOpen] = useState(activeCount > 0)

  const chipStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.68rem', padding: '0.35rem 0.7rem',
    background: active ? 'color-mix(in srgb, var(--gold) 14%, transparent)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--muted)',
    border: '1px solid var(--border)',
  })

  function save() {
    const km = parseFloat(radiusKm)
    if (!label.trim() || !centerId || !(km > 0)) return
    onAddFilter(label.trim(), centerId, km)
    setLabel(''); setCenterId(''); setRadiusKm('3'); setAdding(false)
  }

  const activeSummary: string[] = []
  if (filters.query.trim()) activeSummary.push(`"${filters.query.trim()}"`)
  if (filters.status) activeSummary.push(STATUS_CHIPS.find(s => s.id === filters.status)?.label ?? filters.status)
  if (filters.kind) activeSummary.push(kindSpec(filters.kind).label)
  activeSummary.push(...filters.tags.map(t => `#${t}`))
  if (filters.radiusFilterId) activeSummary.push(savedFilters.find(f => f.id === filters.radiusFilterId)?.label ?? 'area')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button onClick={() => setOpen(v => !v)} className="press" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '0.76rem',
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-body)',
        }}>
          <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>{open ? '▾' : '▸'}</span>
          <Icon name="search" size={12} /> Search &amp; filters
          {activeCount > 0 && (
            <span style={{
              fontSize: '0.6rem', color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 14%, transparent)',
              borderRadius: '99px', padding: '0.1em 0.55em',
            }}>{activeCount}</span>
          )}
        </button>
        {!open && activeSummary.length > 0 && (
          <span style={{ fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.75 }}>{activeSummary.join(' · ')}</span>
        )}
        {activeCount > 0 && (
          <button onClick={() => onChange(DEFAULT_PIN_FILTERS)} className="press"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.7, fontSize: '0.66rem' }}>
            Clear all
          </button>
        )}
      </div>

      {open && <>
      <input
        value={filters.query}
        onChange={e => onChange({ ...filters, query: e.target.value })}
        placeholder="Search saved places…"
        style={{
          background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
          color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
          padding: '0.5rem 0.7rem', outline: 'none', width: '100%',
        }}
      />

      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
        {STATUS_CHIPS.map(s => (
          <button
            key={s.id}
            onClick={() => onChange({ ...filters, status: filters.status === s.id ? null : s.id })}
            className="btn press"
            style={{ ...chipStyle(filters.status === s.id), display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
          >
            {s.icon && <Icon name={s.icon} size={11} />}
            {s.label}
          </button>
        ))}
      </div>

      {availableKinds.length > 1 && (
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {availableKinds.map(k => {
            const spec = kindSpec(k)
            return (
              <button
                key={k}
                onClick={() => onChange({ ...filters, kind: filters.kind === k ? null : k })}
                className="btn press"
                style={chipStyle(filters.kind === k)}
              >
                <span aria-hidden style={{ marginRight: '0.3rem' }}>{spec.icon}</span>{spec.label}
              </button>
            )
          })}
        </div>
      )}

      {tagsInUse.length > 0 && (
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {tagsInUse.map(t => {
            const active = filters.tags.includes(t)
            return (
              <button
                key={t}
                onClick={() => onChange({ ...filters, tags: active ? filters.tags.filter(x => x !== t) : [...filters.tags, t] })}
                className="btn press"
                style={chipStyle(active)}
              >
                #{t}
              </button>
            )
          })}
        </div>
      )}

      {/* Custom "near a place" filters (2026-08-24) — e.g. "Near Our Home":
          a saved radius around an existing pin, so the map/list can be
          switched to show only what falls inside it. */}
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {savedFilters.map(f => (
          <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button
              onClick={() => onChange({ ...filters, radiusFilterId: filters.radiusFilterId === f.id ? null : f.id })}
              className="btn press"
              style={{ ...chipStyle(filters.radiusFilterId === f.id), borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <Icon name="pin" size={10} /> {f.label} <span style={{ opacity: 0.6 }}>({f.radius_km}km)</span>
            </button>
            <button
              onClick={() => onRemoveFilter(f.id)}
              aria-label={`Remove ${f.label} filter`}
              className="press"
              style={{ ...chipStyle(false), borderTopLeftRadius: 0, borderBottomLeftRadius: 0, padding: '0.35rem 0.5rem', opacity: 0.6 }}
            >✕</button>
          </span>
        ))}

        {adding ? (
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.35rem 0.5rem' }}>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Name (e.g. Near Our Home)" style={{ ...inputStyle, width: '150px' }} autoFocus />
            <select value={centerId} onChange={e => setCenterId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer', maxWidth: '150px' }}>
              <option value="">Centered on…</option>
              {placesWithLocation.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={radiusKm} onChange={e => setRadiusKm(e.target.value)} type="number" min="0.1" step="0.5" style={{ ...inputStyle, width: '55px' }} />
            <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>km</span>
            <button onClick={save} className="btn btn-ghost press" style={{ fontSize: '0.66rem', padding: '0.25rem 0.5rem' }}>Save</button>
            <button onClick={() => { setAdding(false); setLabel(''); setCenterId('') }} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.66rem' }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="press"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', opacity: 0.75, fontSize: '0.68rem' }}
            disabled={placesWithLocation.length === 0}
          >
            + Filter by area…
          </button>
        )}
      </div>
      </>}
    </div>
  )
}

export function applyPinFilters<T extends { name: string; kind: string; status: PlaceStatus; note: string | null; city: string | null; lat: number | null; lng: number | null; tags: string[] }>(
  places: T[], filters: PinFilterState, radius: { lat: number; lng: number; km: number } | null = null,
): T[] {
  const q = filters.query.trim().toLowerCase()
  return places.filter(p => {
    if (filters.kind && p.kind !== filters.kind) return false
    if (filters.status && p.status !== filters.status) return false
    if (filters.tags.length > 0 && !filters.tags.some(t => p.tags.includes(t))) return false
    if (q && !p.name.toLowerCase().includes(q) && !(p.note ?? '').toLowerCase().includes(q) && !(p.city ?? '').toLowerCase().includes(q)) return false
    if (radius) {
      if (p.lat == null || p.lng == null) return false
      if (haversineKm({ lat: p.lat, lng: p.lng }, radius) > radius.km) return false
    }
    return true
  })
}
