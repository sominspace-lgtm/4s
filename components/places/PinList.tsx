'use client'

import { kindSpec } from '@/lib/constants/placeKinds'
import { haversineKm, formatDistance } from '@/lib/utils/geo'
import { HOME_COORD } from '@/lib/constants/home'
import { openState } from '@/lib/utils/placeHours'
import type { Place, PlaceStatus } from '@/lib/hooks/usePlaces'

const STATUS_DOT: Record<PlaceStatus, string> = {
  idea: '--muted', good: '--emerald', hmm: '--amber', bad: '--rose', archived: '--muted',
}

export default function PinList({ places, onSelect, thumbs = {}, dateIdeaIds, showDistance = false }: {
  places: Place[]
  onSelect: (place: Place) => void
  /** placeId → signed photo URL for the first photo, if any. */
  thumbs?: Record<string, string>
  /** ids of pins that are also a date idea — shown with a heart. */
  dateIdeaIds?: Set<string>
  /** Append "1.2 km away" from home to each row. */
  showDistance?: boolean
}) {
  if (places.length === 0) {
    return (
      <div style={{ fontSize: '0.76rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8, lineHeight: 1.6, padding: '1rem 0' }}>
        Nothing here yet. Save a place, a court, a restaurant, anywhere you don&rsquo;t want to have to remember on your own.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {places.map(place => {
        const spec = kindSpec(place.kind)
        const thumb = thumbs[place.id]
        const isDateIdea = dateIdeaIds?.has(place.id)
        const open = openState(place.details)
        const dist = showDistance && place.lat != null && place.lng != null
          ? formatDistance(haversineKm({ lat: place.lat, lng: place.lng }, HOME_COORD))
          : null
        return (
          <button
            key={place.id}
            onClick={() => onSelect(place)}
            className="press"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.7rem',
              padding: '0.6rem 0.4rem 0.6rem 0.6rem', borderBottom: '1px solid var(--faint)',
              borderLeft: `3px solid var(${spec.color})`,
              background: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
            }}
          >
            {thumb ? (
              <img src={thumb} alt="" width={40} height={40} loading="lazy"
                style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <span aria-hidden style={{ fontSize: '1rem', color: `var(${spec.color})`, flexShrink: 0, width: '1.4rem', textAlign: 'center' }}>
                {spec.icon}
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {place.name}
                {isDateIdea && <span aria-label="date idea" style={{ color: 'var(--rose)', opacity: 0.7, marginLeft: '0.35rem', fontSize: '0.7rem' }}>♥</span>}
              </div>
              <div style={{ fontSize: '0.66rem', color: 'var(--muted)' }}>
                {spec.label}
                {dist ? ` · ${dist}` : place.city ? ` · ${place.city}` : ''}
                {place.lat == null ? ' · no location' : ''}
                {place.kind === 'unset' && <span style={{ color: 'var(--amber)' }}> · needs a type</span>}
              </div>
            </div>
            {open && (
              <span style={{
                fontSize: '0.58rem', flexShrink: 0, padding: '0.1rem 0.4rem', borderRadius: 999,
                color: open === 'open' ? 'var(--emerald)' : 'var(--muted)',
                background: open === 'open' ? 'color-mix(in srgb, var(--emerald) 14%, transparent)' : 'var(--surface2)',
              }}>{open === 'open' ? 'Open' : 'Closed'}</span>
            )}
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
