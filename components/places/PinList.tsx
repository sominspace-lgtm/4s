'use client'

import { kindSpec } from '@/lib/constants/placeKinds'
import type { Place, PlaceStatus } from '@/lib/hooks/usePlaces'

const STATUS_DOT: Record<PlaceStatus, string> = {
  idea: '--muted', good: '--emerald', hmm: '--amber', bad: '--rose', archived: '--muted',
}

export default function PinList({ places, onSelect }: {
  places: Place[]
  onSelect: (place: Place) => void
}) {
  if (places.length === 0) {
    return (
      <div style={{ fontSize: '0.76rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8, lineHeight: 1.6, padding: '1rem 0' }}>
        Nothing here yet. Save a place — a court, a restaurant, anywhere you don&rsquo;t want to have to remember on your own.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {places.map(place => {
        const spec = kindSpec(place.kind)
        return (
          <button
            key={place.id}
            onClick={() => onSelect(place)}
            className="press"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.7rem',
              padding: '0.7rem 0.2rem', borderBottom: '1px solid var(--faint)',
              background: 'none', border: 'none', borderBottomWidth: '1px',
              borderBottomStyle: 'solid', borderBottomColor: 'var(--faint)',
              cursor: 'pointer', textAlign: 'left', width: '100%',
            }}
          >
            <span aria-hidden style={{ fontSize: '1rem', color: `var(${spec.color})`, flexShrink: 0, width: '1.2rem' }}>
              {spec.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {place.name}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--muted)' }}>
                {spec.label}{place.city ? ` · ${place.city}` : ''}{place.lat == null ? ' · no location' : ''}
                {place.kind === 'unset' && <span style={{ color: 'var(--amber)' }}> · needs a type</span>}
              </div>
            </div>
            <span aria-hidden style={{
              width: '7px', height: '7px', borderRadius: '99px', flexShrink: 0,
              background: `var(${STATUS_DOT[place.status]})`,
            }} />
          </button>
        )
      })}
    </div>
  )
}
