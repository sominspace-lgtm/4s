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

  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      {/* Invisible, generously-sized hit area (2026-08-24) — a sprout is
          only ~7 SVG units wide, which on a phone-width render of the whole
          800-unit scene is a couple of physical pixels: functionally
          untappable without this. A SIBLING of the visual group below, not
          a child of it — `transform-box: fill-box` (on .village-entity)
          computes its box from ALL descendant geometry regardless of
          paint/opacity, so nesting the hit circle inside that group threw
          off the scale animation's anchor point and made every bounce and
          hover visibly wobble/jump (2026-08-24 regression, fixed same day
          it shipped). Keeping it as a sibling means the visual group's own
          fill-box — and therefore its scale origin — only ever reflects the
          shape that's actually drawn. */}
      {onClick && <circle cx={0} cy={-h / 2} r={Math.max(16, h / 2 + 6)} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} />}
      <g onClick={handleClick}
        className={[changed && 'village-changed', onClick && 'village-entity', selected && 'village-entity-selected', cared && 'village-tapped'].filter(Boolean).join(' ') || undefined}>
        {/* Native <title> stays as the a11y fallback (screen readers, and
            anyone hovering without JS) — the STYLED callout that appears on
            click lives in VillageScene, keyed off `selected`. */}
        <title>{`${plant.name} — ${plant.stage}${plant.dormant ? ', resting' : ''}`}</title>
        {/* A soft grounding shadow (2026-08-24) — every piece in BloomScan's
            garden sits on one of these, and its absence here was a real part
            of why the village read flatter/less charming: nothing looked
            like it was actually standing on the ground, just pasted onto
            it. */}
        <ellipse cx={0} cy={1.5} rx={Math.max(4, w / 2.3)} ry={1.6} fill="var(--text)" opacity={0.12} />
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
    </g>
  )
}

export function BuildingShape({ building, x, y, scale = 1, changed = false, selected = false, cared = false, onClick, dark = false }: {
  building: Building; x: number; y: number; scale?: number; changed?: boolean
  selected?: boolean
  /** Click-to-care bounce (2026-08-24) — see PlantShape's own doc. */
  cared?: boolean
  onClick?: () => void
  /** Dusk/night (2026-08-24) — windows glow when it's actually dark out
   *  instead of unconditionally, same idea as Home's own windows below in
   *  VillageScene. During the day they read as plain, sun-lit glass. */
  dark?: boolean
}) {
  const spec = {
    blueprint:    { h: 16, fill: 'transparent',        stroke: 'var(--slate)',  dash: '3 3' },
    foundation:   { h: 14, fill: 'var(--slate)',       stroke: 'var(--slate)',  dash: '' },
    construction: { h: 38, fill: 'var(--amber)',       stroke: 'var(--amber)',  dash: '' },
    complete:     { h: 52, fill: 'var(--slate)',       stroke: 'var(--slate)',  dash: '' },
    landmark:     { h: 68, fill: 'var(--gold)',        stroke: 'var(--gold)',   dash: '' },
  }[building.phase]
  const w = 26

  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* Sibling, not a child of the .village-entity group — see PlantShape's
          own comment on why (fill-box's scale-origin calculation includes
          this circle's geometry if nested inside, throwing off every
          bounce/hover animation). */}
      {onClick && <circle cx={0} cy={-spec.h / 2} r={Math.max(18, spec.h / 2 + 6)} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} />}
      <g onClick={handleClick}
        className={[changed && 'village-changed', onClick && 'village-entity', selected && 'village-entity-selected', cared && 'village-tapped'].filter(Boolean).join(' ') || undefined}>
        <title>{`${building.title} — ${building.phase}`}</title>
        {/* Grounding shadow — same reasoning as PlantShape's own. */}
        <ellipse cx={0} cy={1.5} rx={w / 2 + 3} ry={2} fill="var(--text)" opacity={0.12} />
        {/* Corners rounded up from 2 to 5 (2026-08-24) — a softer, more
            BloomScan-like silhouette; still reads as a building, just not a
            hard-edged box. */}
        <rect
          x={-w / 2} y={-spec.h} width={w} height={spec.h} rx={5}
          fill={spec.fill} fillOpacity={building.phase === 'blueprint' ? 0 : 0.55}
          stroke={spec.stroke} strokeWidth={1.2} strokeDasharray={spec.dash} strokeOpacity={0.9}
        />
        {/* Sheen on the body — same reasoning as PlantShape's */}
        {building.phase !== 'blueprint' && (
          <rect x={-w / 2} y={-spec.h} width={w} height={spec.h} rx={5} fill="url(#vsheen)" />
        )}
        {/* roof, once it's actually a building — corners softened to match */}
        {(building.phase === 'complete' || building.phase === 'landmark') && (
          <path d={`M ${-w / 2 - 3} ${-spec.h} Q 0 ${-spec.h - 15} ${w / 2 + 3} ${-spec.h} Z`} fill={spec.stroke} fillOpacity={0.7} />
        )}
        {/* Windows — a finished thing has someone in it. Glow amber after
            dark; by day they're just glass (2026-08-24, was unconditionally
            lit before). */}
        {(building.phase === 'complete' || building.phase === 'landmark') && (
          <>
            <rect x={-7} y={-spec.h + 10} width={5} height={6} rx={1}
              fill={dark ? 'var(--amber)' : 'var(--surface2)'} opacity={dark ? 0.8 : 0.5}
              className={dark ? 'village-glow' : undefined} />
            <rect x={2} y={-spec.h + 10} width={5} height={6} rx={1}
              fill={dark ? 'var(--amber)' : 'var(--surface2)'} opacity={dark ? 0.6 : 0.4} />
          </>
        )}
        {building.phase === 'landmark' && (
          <text x={0} y={-spec.h - 17} textAnchor="middle" fontSize={11} fill="var(--gold)">◆</text>
        )}
      </g>
    </g>
  )
}

