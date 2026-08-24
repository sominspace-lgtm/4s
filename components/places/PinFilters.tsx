'use client'

import { useState } from 'react'
import { kindSpec, KIND_ORDER } from '@/lib/constants/placeKinds'
import type { Place, PlaceStatus } from '@/lib/hooks/usePlaces'
import type { PlaceFilter } from '@/lib/hooks/usePlaceFilters'
import { haversineKm } from '@/lib/utils/geo'

export interface PinFilterState {
  query: string
  kind: string | null
  status: PlaceStatus | null
  /** Active saved radius filter's id (see PlaceFilter) — 'null' means show everything. */
  radiusFilterId: string | null
}

export const DEFAULT_PIN_FILTERS: PinFilterState = { query: '', kind: null, status: null, radiusFilterId: null }

const STATUS_CHIPS: { id: PlaceStatus; label: string }[] = [
  { id: 'idea', label: 'Want to go' },
  { id: 'good', label: '👍 Good' },
  { id: 'hmm', label: '🤷 Hmm' },
  { id: 'bad', label: '👎 Not again' },
]

const inputStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
  padding: '0.3rem 0.55rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', outline: 'none',
}

export default function PinFilters({ filters, kindsInUse, onChange, savedFilters, placesWithLocation, onAddFilter, onRemoveFilter }: {
  filters: PinFilterState
  kindsInUse: string[]
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
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
            style={chipStyle(filters.status === s.id)}
          >
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

      {/* Custom "near a place" filters (2026-08-24) — e.g. "Near Our Home":
          a saved radius around an existing pin, so the map/list can be
          switched to show only what falls inside it. */}
      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {savedFilters.map(f => (
          <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center' }}>
            <button
              onClick={() => onChange({ ...filters, radiusFilterId: filters.radiusFilterId === f.id ? null : f.id })}
              className="btn press"
              style={{ ...chipStyle(filters.radiusFilterId === f.id), borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRight: 'none' }}
            >
              📍 {f.label} <span style={{ opacity: 0.6 }}>({f.radius_km}km)</span>
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
    </div>
  )
}

export function applyPinFilters<T extends { name: string; kind: string; status: PlaceStatus; note: string | null; city: string | null; lat: number | null; lng: number | null }>(
  places: T[], filters: PinFilterState, radius: { lat: number; lng: number; km: number } | null = null,
): T[] {
  const q = filters.query.trim().toLowerCase()
  return places.filter(p => {
    if (filters.kind && p.kind !== filters.kind) return false
    if (filters.status && p.status !== filters.status) return false
    if (q && !p.name.toLowerCase().includes(q) && !(p.note ?? '').toLowerCase().includes(q) && !(p.city ?? '').toLowerCase().includes(q)) return false
    if (radius) {
      if (p.lat == null || p.lng == null) return false
      if (haversineKm({ lat: p.lat, lng: p.lng }, radius) > radius.km) return false
    }
    return true
  })
}
