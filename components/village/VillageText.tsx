'use client'

import { useState } from 'react'
import type { VillageState } from '@/lib/village/state'

// The village's mandatory text equivalent. Not a nice-to-have and not a
// phase-2 item: the village is never the ONLY way to know something about
// your own life. Screen readers get this (the SVG is aria-hidden from the
// list's perspective via its own single label), and it doubles as a plain
// summary for anyone who'd simply rather read than look at a picture.
export default function VillageText({ village }: { village: VillageState }) {
  const [open, setOpen] = useState(false)

  const resting = village.plants.filter(p => p.dormant).length
  const growing = village.plants.length - resting
  const standing = village.buildings.filter(b => b.phase === 'complete' || b.phase === 'landmark').length
  const underway = village.buildings.length - standing

  const lines = [
    `Growth Forest: ${village.plants.length} plant${village.plants.length === 1 ? '' : 's'}` +
      (village.plants.length ? ` — ${growing} growing, ${resting} resting.` : ' — nothing planted yet.'),
    `Project District: ${standing} standing, ${underway} underway.`,
    `Archive Grove: Life Tree has ${village.treeRings} ring${village.treeRings === 1 ? '' : 's'}.`,
    `Bloom Garden: ${village.flowers.length || 'no'} flower${village.flowers.length === 1 ? '' : 's'} so far.`,
    `Rest Lake: ${village.stillness > 0.5 ? 'clear and still' : 'waiting for you to slow down'}.`,
    `It is ${village.timeOfDay}, in ${village.season}.`,
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
