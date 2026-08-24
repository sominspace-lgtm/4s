'use client'

import { STAGE_INDEX, type Plant, type Building } from '@/lib/village/state'

// The repeated silhouettes: one per habit, one per project, one per district
// label. Split out of Village.tsx unchanged — these are the pieces that appear
// N times, while the one-off scenery stays in VillageScene where you can read
// the composition order top to bottom.

// Plant silhouettes by stage. Each stage is a real change in shape, not just
// scale — growth should read at a glance, from across the room.
export function PlantShape({ plant, x, y, scale = 1, changed = false, foliage = 'var(--emerald)', selected = false, cared = false, onClick }: {
  plant: Plant; x: number; y: number; scale?: number; changed?: boolean
  /** The season's green. Dormant plants ignore it: resting is resting in
   *  any weather, and it has to stay visually distinct from autumn. */
  foliage?: string
  /** Tapped — keeps a styled callout open, see VillageScene's EntityCallout. */
  selected?: boolean
  /** Click-to-care bounce (2026-08-24) — true for a brief window right
   *  after a click, see VillageScene's careFor(). */
  cared?: boolean
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
      className={[changed && 'village-changed', onClick && 'village-entity', selected && 'village-entity-selected', cared && 'village-tapped'].filter(Boolean).join(' ') || undefined}>
      {/* Native <title> stays as the a11y fallback (screen readers, and
          anyone hovering without JS) — the STYLED callout that appears on
          click lives in VillageScene, keyed off `selected`. */}
      <title>{`${plant.name} — ${plant.stage}${plant.dormant ? ', resting' : ''}`}</title>
      {/* Invisible, generously-sized hit area (2026-08-24) — a sprout is
          only ~7 SVG units wide, which on a phone-width render of the whole
          800-unit scene is a couple of physical pixels: functionally
          untappable without this. Doesn't grow the visible shape, only what
          registers a tap. */}
      {onClick && <circle cx={0} cy={-h / 2} r={Math.max(16, h / 2 + 6)} fill="transparent" style={{ pointerEvents: 'all' }} />}
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

export function BuildingShape({ building, x, y, scale = 1, changed = false, selected = false, cared = false, onClick }: {
  building: Building; x: number; y: number; scale?: number; changed?: boolean
  selected?: boolean
  /** Click-to-care bounce (2026-08-24) — see PlantShape's own doc. */
  cared?: boolean
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
      className={[changed && 'village-changed', onClick && 'village-entity', selected && 'village-entity-selected', cared && 'village-tapped'].filter(Boolean).join(' ') || undefined}>
      <title>{`${building.title} — ${building.phase}`}</title>
      {/* Same invisible hit-area reasoning as PlantShape — a blueprint-phase
          building is a thin 26x16 outline, easy to miss on a phone. */}
      {onClick && <circle cx={0} cy={-spec.h / 2} r={Math.max(18, spec.h / 2 + 6)} fill="transparent" style={{ pointerEvents: 'all' }} />}
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

export type DistrictIconKind = 'fish' | 'leaf' | 'home' | 'building' | 'book'

// Real silhouettes instead of abstract geometric glyphs (2026-08-22) — a
// district's icon should say what's actually there: a fish for the lake you
// rest by, a leaf for the forest that grows, the house for home, a small
// building for the projects going up, a book for the archive next to its own
// tree. Plain SVG paths, not emoji, for the same reason the glyphs they
// replace were plain characters and not emoji either — fill has to stay
// themeable.
//
// Exported (2026-08-22) so the same silhouette can be drawn twice: once on
// the district's nav badge (which floats free and can be dragged anywhere —
// see DistrictLabel below), and once fixed directly on the scenery itself —
// a fish actually in the lake, a leaf actually by the forest's plants — so
// the icon reads as "this is what's here" even when the badge has been
// dragged somewhere else. `x`/`y` place it directly (not badge-relative);
// callers pass the scene's own coordinates.
export function FeatureIcon({ kind, x = 0, y = 0, scale = 1, opacity = 1 }: {
  kind: DistrictIconKind; x?: number; y?: number; scale?: number; opacity?: number
}) {
  const body = (() => {
    switch (kind) {
      case 'fish':
        return (
          <g fill="var(--gold)">
            <path d="M -7 0 C -7 -4.2 -2.5 -6.5 2 -5.2 C 5.5 -4.2 8 -1.8 9.5 0 C 8 1.8 5.5 4.2 2 5.2 C -2.5 6.5 -7 4.2 -7 0 Z" />
            <path d="M 9.5 0 L 13.5 -3.5 L 13 0 L 13.5 3.5 Z" />
            <circle cx={-3.8} cy={-1.2} r={0.9} fill="var(--surface)" />
          </g>
        )
      case 'leaf':
        return (
          <g fill="var(--gold)">
            <path d="M 0 7 C -8 5 -8.5 -5.5 0 -8 C 8.5 -5.5 8 5 0 7 Z" />
            <path d="M 0 6.5 L 0 -6.5" stroke="var(--surface)" strokeWidth={0.9} fill="none" strokeLinecap="round" />
          </g>
        )
      case 'home':
        return (
          <g fill="var(--gold)">
            <path d="M -8 6 L -8 -1 L 0 -9 L 8 -1 L 8 6 L 3 6 L 3 -0.5 L -3 -0.5 L -3 6 Z" />
          </g>
        )
      case 'building':
        return (
          <g>
            <rect x={-6.5} y={-5} width={13} height={11} rx={1} fill="var(--gold)" fillOpacity={0.85} />
            <path d="M -7.5 -5 L 0 -10 L 7.5 -5" fill="none" stroke="var(--gold)" strokeWidth={1.1} strokeLinejoin="round" />
            <rect x={-3.5} y={-2} width={2.4} height={3} fill="var(--surface)" />
            <rect x={1.1} y={-2} width={2.4} height={3} fill="var(--surface)" />
          </g>
        )
      case 'book':
        return (
          <g fill="var(--gold)">
            <path d="M -7.5 -4.5 C -4.8 -6 -1.8 -6 0 -4.2 C 1.8 -6 4.8 -6 7.5 -4.5 L 7.5 5 C 4.8 3.5 1.8 3.5 0 5.2 C -1.8 3.5 -4.8 3.5 -7.5 5 Z" />
            <path d="M 0 -4.2 L 0 5.2" stroke="var(--surface)" strokeWidth={0.8} fill="none" />
          </g>
        )
    }
  })()
  return <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity} pointerEvents="none">{body}</g>
}

// Badge circles carry a soft dashed stroke (2026-08-22) — a small, cheap
// echo of Bloom's "every card is a little wonky" dashed-border language,
// applied to shape rather than to the theme's own fill colors, which stay
// exactly what the active theme says (per the design-language decision made
// alongside this batch — Bloom's hand-drawn *feel*, not its literal palette).
export function DistrictLabel({ x, y, icon, label, count, onClick, draggable = false, dragging = false, onPointerDown }: {
  x: number; y: number; icon: DistrictIconKind; label: string; count: string; onClick: () => void
  /** Arrange mode — see VillageScene's startDrag/onMoveLandmark. */
  draggable?: boolean
  dragging?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
}) {
  return (
    <g transform={`translate(${x} ${y})`} onClick={onClick} onPointerDown={onPointerDown}
      className="village-district" style={{ cursor: draggable ? (dragging ? 'grabbing' : 'grab') : 'pointer' }}>
      <title>{draggable ? `${label} — drag to move` : `${label} — ${count}. Click to open.`}</title>
      {/* Invisible hit area covering the whole badge + label stack, not
          just the painted circle (2026-08-24) — the gaps between the
          circle, icon, and the two text lines below it don't register taps
          in SVG on their own, and the visible badge alone is a small target
          on a phone-width render. */}
      <rect x={-22} y={-30} width={44} height={54} fill="transparent" style={{ pointerEvents: 'all' }} />
      {/* A dashed ring while arranging — the same visual language blueprint-
          phase buildings already use for "not settled yet" — so a landmark
          reads as movable without needing separate instructional copy on
          every pin. */}
      {draggable && (
        <circle cy={-14} r={18} fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3" opacity={dragging ? 0.9 : 0.45} />
      )}
      <circle cy={-14} r={14} fill="var(--surface)" stroke="var(--gold)" strokeWidth={0.9} strokeDasharray="1.5 1.8" opacity={0.9} />
      <circle cy={-14} r={14} fill="none" stroke="var(--border)" strokeWidth={0.6} />
      <FeatureIcon kind={icon} y={-14} />
      <text textAnchor="middle" fontSize={8.5} fill="var(--muted)" letterSpacing="0.06em" y={10}>{label.toUpperCase()}</text>
      <text textAnchor="middle" fontSize={7.5} fill="var(--muted)" opacity={0.6} y={21}>{count}</text>
    </g>
  )
}
