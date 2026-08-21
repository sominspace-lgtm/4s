'use client'

import { useState } from 'react'
import type { Slot } from '@/lib/village/layout'
import type { PersonTree } from '@/lib/relationships/garden'
import { TreeShape } from './shapes'
import { EntityCallout } from '@/components/village/scene/shapes'
import { hashPos } from '@/lib/village/state'

const GROUND_Y = 200

// Same fixed grass-tuft scatter as the Village scene, scaled to this
// shorter canvas — see VillageScene.tsx's GRASS_TUFTS for the full
// reasoning. Different seed prefix so the two scenes don't echo each
// other's exact pattern.
const GRASS_TUFTS = Array.from({ length: 20 }, (_, i) => {
  const seed = `rgrass-${i}`
  const x = 20 + hashPos(seed) * 760
  const h = 3 + hashPos(seed + 'h') * 4
  return { x, h, id: seed }
})

// A calm, static garden bed — deliberately NOT a Village clone. No sky, no
// time-of-day, no seasons: the Village's "live" dimension is the day itself,
// which has nothing to do with relationships. This scene has exactly one
// dimension that moves: who's here and how they've grown.
export default function RelationshipScene({ trees, slots, onSelect }: {
  trees: PersonTree[]
  slots: (Slot & { tree: PersonTree })[]
  /** Fired when a tree is selected (not deselected) — lets the container
   *  scroll to / expand the matching person's detail card below. */
  onSelect?: (id: string) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)

  function select(id: string) {
    setSelected(s => {
      const next = s === id ? null : id
      if (next) onSelect?.(next)
      return next
    })
  }

  const selectedSlot = selected ? slots.find(s => s.id === selected) : null

  return (
    <svg
      viewBox="0 0 800 240"
      role="img"
      aria-label="The people you're close to, as a garden — each tree grows with time and what you've learned about them"
      style={{ width: '100%', height: 'auto', display: 'block' }}
      onClick={() => setSelected(null)}
    >
      <defs>
        <radialGradient id="rvignette" cx="50%" cy="50%" r="75%">
          <stop offset="55%" stopColor="var(--bg)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--bg)" stopOpacity="0.4" />
        </radialGradient>
        <linearGradient id="rground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--surface)" />
          <stop offset="100%" stopColor="var(--surface2)" />
        </linearGradient>
        <radialGradient id="rsheen" cx="32%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.30" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ground */}
      <path d={`M 0 ${GROUND_Y} Q 200 ${GROUND_Y - 14} 400 ${GROUND_Y - 4} T 800 ${GROUND_Y - 10} L 800 240 L 0 240 Z`}
        fill="url(#rground)" opacity={0.95} />
      <path d={`M 0 ${GROUND_Y} Q 200 ${GROUND_Y - 14} 400 ${GROUND_Y - 4} T 800 ${GROUND_Y - 10}`}
        fill="none" stroke="var(--border)" strokeWidth="1.5" />

      {/* Grass — same texture treatment as the Village */}
      <g opacity={0.5}>
        {GRASS_TUFTS.map(t => (
          <path key={t.id}
            d={`M ${t.x - 2} ${GROUND_Y + 4} Q ${t.x} ${GROUND_Y + 4 - t.h} ${t.x + 2} ${GROUND_Y + 4}`}
            fill="none" stroke="var(--emerald)" strokeWidth={1} strokeLinecap="round" />
        ))}
      </g>

      {trees.length === 0 && (
        <text x={400} y={GROUND_Y - 40} textAnchor="middle" fontSize={11} fill="var(--muted)" opacity={0.6}>
          No one here yet — add the people you want to stay close to below.
        </text>
      )}

      {slots.map(({ tree, x, y, scale, back }) => (
        <g key={tree.id} opacity={back ? 0.6 : 1}>
          <TreeShape tree={tree} x={x} y={y} scale={scale}
            selected={selected === tree.id}
            onClick={() => select(tree.id)} />
        </g>
      ))}

      {selectedSlot && (
        <EntityCallout x={selectedSlot.x} y={selectedSlot.y}
          title={selectedSlot.tree.name}
          subtitle={selectedSlot.tree.quiet ? `${selectedSlot.tree.stage} · quiet for a while` : selectedSlot.tree.stage} />
      )}

      <rect width="800" height="240" fill="url(#rvignette)" pointerEvents="none" />
    </svg>
  )
}
