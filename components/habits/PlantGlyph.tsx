'use client'

import { STAGE_INDEX, type Plant } from '@/lib/village/state'

// The habit's plant, at row scale.
//
// Deliberately reads its stage from the SAME lib/village/state.plantFor() the
// village uses, rather than reimplementing thresholds here. Two places
// drawing "how grown is this habit" from two different calculations is how
// you end up with a forest that disagrees with the list that feeds it.
//
// Shape changes per stage, not just size — growth has to read at a glance in
// a 26px box, and scaling one silhouette up just looks like a zoom.
export default function PlantGlyph({ plant, size = 26 }: { plant: Plant; size?: number }) {
  const i = STAGE_INDEX(plant.stage)
  const color = plant.dormant ? 'var(--muted)' : 'var(--emerald)'
  const stemH = [4, 8, 13, 17, 21][i]
  const crown = [3, 5, 8, 10, 12][i]

  return (
    <svg
      width={size} height={size} viewBox="0 0 26 26"
      role="img"
      aria-label={`${plant.stage}${plant.dormant ? ', resting' : ''}`}
      style={{ flexShrink: 0, opacity: plant.dormant ? 0.45 : 1, transition: 'opacity 200ms ease' }}
    >
      <title>{`${plant.stage}${plant.dormant ? ' · resting' : ''}`}</title>
      {/* soil line — grounds the glyph so plants of different heights still
          sit on a common baseline down the column */}
      <line x1={6} y1={23} x2={20} y2={23} stroke="var(--faint)" strokeWidth={1.2} strokeLinecap="round" />
      <rect x={12.4} y={23 - stemH} width={1.2} height={stemH} rx={0.6} fill={color} opacity={0.8} />

      {i === 0 && <circle cx={13} cy={23 - stemH - 1.5} r={2.2} fill={color} />}
      {i === 1 && (
        <>
          <ellipse cx={9.5} cy={23 - stemH + 1} rx={3.4} ry={2} fill={color} transform={`rotate(-25 9.5 ${23 - stemH + 1})`} />
          <ellipse cx={16.5} cy={23 - stemH - 1} rx={3.4} ry={2} fill={color} transform={`rotate(25 16.5 ${23 - stemH - 1})`} />
        </>
      )}
      {i >= 2 && (
        <>
          <circle cx={13} cy={23 - stemH} r={crown / 2} fill={color} opacity={0.92} />
          <circle cx={13 - crown / 3} cy={23 - stemH + crown / 5} r={crown / 3.2} fill={color} opacity={0.72} />
          <circle cx={13 + crown / 3} cy={23 - stemH + crown / 5.5} r={crown / 3.6} fill={color} opacity={0.66} />
        </>
      )}
      {/* resting mark — a plant that's waiting, not a plant that failed */}
      {plant.dormant && i >= 1 && (
        <circle cx={13} cy={23 - stemH - crown / 2 - 3} r={1.1} fill="var(--muted)" opacity={0.6} />
      )}
    </svg>
  )
}