// Small ambient scenery — pond, bench, flower bed (2026-08-24) — pure
// decoration, no data behind any of it, same as GRASS_TUFTS/STONES/POLLEN in
// VillageScene. These are what make the composed area between districts read
// as "a place" rather than "the gaps between the things that matter" — the
// goal is Animal Crossing × stationery, not more UI. Flat shapes, theme-
// colored via CSS vars, same idiom as every other scene element.
export function PondShape({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={0.8}>
      <ellipse cx={0} cy={0} rx={22} ry={7} fill="var(--slate)" opacity={0.28} />
      <ellipse cx={0} cy={0} rx={22} ry={7} fill="none" stroke="var(--slate)" strokeWidth={0.7} opacity={0.35} />
      <ellipse cx={-5} cy={-1.5} rx={6} ry={1.6} fill="var(--surface)" opacity={0.25} />
    </g>
  )
}

export function BenchShape({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={2} rx={9} ry={1.6} fill="var(--text)" opacity={0.1} />
      <rect x={-8} y={-4} width={16} height={2} rx={0.8} fill="var(--slate)" opacity={0.75} />
      <rect x={-8} y={-1} width={16} height={1.6} rx={0.6} fill="var(--slate)" opacity={0.6} />
      <rect x={-7} y={-4} width={1.4} height={6} fill="var(--slate)" opacity={0.6} />
      <rect x={5.6} y={-4} width={1.4} height={6} fill="var(--slate)" opacity={0.6} />
    </g>
  )
}

export function FlowerBedShape({ x, y, scale = 1, hue = 'var(--blush)' }: { x: number; y: number; scale?: number; hue?: string }) {
  const petals = [-8, -3, 3, 8]
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={2} rx={13} ry={3.4} fill="var(--emerald)" opacity={0.18} />
      {petals.map((dx, i) => (
        <circle key={i} cx={dx} cy={-0.5 - (i % 2)} r={2} fill={hue} opacity={0.8} />
      ))}
    </g>
  )
}

// A short picket fence run (2026-08-25) — pure scenery, same "small fixed
// prop near the path" idiom as Bench/FlowerBed above. `length` is how many
// pickets, so one component covers both a short garden-edge run and a
// longer stretch without a second shape.
export function FenceShape({ x, y, length = 5, scale = 1 }: { x: number; y: number; length?: number; scale?: number }) {
  const spacing = 6
  const width = (length - 1) * spacing
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={0.75}>
      <rect x={-width / 2 - 1} y={-3.5} width={width + 2} height={1.4} fill="var(--border)" />
      {[...Array(length)].map((_, i) => (
        <rect key={i} x={-width / 2 + i * spacing - 0.7} y={-7} width={1.4} height={7} rx={0.5} fill="var(--border)" />
      ))}
    </g>
  )
}

