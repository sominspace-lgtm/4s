'use client'

import { useState } from 'react'
import type { VillageState } from '@/lib/village/state'
import { FOREST_CAP, DISTRICT_CAP } from '@/lib/village/layout'

// The village's mandatory text equivalent. Not a nice-to-have and not a
// phase-2 item: the village is never the ONLY way to know something about
// your own life. Screen readers get this (the SVG is aria-hidden from the
// list's perspective via its own single label), and it doubles as a plain
// summary for anyone who'd simply rather read than look at a picture.
export default function VillageText({ village, arrival = null, horizonCount = 0 }: {
  village: VillageState
  /** Repeated here so "what changed" is knowable without seeing the picture. */
  arrival?: string | null
  horizonCount?: number
}) {
  const [open, setOpen] = useState(false)

  const resting = village.plants.filter(p => p.dormant).length
  const growing = village.plants.length - resting
  const standing = village.buildings.filter(b => b.phase === 'complete' || b.phase === 'landmark').length
  const underway = village.buildings.length - standing

  // Raising the caps still hides things at scale, and a plant you can't see has
  // to remain knowable in words. Same rule as everything else in this file.
  const plantOverflow = Math.max(0, village.plants.length - FOREST_CAP)
  const buildingOverflow = Math.max(0, village.buildings.length - DISTRICT_CAP)

  const lines = [
    `Growth Garden: ${village.plants.length} plant${village.plants.length === 1 ? '' : 's'}` +
      (village.plants.length ? `. ${growing} growing, ${resting} resting.` : '. Nothing planted yet.') +
      (plantOverflow ? ` Showing ${FOREST_CAP} of ${village.plants.length}.` : ''),
    `Project District: ${standing} standing, ${underway} underway.` +
      (buildingOverflow ? ` Showing ${DISTRICT_CAP} of ${village.buildings.length}.` : ''),
    // A new account should never read "0 rings" for its whole first year. The
    // canopy is already moving by then, so the words say so too.
    village.treeRings > 0
      ? `Archive Grove: Life Tree has ${village.treeRings} ring${village.treeRings === 1 ? '' : 's'}.`
      : `Archive Grove: Life Tree in its first year, ${village.accountMonths} month${village.accountMonths === 1 ? '' : 's'} of growth.`,
    `Bloom Garden: ${village.flowers.length || 'no'} flower${village.flowers.length === 1 ? '' : 's'} so far.`,
    `It is ${village.timeOfDay}, in ${village.season}.`,
    // Omitted entirely when solo, rather than saying "0 places". The picture
    // shows nothing there either.
    ...(horizonCount > 0
      ? [`Shared horizon: ${horizonCount} place${horizonCount === 1 ? '' : 's'} you have both been.`]
      : []),
    ...(arrival ? [arrival] : []),
  ]

  return (
    <div style={{ marginTop: '0.5rem' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0',
          fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.7, fontFamily: 'var(--font-body)',
        }}
      >
        {open ? 'Hide' : 'Describe'} this in words
      </button>

      {/* Always in the a11y tree; visually shown on request. */}
      <ul
        className={open ? undefined : 'sr-only'}
        style={open ? { margin: '0.35rem 0 0', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' } : undefined}
      >
        {lines.map(l => (
          <li key={l} style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.6 }}>{l}</li>
        ))}
      </ul>
    </div>
  )
}
