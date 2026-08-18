'use client'

import { STAGE_INDEX, type Plant, type Building } from '@/lib/village/state'

// The repeated silhouettes: one per habit, one per project, one per district
// label. Split out of Village.tsx unchanged — these are the pieces that appear
// N times, while the one-off scenery stays in VillageScene where you can read
// the composition order top to bottom.

// Plant silhouettes by stage. Each stage is a real change in shape, not just
// scale — growth should read at a glance, from across the room.
export function PlantShape({ plant, x, y, scale = 1, changed = false, foliage = 'var(--emerald)' }: {
  plant: Plant; x: number; y: number; scale?: number; changed?: boolean
  /** The season's green. Dormant plants ignore it: resting is resting in
   *  any weather, and it has to stay visually distinct from autumn. */
  foliage?: string
}) {
  const i = STAGE_INDEX(plant.stage)
  const h = [8, 18, 34, 52, 72][i]
  const w = [7, 12, 22, 32, 44][i]
  const color = plant.dormant ? 'var(--muted)' : foliage
  const opacity = plant.dormant ? 0.4 : 1

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}
      className={changed ? 'village-changed' : undefined}>
      <title>{`${plant.name} — ${plant.stage}${plant.dormant ? ', resting' : ''}`}</title>
      {/* stem */}
      <rect x={-1.2} y={-h} width={2.4} height={h} rx={1.2} fill={color} opacity={0.75} />
      {i === 0 && <circle cy={-h - 2} r={3.5} fill={color} />}
      {i === 1 && (
        <>
          <ellipse cx={-5} cy={-h + 2} rx={5.5} ry={3.4} fill={color} transform="rotate(-24 -5 0)" />
          <ellipse cx={5} cy={-h - 1} rx={5.5} ry={3.4} fill={color} transform="rotate(24 5 0)" />
        </>
      )}
      {i >= 2 && (
        <>
          <circle cx={0} cy={-h} r={w / 2} fill={color} opacity={0.92} />
          <circle cx={-w / 3.2} cy={-h + w / 5} r={w / 3.4} fill={color} opacity={0.75} />
          <circle cx={w / 3.2} cy={-h + w / 5.5} r={w / 3.8} fill={color} opacity={0.7} />
        </>
      )}
      {plant.dormant && i >= 1 && (
        <circle cx={0} cy={-h - w / 2 - 6} r={1.6} fill="var(--muted)" opacity={0.5} />
      )}
    </g>
  )
}

export function BuildingShape({ building, x, y, scale = 1, changed = false }: {
  building: Building; x: number; y: number; scale?: number; changed?: boolean
}) {
  const spec = {
    blueprint:    { h: 16, fill: 'transparent',        stroke: 'var(--slate)',  dash: '3 3' },
    foundation:   { h: 14, fill: 'var(--slate)',       stroke: 'var(--slate)',  dash: '' },
    construction: { h: 38, fill: 'var(--amber)',       stroke: 'var(--amber)',  dash: '' },
    complete:     { h: 52, fill: 'var(--slate)',       stroke: 'var(--slate)',  dash: '' },
    landmark:     { h: 68, fill: 'var(--gold)',        stroke: 'var(--gold)',   dash: '' },
  }[building.phase]
  const w = 26

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}
      className={changed ? 'village-changed' : undefined}>
      <title>{`${building.title} — ${building.phase}`}</title>
      <rect
        x={-w / 2} y={-spec.h} width={w} height={spec.h} rx={2}
        fill={spec.fill} fillOpacity={building.phase === 'blueprint' ? 0 : 0.55}
        stroke={spec.stroke} strokeWidth={1.2} strokeDasharray={spec.dash} strokeOpacity={0.9}
      />
      {/* roof, once it's actually a building */}
      {(building.phase === 'complete' || building.phase === 'landmark') && (
        <path d={`M ${-w / 2 - 3} ${-spec.h} L 0 ${-spec.h - 12} L ${w / 2 + 3} ${-spec.h} Z`} fill={spec.stroke} fillOpacity={0.7} />
      )}
      {/* lit windows — a finished thing has someone in it */}
      {(building.phase === 'complete' || building.phase === 'landmark') && (
        <>
          <rect x={-7} y={-spec.h + 10} width={5} height={6} rx={1} fill="var(--amber)" opacity={0.8} />
          <rect x={2} y={-spec.h + 10} width={5} height={6} rx={1} fill="var(--amber)" opacity={0.6} />
        </>
      )}
      {building.phase === 'landmark' && (
        <text x={0} y={-spec.h - 17} textAnchor="middle" fontSize={11} fill="var(--gold)">◆</text>
      )}
    </g>
  )
}

export function DistrictLabel({ x, y, glyph, label, count, onClick }: {
  x: number; y: number; glyph: string; label: string; count: string; onClick: () => void
}) {
  return (
    <g transform={`translate(${x} ${y})`} onClick={onClick} className="village-district" style={{ cursor: 'pointer' }}>
      <title>{`${label} — ${count}. Click to open.`}</title>
      <text textAnchor="middle" fontSize={13} y={-13}>{glyph}</text>
      <text textAnchor="middle" fontSize={8.5} fill="var(--muted)" letterSpacing="0.06em">{label.toUpperCase()}</text>
      <text textAnchor="middle" fontSize={7.5} fill="var(--muted)" opacity={0.6} y={10}>{count}</text>
    </g>
  )
}