// A lamppost (2026-08-25) — glows after dark, same window-glow reasoning as
// BuildingShape's own (`dark` gates the lit look rather than leaving it
// unconditionally on). Pure scenery, no click target.
export function LampShape({ x, y, dark = false, scale = 1 }: { x: number; y: number; dark?: boolean; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={1.5} rx={4} ry={1.2} fill="var(--text)" opacity={0.12} />
      <rect x={-0.8} y={-22} width={1.6} height={22} fill="var(--slate)" opacity={0.75} />
      <circle cy={-24} r={3.4} fill={dark ? 'var(--amber)' : 'var(--surface2)'} stroke="var(--slate)" strokeWidth={0.7}
        opacity={dark ? 0.9 : 0.6} className={dark ? 'village-glow' : undefined} />
    </g>
  )
}

// A mailbox, standing in for capture (2026-08-24) — Rest Lake's click used
// to open the Brief and focus the capture box; removing the lake removed
// that entry point too. This gives "jot something down" a small, real place
// in the scene again without needing a whole district for it.
export function MailboxShape({ x, y, onClick }: { x: number; y: number; onClick?: () => void }) {
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  return (
    <g transform={`translate(${x} ${y})`}>
      {onClick && <circle cx={0} cy={-8} r={14} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} />}
      <g onClick={handleClick} className={onClick ? 'village-entity' : undefined}>
        <title>Jot something down</title>
        <ellipse cx={0} cy={1.5} rx={6} ry={1.6} fill="var(--text)" opacity={0.12} />
        <rect x={-1} y={-14} width={2} height={14} fill="var(--slate)" opacity={0.7} />
        <path d="M -5 -14 L -5 -20 Q -5 -23 0 -23 Q 5 -23 5 -20 L 5 -14 Z" fill="var(--gold)" fillOpacity={0.7} stroke="var(--gold)" strokeWidth={0.8} />
        <rect x={-3.5} y={-19.5} width={3} height={2} rx={0.5} fill="var(--surface)" opacity={0.8} />
      </g>
    </g>
  )
}

// A signpost toward Trips (2026-08-24) — Places' Trips sub-tab has no
// district of its own; a signpost at the village edge, pointing off-canvas,
// gives "somewhere else" a presence without inventing an eighth district.
export function SignpostShape({ x, y, label, onClick }: { x: number; y: number; label: string; onClick?: () => void }) {
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  return (
    <g transform={`translate(${x} ${y})`}>
      {onClick && <circle cx={8} cy={-14} r={16} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} />}
      <g onClick={handleClick} className={onClick ? 'village-entity' : undefined}>
        <title>{label}</title>
        <ellipse cx={0} cy={1.5} rx={4} ry={1.3} fill="var(--text)" opacity={0.12} />
        <rect x={-1} y={-22} width={2} height={22} fill="var(--slate)" opacity={0.75} />
        <path d="M 0 -20 L 20 -17 L 0 -14 Z" fill="var(--gold)" fillOpacity={0.75} stroke="var(--gold)" strokeWidth={0.7} />
      </g>
    </g>
  )
}

// Birthday bunting (2026-08-24) — a small flag string over the People
// district, only on the actual day (see VillageScene's use of
// soonestBirthdayDays === 0). No new data: the same daysUntilBirthday
// already driving the district's count badge.
export function BuntingShape({ x, y }: { x: number; y: number }) {
  const flags = [-14, -7, 0, 7, 14]
  return (
    <g transform={`translate(${x} ${y})`} opacity={0.85} pointerEvents="none">
      <path d={`M ${flags[0]} -30 Q 0 -36 ${flags[flags.length - 1]} -30`} fill="none" stroke="var(--border)" strokeWidth={0.6} />
      {flags.map((fx, i) => {
        const fy = -30 - Math.sin((i / (flags.length - 1)) * Math.PI) * 6
        return <path key={i} d={`M ${fx} ${fy} l 3 4 l -6 0 Z`} fill={i % 2 === 0 ? 'var(--gold)' : 'var(--blush)'} />
      })}
    </g>
  )
}

