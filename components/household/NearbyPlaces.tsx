'use client'

import { usePlaces, type Place } from '@/lib/hooks/usePlaces'
import { kindSpec } from '@/lib/constants/placeKinds'
import { goToSection } from '@/lib/utils/navigate'

// "Near our new home" — a VIEW over the pins that already exist, not a second
// location database (2026-08-24). A place carries one `kind` but many `tags`,
// so tagging is what lets a cafe be both "a cafe" (its kind, everywhere else
// in the app) and "a hidden gem near home" (its tags, here) without a
// duplicate row. Every pin listed here is the same row Places/the map shows.
//
// NEARBY_TAG is the opt-in: only pins explicitly tagged land in this section,
// so an unrelated pin across the state never shows up as "nearby" just
// because it happens to be a park.
export const NEARBY_TAG = 'nearby'
export const HIDDEN_GEM_TAG = 'hidden-gem'

/** The Millton, Redwood City CA — the move-in address this section is about. */
export const NEW_HOME = { label: 'The Millton', city: 'Redwood City, CA' }

interface Group {
  key: string
  title: string
  blurb: string
  match: (p: Place) => boolean
}

const GROUPS: Group[] = [
  {
    key: 'walking', title: '🚶 Walking Paths',
    blurb: 'Evening walks, scenic routes, somewhere to go together',
    match: p => p.kind === 'trail',
  },
  {
    key: 'parks', title: '🌳 Parks',
    blurb: 'Green space nearby',
    match: p => p.kind === 'park' || p.kind === 'beach',
  },
  {
    key: 'stores', title: '🛍 Stores',
    blurb: 'Groceries, home goods, the essentials',
    match: p => p.kind === 'shop',
  },
  {
    key: 'gems', title: '✨ Hidden Gems',
    blurb: "Cafés, small shops, scenic spots — the ones worth finding",
    // Tag-driven rather than kind-driven on purpose: a hidden gem can be a
    // cafe, a viewpoint, a bookshop or a bar, so no single `kind` captures it.
    match: p => p.tags?.includes(HIDDEN_GEM_TAG) ?? false,
  },
]

export default function NearbyPlaces({ compact = false }: {
  /** Village-widget mode: counts only, no per-pin lists. */
  compact?: boolean
}) {
  const { places, loading } = usePlaces()
  const nearby = places.filter(p => p.tags?.includes(NEARBY_TAG))

  // A pin tagged nearby whose kind matches none of the four groups still
  // belongs to the section — it just lands in "Everything else" rather than
  // silently disappearing from a list the user explicitly added it to.
  const grouped = GROUPS.map(g => ({ ...g, items: nearby.filter(g.match) }))
  const claimed = new Set(grouped.flatMap(g => g.items.map(i => i.id)))
  const rest = nearby.filter(p => !claimed.has(p.id))

  if (compact) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {grouped.filter(g => g.items.length > 0).map(g => (
          <span key={g.key} style={{
            fontSize: '0.66rem', color: 'var(--muted)', background: 'var(--surface2)',
            border: '1px solid var(--border)', borderRadius: '99px', padding: '0.2em 0.6em',
          }}>{g.title} {g.items.length}</span>
        ))}
        {nearby.length === 0 && !loading && (
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
            Nothing pinned nearby yet.
          </span>
        )}
      </div>
    )
  }

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div>
        <div className="t-card">Near {NEW_HOME.label}</div>
        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.7, marginTop: '0.2rem' }}>
          {NEW_HOME.city} · these are your saved pins, tagged <code style={{ fontSize: '0.95em' }}>{NEARBY_TAG}</code>
        </div>
      </div>

      {nearby.length === 0 && !loading && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Nothing yet. Tag any pin <code>{NEARBY_TAG}</code> in Places and it shows up here, sorted into the
          right group by what kind of place it is.
        </div>
      )}

      {grouped.filter(g => g.items.length > 0).map(g => (
        <details key={g.key} open style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}>
          <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{g.title}</span>
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{g.items.length}</span>
          </summary>
          <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.65, margin: '0.3rem 0 0.5rem' }}>{g.blurb}</div>
          {g.items.map(p => <NearbyRow key={p.id} place={p} />)}
        </details>
      ))}

      {rest.length > 0 && (
        <details style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}>
          <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text)' }}>
            Everything else <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{rest.length}</span>
          </summary>
          <div style={{ marginTop: '0.4rem' }}>
            {rest.map(p => <NearbyRow key={p.id} place={p} />)}
          </div>
        </details>
      )}

      <button onClick={() => goToSection('places')} className="btn btn-ghost press" style={{ fontSize: '0.68rem', alignSelf: 'flex-start' }}>
        Open the map →
      </button>
    </section>
  )
}

function NearbyRow({ place }: { place: Place }) {
  const spec = kindSpec(place.kind)
  const maps = place.maps_url
    ?? (place.lat != null && place.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name} ${place.city ?? ''}`)}`)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid var(--faint)' }}>
      <span aria-hidden style={{ color: `var(${spec.color})`, fontSize: '0.75rem', flexShrink: 0, marginTop: '0.1rem' }}>{spec.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text)' }}>{place.name}</div>
        {place.note && <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.75, lineHeight: 1.4 }}>{place.note}</div>}
      </div>
      <a href={maps} target="_blank" rel="noopener noreferrer"
        style={{ fontSize: '0.62rem', color: 'var(--gold)', textDecoration: 'none', flexShrink: 0, marginTop: '0.1rem' }}>map ↗</a>
    </div>
  )
}
