'use client'

import { kindSpec, KIND_ORDER } from '@/lib/constants/placeKinds'
import type { PlaceStatus } from '@/lib/hooks/usePlaces'

export interface PinFilterState {
  query: string
  kind: string | null
  status: PlaceStatus | null
}

export const DEFAULT_PIN_FILTERS: PinFilterState = { query: '', kind: null, status: null }

const STATUS_CHIPS: { id: PlaceStatus; label: string }[] = [
  { id: 'idea', label: 'Want to go' },
  { id: 'been', label: 'Been' },
  { id: 'favourite', label: 'Favourite' },
]

export default function PinFilters({ filters, kindsInUse, onChange }: {
  filters: PinFilterState
  kindsInUse: string[]
  onChange: (next: PinFilterState) => void
}) {
  const availableKinds = KIND_ORDER.filter(k => kindsInUse.includes(k))

  const chipStyle = (active: boolean): React.CSSProperties => ({
    fontSize: '0.68rem', padding: '0.35rem 0.7rem',
    background: active ? 'color-mix(in srgb, var(--gold) 14%, transparent)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--muted)',
    border: '1px solid var(--border)',
  })

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
    </div>
  )
}

export function applyPinFilters<T extends { name: string; kind: string; status: PlaceStatus; note: string | null; city: string | null }>(
  places: T[], filters: PinFilterState,
): T[] {
  const q = filters.query.trim().toLowerCase()
  return places.filter(p => {
    if (filters.kind && p.kind !== filters.kind) return false
    if (filters.status && p.status !== filters.status) return false
    if (q && !p.name.toLowerCase().includes(q) && !(p.note ?? '').toLowerCase().includes(q) && !(p.city ?? '').toLowerCase().includes(q)) return false
    return true
  })
}