// A memory-map marker (2026-08-24) — one small dot per date-idea area (SLO,
// Santa Cruz, whatever), scattered along the path. Deliberately smaller and
// quieter than a full DistrictLabel tile: these are secondary, browsable
// content, not another top-level section — clicking opens Household's Date
// Ideas, already grouped "By Area" there (see HouseholdDateIdeas.tsx).
export function MemoryMarker({ x, y, label, count, onClick }: {
  x: number; y: number; label: string; count: number; onClick?: () => void
}) {
  return (
    <g transform={`translate(${x} ${y})`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <title>{`${label} — ${count} idea${count === 1 ? '' : 's'}`}</title>
      <circle r={10} fill="transparent" style={{ pointerEvents: 'all' }} />
      <circle r={3.2} fill="var(--blush)" stroke="var(--surface)" strokeWidth={1} opacity={0.9} />
    </g>
  )
}

// The actual cast (2026-08-25, replaces the per-contact PersonMarker dots
// above) — three fixed, one-of-a-kind characters standing near Home, not a
// data-driven marker per usePeople() contact. This is a deliberate, bounded
// exception to the "objects, not figures" rule the district icons follow
// (see FeatureIcon's own header comment): that rule is about avoiding a
// figure per plant/building/district at scale, which doesn't apply to
// exactly three named, always-present characters — closer in spirit to the
// Mailbox than to a per-entity pattern.
export function VillagerShape({ x, y, name, hairColor, outfitColor, onClick }: {
  x: number; y: number; name: string; hairColor: string; outfitColor: string; onClick?: () => void
}) {
  return (
    <g transform={`translate(${x} ${y})`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <title>{name}</title>
      <ellipse cx={0} cy={1} rx={7} ry={1.6} fill="var(--text)" opacity={0.12} />
      {/* Body — rounded, faceless, matching the flat object style used
          everywhere else in the scene. */}
      <path d="M -6 0 Q -6 -12 0 -12 Q 6 -12 6 0 Z" fill={outfitColor} />
      {/* Head + hair — a simple cap shape is enough to read as a person
          without drawing an actual face. */}
      <circle cx={0} cy={-15} r={5} fill="#E8C4A0" />
      <path d="M -5 -16 Q -5 -21 0 -21 Q 5 -21 5 -16 Q 5 -18.5 0 -19 Q -5 -18.5 -5 -16 Z" fill={hairColor} />
    </g>
  )
}

export function CatShape({ x, y, name = 'Somi', onClick }: {
  x: number; y: number; name?: string; onClick?: () => void
}) {
  return (
    <g transform={`translate(${x} ${y})`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <title>{name}</title>
      <ellipse cx={0} cy={1} rx={7} ry={1.6} fill="var(--text)" opacity={0.12} />
      {/* Tail, curled behind the body */}
      <path d="M 5 -3 Q 10 -2 9 -7 Q 8.5 -9.5 6 -8.5" fill="none" stroke="var(--amber)" strokeWidth={2} strokeLinecap="round" />
      {/* Sitting body */}
      <path d="M -6 0 Q -6 -8 0 -8 Q 6 -8 6 0 Z" fill="var(--amber)" />
      <path d="M -3.5 0 Q -3.5 -4 0 -4 Q 3.5 -4 3.5 0 Z" fill="var(--surface)" opacity={0.9} />
      {/* Head + ears */}
      <circle cx={0} cy={-10} r={4} fill="var(--amber)" />
      <path d="M -3.5 -13 L -5 -17 L -1.5 -14 Z" fill="var(--amber)" />
      <path d="M 3.5 -13 L 5 -17 L 1.5 -14 Z" fill="var(--amber)" />
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

export type DistrictIconKind = 'leaf' | 'home' | 'building' | 'book' | 'places' | 'people'

// Small illustrated objects, not figures (2026-08-24, replaces the
// illustrated-figure pass from earlier the same day) — the same "real prop,
// small grounding shadow, flat gold-family fill, one surface/blush accent
// detail" construction as MailboxShape/SignpostShape/PondShape/BenchShape,
// so every small thing in the scene — nav badge icon or standalone prop —
// reads as one consistent object language instead of two (people-figures
// for districts, objects for everything added since). A sprout in a pot for
// the forest, a house for Home, a small building for Projects, a stack of
// books for the Archive, a planted map pin for Places, a wrapped gift for
// People (not a second person-figure — the district is already named
// "People"; the icon says what you'd bring them). `kind` keeps its
// original district-content names even though none of these are people
// anymore — internal id, not user-facing.
//
// Exported (2026-08-22) so the same icon can be drawn twice: once on the
// district's nav badge (which floats free and can be dragged anywhere — see
// DistrictLabel below), and once fixed directly on the scenery itself, so
// it reads as "this is what's here" even when the badge has been dragged
// somewhere else. `x`/`y` place it directly (not badge-relative); callers
// pass the scene's own coordinates.
export function FeatureIcon({ kind, x = 0, y = 0, scale = 1, opacity = 1 }: {
  kind: DistrictIconKind; x?: number; y?: number; scale?: number; opacity?: number
}) {
  const body = (() => {
    switch (kind) {
      case 'leaf': // Growth Forest — a sprout in a pot
        return (
          <g>
            <ellipse cx={0} cy={4.5} rx={5} ry={1.2} fill="var(--text)" opacity={0.12} />
            <path d="M -3.5 4 L -2.8 -1 L 2.8 -1 L 3.5 4 Z" fill="var(--gold)" opacity={0.55} />
            <path d="M 0 -1 Q -4 -6 -1 -10 Q 2 -8 0 -1 Z" fill="var(--gold)" />
            <path d="M 0 -1 Q 4 -5 2 -9 Q -1 -7 0 -1 Z" fill="var(--gold)" opacity={0.8} />
          </g>
        )
      case 'home': // Home — a small house
        return (
          <g>
            <ellipse cx={0} cy={4.5} rx={7} ry={1.4} fill="var(--text)" opacity={0.12} />
            <path d="M -6 4 L -6 -3 L 0 -9 L 6 -3 L 6 4 Z" fill="var(--gold)" fillOpacity={0.55} stroke="var(--gold)" strokeWidth={0.8} />
            <rect x={-2} y={-1.5} width={4} height={5.5} fill="var(--surface)" opacity={0.85} />
          </g>
        )
      case 'building': // Projects — a small building, crane beside it
        return (
          <g>
            <ellipse cx={0} cy={4.5} rx={6.5} ry={1.3} fill="var(--text)" opacity={0.12} />
            <rect x={-5} y={-8} width={10} height={12} rx={1} fill="var(--gold)" fillOpacity={0.6} stroke="var(--gold)" strokeWidth={0.7} />
            <rect x={-3} y={-5.5} width={2} height={2} fill="var(--surface)" opacity={0.85} />
            <rect x={1} y={-5.5} width={2} height={2} fill="var(--surface)" opacity={0.85} />
            <rect x={-3} y={-1.5} width={2} height={2} fill="var(--surface)" opacity={0.85} />
            <rect x={1} y={-1.5} width={2} height={2} fill="var(--surface)" opacity={0.85} />
            <path d="M 5 -8 L 8 -13" stroke="var(--gold)" strokeWidth={1} fill="none" strokeLinecap="round" />
          </g>
        )
      case 'book': // Archive — a small stack of books
        return (
          <g>
            <ellipse cx={0} cy={4.5} rx={6.5} ry={1.3} fill="var(--text)" opacity={0.12} />
            <rect x={-6} y={0.5} width={12} height={3} rx={0.6} fill="var(--gold)" opacity={0.55} />
            <rect x={-5} y={-2.5} width={10} height={3} rx={0.6} fill="var(--gold)" opacity={0.7} />
            <rect x={-4} y={-5.5} width={8} height={3} rx={0.6} fill="var(--gold)" opacity={0.85} />
          </g>
        )
      case 'places': // Places — a map pin, planted
        return (
          <g>
            <ellipse cx={0} cy={4.5} rx={5} ry={1.2} fill="var(--text)" opacity={0.12} />
            <path d="M 0 -12 C 4 -12 6 -9 6 -6 C 6 -2 0 4 0 4 C 0 4 -6 -2 -6 -6 C -6 -9 -4 -12 0 -12 Z" fill="var(--gold)" opacity={0.75} />
            <circle cx={0} cy={-6} r={2} fill="var(--surface)" opacity={0.85} />
          </g>
        )
      case 'people': // People — a wrapped gift, not another figure
        return (
          <g>
            <ellipse cx={0} cy={4.5} rx={5.5} ry={1.2} fill="var(--text)" opacity={0.12} />
            <rect x={-5} y={-3} width={10} height={7} rx={1} fill="var(--gold)" opacity={0.6} />
            <rect x={-5.5} y={-5} width={11} height={2.5} rx={0.8} fill="var(--gold)" opacity={0.8} />
            <rect x={-1} y={-5} width={2} height={9} fill="var(--surface)" opacity={0.85} />
            <path d="M -1.5 -5 Q -4 -8 -1 -9 Q 0 -7 -1.5 -5 Z" fill="var(--blush)" opacity={0.85} />
            <path d="M 1.5 -5 Q 4 -8 1 -9 Q 0 -7 1.5 -5 Z" fill="var(--blush)" opacity={0.85} />
          </g>
        )
    }
  })()
  return <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity} pointerEvents="none">{body}</g>
}

// District pins redrawn as iOS-home-screen-style widget tiles (2026-08-24,
// was a round badge with a dashed ring) — a rounded square with the icon
// centered, a glossy top-left sheen, a soft drop shadow, and the count
// shown as a small corner badge the way an iOS icon shows an unread count,
// rather than as a separate text line. The label still sits below, same as
// a home-screen icon's caption.
export function DistrictLabel({ x, y, icon, label, count, onClick, draggable = false, dragging = false, onPointerDown }: {
  x: number; y: number; icon: DistrictIconKind; label: string; count: string; onClick: () => void
  /** Arrange mode — see VillageScene's startDrag/onMoveLandmark. */
  draggable?: boolean
  dragging?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
}) {
  const tileR = 9 // corner radius — an iOS icon's is ~22% of its width; 9 on a 30-wide tile lands right there
  return (
    <g transform={`translate(${x} ${y})`} onClick={onClick} onPointerDown={onPointerDown}
      className="village-district" style={{ cursor: draggable ? (dragging ? 'grabbing' : 'grab') : 'pointer' }}>
      <title>{draggable ? `${label} — drag to move` : `${label} — ${count}. Click to open.`}</title>
      {/* Invisible hit area covering the whole tile + label stack, not just
          the painted square (2026-08-24) — the gaps around it don't
          register taps in SVG on their own, and the visible tile alone is
          a small target on a phone-width render. */}
      <rect x={-22} y={-32} width={44} height={56} fill="transparent" style={{ pointerEvents: 'all' }} />
      {/* A dashed ring while arranging — squared off to match the tile
          instead of the old circular badge, same "not settled yet" language
          blueprint-phase buildings already use. */}
      {draggable && (
        <rect x={-19} y={-31} width={38} height={38} rx={12} fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3" opacity={dragging ? 0.9 : 0.45} />
      )}
      {/* Soft drop shadow, offset down — the thing that makes a tile read as
          sitting above the scene rather than printed onto it, same
          grounding-shadow language the plants/buildings use. */}
      <rect x={-15} y={-27.5} width={30} height={30} rx={tileR} fill="var(--text)" opacity={0.16} />
      <rect x={-15} y={-29} width={30} height={30} rx={tileR} fill="var(--surface)" />
      {/* Glossy sheen, top-left — the same highlight every other tile/roof
          in the scene already uses, here doubling as the icon-tile gloss
          an actual iOS icon has. */}
      <rect x={-15} y={-29} width={30} height={30} rx={tileR} fill="url(#vsheen)" />
      <rect x={-15} y={-29} width={30} height={30} rx={tileR} fill="none" stroke="var(--gold)" strokeWidth={1} strokeOpacity={0.5} />
      <FeatureIcon kind={icon} y={-14} />
      {/* A small numeric corner badge, iOS-notification-style, ON TOP of
          the tile whenever the count actually leads with a number (plants
          growing, buildings standing, tree-rings/months) — a bonus glance,
          not a replacement for the text below, since some counts are words
          ("today", "ready when you are") with nothing to badge. */}
      {count.match(/^\d+/) && (
        <>
          <circle cx={11} cy={-27} r={7} fill="var(--rose)" stroke="var(--surface)" strokeWidth={1.4} />
          <text x={11} y={-27} textAnchor="middle" dominantBaseline="central" fontSize={6} fill="#fff" fontWeight={600}>
            {count.match(/^\d+/)![0]}
          </text>
        </>
      )}
      {/* Halo behind both lines (2026-08-25) — this text sits directly on
          the ground/sky, not a flat card, so "readable in theory" fill
          colors were still blending into whatever happened to be drawn
          behind them. paintOrder="stroke" draws a solid --surface stroke
          UNDER the fill, same trick map labels use over photo backgrounds —
          the words now read the same regardless of what's underneath. Sizes
          bumped too (8.5->10.5 / 7->8.5), and the count line's own extra
          opacity dropped since --muted already carries the right alpha now
          (stacking both was making it fainter than intended). */}
      <text textAnchor="middle" fontSize={10.5} fill="var(--text)" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round" letterSpacing="0.04em" y={10}>{label}</text>
      <text textAnchor="middle" fontSize={8.5} fill="var(--muted)" stroke="var(--surface)" strokeWidth={2.5} paintOrder="stroke" strokeLinejoin="round" y={21}>{count}</text>
    </g>
  )
}
