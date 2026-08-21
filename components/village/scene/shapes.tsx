'use client'

import { STAGE_INDEX, type Plant, type Building } from '@/lib/village/state'

// The repeated silhouettes: one per habit, one per project, one per district
// label. Split out of Village.tsx unchanged — these are the pieces that appear
// N times, while the one-off scenery stays in VillageScene where you can read
// the composition order top to bottom.

// Plant silhouettes by stage. Each stage is a real change in shape, not just
// scale — growth should read at a glance, from across the room.
export function PlantShape({ plant, x, y, scale = 1, changed = false, foliage = 'var(--emerald)', selected = false, onClick }: {
  plant: Plant; x: number; y: number; scale?: number; changed?: boolean
  /** The season's green. Dormant plants ignore it: resting is resting in
   *  any weather, and it has to stay visually distinct from autumn. */
  foliage?: string
  /** Tapped — keeps a styled callout open, see VillageScene's EntityCallout. */
  selected?: boolean
  onClick?: () => void
}) {
  const i = STAGE_INDEX(plant.stage)
  const h = [8, 18, 34, 52, 72][i]
  const w = [7, 12, 22, 32, 44][i]
  const color = plant.dormant ? 'var(--muted)' : foliage
  const opacity = plant.dormant ? 0.4 : 1

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}
      onClick={onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined}
      className={[changed && 'village-changed', onClick && 'village-entity', selected && 'village-entity-selected'].filter(Boolean).join(' ') || undefined}>
      {/* Native <title> stays as the a11y fallback (screen readers, and
          anyone hovering without JS) — the STYLED callout that appears on
          click lives in VillageScene, keyed off `selected`. */}
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
          {/* Sheen — a plain flat-filled circle reads as a paper cutout;
              this makes it read as lit from above instead. */}
          {!plant.dormant && <circle cx={0} cy={-h} r={w / 2} fill="url(#vsheen)" />}
        </>
      )}
      {plant.dormant && i >= 1 && (
        <circle cx={0} cy={-h - w / 2 - 6} r={1.6} fill="var(--muted)" opacity={0.5} />
      )}
    </g>
  )
}

export function BuildingShape({ building, x, y, scale = 1, changed = false, selected = false, onClick }: {
  building: Building; x: number; y: number; scale?: number; changed?: boolean
  selected?: boolean
  onClick?: () => void
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
      onClick={onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined}
      className={[changed && 'village-changed', onClick && 'village-entity', selected && 'village-entity-selected'].filter(Boolean).join(' ') || undefined}>
      <title>{`${building.title} — ${building.phase}`}</title>
      <rect
        x={-w / 2} y={-spec.h} width={w} height={spec.h} rx={2}
        fill={spec.fill} fillOpacity={building.phase === 'blueprint' ? 0 : 0.55}
        stroke={spec.stroke} strokeWidth={1.2} strokeDasharray={spec.dash} strokeOpacity={0.9}
      />
      {/* Sheen on the body — same reasoning as PlantShape's */}
      {building.phase !== 'blueprint' && (
        <rect x={-w / 2} y={-spec.h} width={w} height={spec.h} rx={2} fill="url(#vsheen)" />
      )}
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

// Styled callout for a selected plant/building (2026-08-21) — the native
// SVG <title> tooltip on each shape still works (hover, no-JS, screen
// readers), but it renders in the browser's own unstyled tooltip box, which
// reads as a debug artifact next to everything else in the scene. Clicking a
// shape opens this instead: same info, drawn in the scene's own visual
// language. Positioned a fixed distance above the entity's slot — safely
// clear of the tallest possible plant or building (~94px) without needing
// each shape's exact rendered height at call time.
export function EntityCallout({ x, y, title, subtitle }: { x: number; y: number; title: string; subtitle: string }) {
  const width = Math.max(90, Math.max(title.length, subtitle.length) * 5.4 + 20)
  // Keep the whole callout on-canvas (viewBox is 800 wide) even for an
  // entity slotted near either edge.
  const cx = Math.min(800 - width / 2 - 8, Math.max(width / 2 + 8, x))
  const top = y - 100
  return (
    <g transform={`translate(${cx} ${top})`} pointerEvents="none" className="village-fade">
      <rect x={-width / 2} y={-34} width={width} height={32} rx={9} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} />
      <path d={`M ${x - cx - 5} -3 L ${x - cx} 3 L ${x - cx + 5} -3 Z`} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} />
      <text x={0} y={-19} textAnchor="middle" fontSize={9.5} fill="var(--text)" fontFamily="var(--font-body)">{title}</text>
      <text x={0} y={-8} textAnchor="middle" fontSize={7.5} fill="var(--muted)" fontFamily="var(--font-body)">{subtitle}</text>
    </g>
  )
}

// Glyphs are plain geometric characters from the app's own icon vocabulary
// (the same ones SectionNav uses — ◒ ⌂ ◫ etc.), not emoji (2026-08-21).
// Emoji render as fixed, fully-saturated pictographs that ignore `fill` —
// they can't take the theme's gold, so every district glyph looked the same
// regardless of theme and read as a foreign, cartoonish accent against the
// rest of the scene's restrained SVG-drawn palette. A text glyph is a real
// shape the theme can color, and the soft badge behind it gives an
// otherwise-thin single character some actual presence.
export function DistrictLabel({ x, y, glyph, label, count, onClick, draggable = false, dragging = false, onPointerDown }: {
  x: number; y: number; glyph: string; label: string; count: string; onClick: () => void
  /** Arrange mode — see VillageScene's startDrag/onMoveLandmark. */
  draggable?: boolean
  dragging?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
}) {
  return (
    <g transform={`translate(${x} ${y})`} onClick={onClick} onPointerDown={onPointerDown}
      className="village-district" style={{ cursor: draggable ? (dragging ? 'grabbing' : 'grab') : 'pointer' }}>
      <title>{draggable ? `${label} — drag to move` : `${label} — ${count}. Click to open.`}</title>
      {/* A dashed ring while arranging — the same visual language blueprint-
          phase buildings already use for "not settled yet" — so a landmark
          reads as movable without needing separate instructional copy on
          every pin. */}
      {draggable && (
        <circle cy={-14} r={18} fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3" opacity={dragging ? 0.9 : 0.45} />
      )}
      <circle cy={-14} r={14} fill="var(--surface)" stroke="var(--gold)" strokeWidth={0.8} opacity={0.9} />
      <circle cy={-14} r={14} fill="none" stroke="var(--border)" strokeWidth={0.6} />
      <text textAnchor="middle" dominantBaseline="central" fontSize={13} y={-14} fill="var(--gold)">{glyph}</text>
      <text textAnchor="middle" fontSize={8.5} fill="var(--muted)" letterSpacing="0.06em" y={10}>{label.toUpperCase()}</text>
      <text textAnchor="middle" fontSize={7.5} fill="var(--muted)" opacity={0.6} y={21}>{count}</text>
    </g>
  )
}
