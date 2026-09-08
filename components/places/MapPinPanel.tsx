'use client'

import { useMemo, useState } from 'react'
import PinList from '@/components/places/PinList'
import { haversineKm } from '@/lib/utils/geo'
import { HOME_COORD } from '@/lib/constants/home'
import type { Place } from '@/lib/hooks/usePlaces'

// The list that lives under the map (2026-09-09). Not a modal — it's
// docked at the bottom of the map, peek height by default, tap the handle
// to expand. Shows whatever pins are in the current viewport, sorted by
// the chosen mode. Tapping a row asks the map to fly there and opens the
// pin's own sheet.

export type PinSort = 'near' | 'recent' | 'status'

const SORTS: { id: PinSort; label: string }[] = [
  { id: 'near', label: 'Near us' },
  { id: 'recent', label: 'Recent' },
  { id: 'status', label: 'Status' },
]

// Want to go first, then Good, then the middling / no-again ones.
const STATUS_RANK: Record<string, number> = { idea: 0, good: 1, hmm: 2, bad: 3, archived: 4 }

export default function MapPinPanel({ places, totalCount, onSelect, thumbs = {}, dateIdeaIds }: {
  /** Already viewport-filtered by the parent. */
  places: Place[]
  /** How many pins have a location at all, ignoring the viewport. */
  totalCount: number
  onSelect: (place: Place) => void
  thumbs?: Record<string, string>
  dateIdeaIds?: Set<string>
}) {
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState<PinSort>('near')

  const sorted = useMemo(() => {
    const withDist = places.map(p => ({
      p,
      dist: p.lat != null && p.lng != null ? haversineKm({ lat: p.lat, lng: p.lng }, HOME_COORD) : Infinity,
    }))
    if (sort === 'near') withDist.sort((a, b) => a.dist - b.dist)
    else if (sort === 'status') withDist.sort((a, b) => (STATUS_RANK[a.p.status] ?? 9) - (STATUS_RANK[b.p.status] ?? 9))
    else withDist.sort((a, b) => b.p.created_at.localeCompare(a.p.created_at))
    return withDist.map(x => x.p)
  }, [places, sort])

  const label = places.length === totalCount
    ? `${totalCount} ${totalCount === 1 ? 'place' : 'places'}`
    : `${places.length} of ${totalCount} here`

  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2,
      background: 'var(--surface)', borderTop: '1px solid var(--border)',
      borderRadius: 'var(--radius) var(--radius) 0 0',
      boxShadow: '0 -8px 28px color-mix(in srgb, var(--shadow) 55%, transparent)',
      display: 'flex', flexDirection: 'column',
      maxHeight: open ? '62%' : 'auto',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="press"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          padding: '0.5rem 0.9rem 0.55rem', textAlign: 'left',
        }}
      >
        <span aria-hidden style={{ width: 32, height: 4, borderRadius: 2, background: 'var(--border)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.76rem', color: 'var(--text)', fontWeight: 500 }}>{label}</span>
        <span aria-hidden style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--muted)' }}>{open ? '▾' : '▴'}</span>
      </button>

      {open && (
        <>
          <div style={{ display: 'flex', gap: '0.3rem', padding: '0 0.9rem 0.5rem' }}>
            {SORTS.map(s => (
              <button key={s.id} onClick={() => setSort(s.id)} className="press" style={{
                fontSize: '0.66rem', padding: '0.25rem 0.6rem', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${sort === s.id ? 'var(--gold)' : 'var(--border)'}`,
                background: sort === s.id ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
                color: sort === s.id ? 'var(--gold)' : 'var(--muted)',
              }}>{s.label}</button>
            ))}
          </div>
          <div style={{ overflowY: 'auto', padding: '0 0.9rem 0.9rem' }}>
            {sorted.length === 0
              ? <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', padding: '0.6rem 0' }}>No pins in view. Zoom out or pan the map.</div>
              : <PinList places={sorted} onSelect={onSelect} thumbs={thumbs} dateIdeaIds={dateIdeaIds} showDistance={sort === 'near'} />}
          </div>
        </>
      )}
    </div>
  )
}
