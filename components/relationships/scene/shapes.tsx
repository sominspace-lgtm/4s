'use client'

import { PERSON_STAGE_ORDER, type PersonTree } from '@/lib/relationships/garden'

// One shape, five stages — a tree rather than the Village's stem-and-bloom
// plant, deliberately: these are people, not habits, and the canopy-circle
// silhouette (borrowed from the Village's own Archive Grove / Life Tree)
// reads as "grows and deepens over time" without borrowing the habit
// vocabulary wholesale. Color is --blush/--rose, the relationship accent
// used elsewhere (PeopleHub's own border), never --emerald — a person-tree
// should never be mistaken for a habit-plant at a glance.
const CANOPY_R = [6, 10, 15, 21, 28]
const TRUNK_H = [10, 16, 24, 34, 46]

export function TreeShape({ tree, x, y, scale = 1, selected = false, onClick }: {
  tree: PersonTree
  x: number
  y: number
  scale?: number
  selected?: boolean
  onClick?: () => void
}) {
  const i = PERSON_STAGE_ORDER.indexOf(tree.stage)
  const trunkH = TRUNK_H[i]
  const r = CANOPY_R[i]
  // Quiet desaturates, per the "never shrink" law in lib/relationships/
  // garden.ts — the SIZE above is untouched by `quiet`, only the color is.
  const color = tree.quiet ? 'var(--muted)' : 'var(--blush)'
  const opacity = tree.quiet ? 0.55 : 1

  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      opacity={opacity}
      onClick={onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined}
      className={[onClick && 'village-entity', selected && 'village-entity-selected'].filter(Boolean).join(' ') || undefined}
    >
      <title>{`${tree.name}${tree.quiet ? ' — been a while' : ''}`}</title>
      <rect x={-1.4} y={-trunkH} width={2.8} height={trunkH} rx={1.4} fill="var(--slate)" opacity={0.75} />
      <circle cx={0} cy={-trunkH} r={r} fill={color} opacity={0.88} />
      {i >= 2 && <circle cx={-r * 0.4} cy={-trunkH + r * 0.3} r={r * 0.55} fill={color} opacity={0.7} />}
      {i >= 3 && <circle cx={r * 0.45} cy={-trunkH + r * 0.25} r={r * 0.5} fill={color} opacity={0.65} />}
      {tree.birthdaySoon && (
        <text x={0} y={-trunkH - r - 6} textAnchor="middle" fontSize={9}>🎂</text>
      )}
    </g>
  )
}
