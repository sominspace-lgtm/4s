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

// Ground cover (2026-08-27, round 6) — a bush, a grass clump, a flower
// cluster. These are the three ingredients the reference cozy-village art
// uses to fill ground, and the scene had no equivalent of any of them: its
// only ground texture was a single-stroke grass tuft and a flat ellipse
// stone, both tiny and both confined to one thin band at the ground line.
//
// A bush is drawn as overlapping circles with a lighter cap and a darker
// underside rather than one flat blob, for the same reason PlantShape has a
// sheen: a flat-filled shape reads as a paper cutout, and volume is most of
// what makes this style feel cozy rather than diagrammatic. `tone` and
// `light` are passed in by the caller so a whole scattered layer can share
// one depth-appropriate palette slice — see VillageScene's GREENS.
export function BushShape({ x, y, scale = 1, tone, light, opacity = 1 }: {
  x: number; y: number; scale?: number; tone: string; light: string; opacity?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity} pointerEvents="none">
      <ellipse cx={0} cy={1.5} rx={11} ry={2.2} fill="var(--text)" opacity={0.13} />
      {/* A soft dark edge on the base circles (round 7 fix, 2026-08-27) — the
          bush's own tone sits close in hue to the ground it's drawn on, so
          without an edge it barely registered against the grass at all
          (live report showed a foreground almost entirely grass/flowers,
          no visible bushes). A thin var(--text) stroke at low opacity reads
          as a shadow line, same idiom as this file's grounding ellipses,
          without needing a second darker color. */}
      <circle cx={-6} cy={-3.5} r={5.4} fill={tone} stroke="var(--text)" strokeWidth={0.6} strokeOpacity={0.18} />
      <circle cx={6} cy={-3} r={5} fill={tone} stroke="var(--text)" strokeWidth={0.6} strokeOpacity={0.18} />
      <circle cx={0} cy={-6.5} r={6.6} fill={tone} stroke="var(--text)" strokeWidth={0.6} strokeOpacity={0.18} />
      {/* Sunlit cap and shadowed base — the volume, in two shapes. */}
      <circle cx={-1.5} cy={-8.5} r={4} fill={light} opacity={0.75} />
      <circle cx={4} cy={-4.5} r={2.6} fill={light} opacity={0.4} />
      <path d="M -11 -1 Q 0 3.5 11 -1 Q 0 1.5 -11 -1 Z" fill="var(--text)" opacity={0.12} />
    </g>
  )
}

// A clump of grass blades, not one stroke — the existing GRASS_TUFTS draw a
// single 4-9 unit arc each, which at real render size is a hairline. A clump
// of five blades at varying heights reads as actual ground cover.
export function GrassClumpShape({ x, y, scale = 1, tone, opacity = 1 }: {
  x: number; y: number; scale?: number; tone: string; opacity?: number
}) {
  const blades = [
    { dx: -4.5, h: 6, lean: -2.5 }, { dx: -2.2, h: 9, lean: -1 },
    { dx: 0, h: 11, lean: 0.5 }, { dx: 2.3, h: 8.5, lean: 1.8 },
    { dx: 4.6, h: 5.5, lean: 3 },
  ]
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity} pointerEvents="none">
      {blades.map((b, i) => (
        <path key={i} d={`M ${b.dx} 0 Q ${b.dx + b.lean * 0.4} ${-b.h * 0.6} ${b.dx + b.lean} ${-b.h}`}
          fill="none" stroke={tone} strokeWidth={1.6} strokeLinecap="round" />
      ))}
    </g>
  )
}

// A small cluster of wildflowers on a bed of leaves — the pop of color the
// reference art scatters through otherwise-green ground.
export function WildflowerShape({ x, y, scale = 1, tone, hue, opacity = 1 }: {
  x: number; y: number; scale?: number; tone: string; hue: string; opacity?: number
}) {
  const stems = [{ dx: -3.5, h: 7 }, { dx: 0, h: 9.5 }, { dx: 3.5, h: 6.5 }]
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity} pointerEvents="none">
      <ellipse cx={0} cy={0.5} rx={7} ry={1.8} fill={tone} opacity={0.45} />
      {stems.map((s, i) => (
        <g key={i}>
          <path d={`M ${s.dx} 0 Q ${s.dx + 0.6} ${-s.h * 0.6} ${s.dx} ${-s.h}`} fill="none" stroke={tone} strokeWidth={1} strokeLinecap="round" />
          <circle cx={s.dx} cy={-s.h - 1} r={2} fill={hue} />
          <circle cx={s.dx - 0.5} cy={-s.h - 1.6} r={0.8} fill="#FFFDF5" opacity={0.55} />
        </g>
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
      {/* A soft bloom around the lamp head at night (round 4, 2026-08-27) —
          was just the 3.4r head itself with no halo, easy to lose against a
          dark sky even while lit. Same layered-glow idea as the sun/moon. */}
      {dark && <circle cy={-24} r={8} fill="var(--amber)" opacity={0.18} filter="url(#vglow)" />}
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
export function VillagerShape({ x, y, name, hairColor, outfitColor, scale = 1, onClick }: {
  x: number; y: number; name: string; hairColor: string; outfitColor: string
  /** Round 4 bug-fix (2026-08-27) — Sylvia/Harry were drawn at 1x in a
   *  12×21-unit box, which on the rendered canvas is a couple dozen physical
   *  pixels: too small for the round-4 outfit-hem/blush detail to actually
   *  read ("figures look too basic"). The detail was already there; it just
   *  needed to be big enough to see. Scales from the feet (local origin),
   *  so a taller figure doesn't float above the ground. */
  scale?: number
  onClick?: () => void
}) {
  // stopPropagation (2026-08-26) — without it a tap also bubbles to the
  // scene's own onClick={() => setSelected(null)}, firing a second state
  // update right behind the figure's own handler on every single tap.
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} onClick={handleClick}
      className={onClick ? 'village-entity' : undefined}
      style={{ cursor: onClick ? 'pointer' : undefined }}>
      <title>{name}</title>
      {/* Invisible hit-padding (2026-08-25 fix) — the figure itself is only
          ~12×21 SVG units, which becomes a genuinely hard-to-tap target once
          scaled to a real screen ("can't click the figures"). Every other
          clickable prop in the scene (Mailbox, memory markers, district
          labels) has this same oversized transparent hit circle; this one
          was missing it. */}
      {onClick && <circle cx={0} cy={-9} r={16} fill="transparent" style={{ pointerEvents: 'all' }} />}
      <ellipse cx={0} cy={1} rx={7} ry={1.6} fill="var(--text)" opacity={0.12} />
      {/* Body — rounded, faceless, matching the flat object style used
          everywhere else in the scene. Round 4 (2026-08-27): a two-tone
          outfit (a small darker hem) and simple feet, so the silhouette
          reads as clothed rather than a single flat blob — still faceless
          on purpose, that part of the style stays. */}
      <path d="M -6 0 Q -6 -12 0 -12 Q 6 -12 6 0 Z" fill={outfitColor} />
      <path d="M -6 -1 Q -6 1.5 -4.5 2 L -3.5 2 L -4 -1 Z" fill={outfitColor} opacity={0.7} />
      <path d="M 6 -1 Q 6 1.5 4.5 2 L 3.5 2 L 4 -1 Z" fill={outfitColor} opacity={0.7} />
      <ellipse cx={-4} cy={2.2} rx={1.6} ry={0.9} fill="var(--slate)" opacity={0.5} />
      <ellipse cx={4} cy={2.2} rx={1.6} ry={0.9} fill="var(--slate)" opacity={0.5} />
      {/* Head + hair — a simple cap shape is enough to read as a person
          without drawing an actual face. A soft blush pair adds warmth
          without needing actual features. */}
      <circle cx={0} cy={-15} r={5} fill="#E8C4A0" />
      <circle cx={-2.6} cy={-13.5} r={1} fill="var(--blush)" opacity={0.4} />
      <circle cx={2.6} cy={-13.5} r={1} fill="var(--blush)" opacity={0.4} />
      <path d="M -5 -16 Q -5 -21 0 -21 Q 5 -21 5 -16 Q 5 -18.5 0 -19 Q -5 -18.5 -5 -16 Z" fill={hairColor} />
    </g>
  )
}

// Somi's real coloring (2026-08-25) — white/grey siamese mix, blue eyes.
// Fixed hex, not theme vars, for the same reason grass reads green
// elsewhere in this file: a specific cat's actual coat isn't themeable.
// Siamese "points" (ears, tail, face mask) run a cooler blue-grey against
// a warm white body/chest.
const SOMI_BODY = '#F3EFE6'
const SOMI_POINT = '#8B95A3'
const SOMI_EYE = '#5C8FB5'

export function CatShape({ x, y, name = 'Somi', scale = 1, onClick }: {
  x: number; y: number; name?: string
  /** Same reasoning as VillagerShape's own `scale` (round 4 bug-fix,
   *  2026-08-27) — the whiskers/paws/nose added earlier this round were
   *  too small to actually see at 1x. */
  scale?: number
  onClick?: () => void
}) {
  // stopPropagation, same reason as VillagerShape above.
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} onClick={handleClick}
      className={onClick ? 'village-entity' : undefined}
      style={{ cursor: onClick ? 'pointer' : undefined }}>
      <title>{name}</title>
      {/* Same oversized invisible hit circle as VillagerShape — see its own
          2026-08-25 fix comment ("can't click the figures"). */}
      {onClick && <circle cx={0} cy={-6} r={14} fill="transparent" style={{ pointerEvents: 'all' }} />}
      <ellipse cx={0} cy={1} rx={7} ry={1.6} fill="var(--text)" opacity={0.12} />
      {/* Tail, curled behind the body — a point, like the ears */}
      <path d="M 5 -3 Q 10 -2 9 -7 Q 8.5 -9.5 6 -8.5" fill="none" stroke={SOMI_POINT} strokeWidth={2} strokeLinecap="round" />
      {/* Sitting body, with two front paws suggested at the base — round 4
          (2026-08-27), was a plain rounded blob with no feet at all.
          Outline strengthened round 8 (2026-08-27) — SOMI_BODY is a near-
          white cream sitting on the scene's own pale-green ground, and at
          0.35 stroke opacity the two were close enough in value that Somi
          nearly disappeared (live report: barely visible, same low-
          contrast problem BushShape had against the same ground before
          its own edge fix). */}
      <path d="M -6 0 Q -6 -8 0 -8 Q 6 -8 6 0 Z" fill={SOMI_BODY} stroke={SOMI_POINT} strokeWidth={0.7} strokeOpacity={0.6} />
      <path d="M -3.5 0 Q -3.5 -4 0 -4 Q 3.5 -4 3.5 0 Z" fill="var(--surface)" opacity={0.6} />
      <ellipse cx={-2.2} cy={0.3} rx={1.6} ry={1} fill={SOMI_BODY} stroke={SOMI_POINT} strokeWidth={0.5} strokeOpacity={0.5} />
      <ellipse cx={2.2} cy={0.3} rx={1.6} ry={1} fill={SOMI_BODY} stroke={SOMI_POINT} strokeWidth={0.5} strokeOpacity={0.5} />
      {/* Head + ears (points) */}
      <circle cx={0} cy={-10} r={4} fill={SOMI_BODY} stroke={SOMI_POINT} strokeWidth={0.7} strokeOpacity={0.6} />
      <path d="M -3.5 -13 L -5 -17 L -1.5 -14 Z" fill={SOMI_POINT} />
      <path d="M 3.5 -13 L 5 -17 L 1.5 -14 Z" fill={SOMI_POINT} />
      {/* Whiskers and a tiny nose — round 4, the one thing missing that
          makes a cat silhouette read as "cat" rather than "small animal." */}
      <g stroke={SOMI_POINT} strokeWidth={0.35} strokeLinecap="round" opacity={0.55}>
        <line x1={-1.5} y1={-8.7} x2={-5} y2={-9.2} />
        <line x1={-1.5} y1={-8.3} x2={-5} y2={-8.1} />
        <line x1={1.5} y1={-8.7} x2={5} y2={-9.2} />
        <line x1={1.5} y1={-8.3} x2={5} y2={-8.1} />
      </g>
      <path d="M -0.6 -8.6 L 0.6 -8.6 L 0 -7.9 Z" fill="var(--blush)" opacity={0.75} />
      {/* Blue eyes */}
      <circle cx={-1.4} cy={-10} r={0.7} fill={SOMI_EYE} />
      <circle cx={1.4} cy={-10} r={0.7} fill={SOMI_EYE} />
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

// Fixed warm building-material colors (2026-08-27 fix, round two — the first
// pass reused `var(--gold)` for walls/roofs, following the same convention
// FeatureIcon already used). That was wrong for this purpose: Village always
// runs under THEMES.bloom regardless of the user's real theme (see Village.tsx's
// own header comment), and Bloom's `--gold` is `#4f6350` — a muted dark sage
// green, repurposed for text-safe contrast on cream, not an actual gold/warm
// tone. Every building rendered in that same dull green as a result, reading
// as low-contrast and washed-out against the night sky exactly as reported.
// Same reasoning CatShape/grass already use fixed hex instead of theme vars
// ("a specific cat's actual coat isn't themeable") — a little house's walls
// aren't themeable either; they're just warm.
// Exported (2026-08-27, round 6) — VillageScene's own dedicated "Home — the
// anchor" structure (a separate, larger house drawn directly in that file,
// not through DistrictArt) had never been updated to these fixed colors and
// was still using var(--gold)/var(--slate) for its roof and trim — the same
// bug this whole file was fixed for in round two, just in a spot that fix
// never reached. Its roof rendered dark sage green (Bloom's --gold) right
// next to this file's correctly-orange ROOF, which is what actually made
// two houses look different enough to count as two (see VillageScene's own
// fix comment on that block).
export const WALL = '#F0DCAE'
export const WALL_SHADOW = '#D8BE87'
export const ROOF = '#B9754A'
export const ROOF_LIGHT = '#CC8B5C'
export const TRIM = '#6B5640'

// Each district as its own small illustrated place (2026-08-27, replaces the
// 2026-08-24 uniform "iOS widget tile" — same FeatureIcon inside a rounded
// square for all six). The uniform tile was a deliberate, considered choice
// (documented in FeatureIcon's own header comment) and this reverses it on
// purpose: "a little house you'd want to visit" reads very differently from
// "the Home icon," and that's the whole ask. Same construction language the
// rest of the scene already uses elsewhere (grounding shadow ellipse,
// `url(#vsheen)` gloss, `dark`-gated warm window glow — see BuildingShape/
// CatShape) instead of the old flat icon-on-a-badge. Scaled up ~30% from the
// first pass (round two, same reason as the color fix above) — measured
// against a real screenshot, the buildings read as small props next to their
// own labels; this wrapper is the single knob that fixes that everywhere.
function DistrictArt({ kind, dark }: { kind: DistrictIconKind; dark: boolean }) {
  switch (kind) {
    case 'home': // Nothing — Home already has its own real house, drawn directly in
      // VillageScene ("Home — the anchor of the village," translate(400, GROUND_Y-4)).
      // This case used to draw a SECOND small house right on top of it (round 6 fix,
      // 2026-08-27 — this was the actual, literal "two houses" the whole time: not
      // Projects or Archive, which every prior round chased, but Home rendered twice —
      // once as the big dedicated structure, once again here. DistrictLabel still
      // renders its hit-rect and "Home" label at this position for click/drag; it just
      // has nothing left to draw, since the real house already exists a few pixels away.
      return null
    case 'leaf': // Growth Forest — a small grove, threaded with a path, not one potted sprout.
      return (
        <g>
          <ellipse cx={0} cy={2} rx={14} ry={2.2} fill="var(--text)" opacity={0.16} />
          {/* A path segment between the trees (2026-08-27, round 3) — same
              stroke language as PATH_D — so this reads as a place you walk
              INTO, not three trees standing in a row. */}
          <path d="M -11 2 Q -2 4 4 1 T 11 2" stroke="var(--surface2)" strokeWidth={2.5} strokeLinecap="round" opacity={0.4} fill="none" />
          <path d="M -11 2 Q -2 4 4 1 T 11 2" stroke="var(--border)" strokeWidth={2.5} strokeDasharray="1 5" strokeLinecap="round" opacity={0.5} fill="none" />
          <g transform="translate(-9 -1)">
            <rect x={-1} y={-4} width={2} height={5} fill={TRIM} opacity={0.8} />
            <path d="M -6 -3 L 0 -14 L 6 -3 Z" fill="var(--emerald)" fillOpacity={0.85} />
          </g>
          <g>
            <rect x={-1.2} y={-5} width={2.4} height={7} fill={TRIM} opacity={0.85} />
            <path d="M -8 -4 L 0 -22 L 8 -4 Z" fill="var(--emerald)" />
            <path d="M -6.5 -10 L 0 -24 L 6.5 -10 Z" fill="var(--emerald)" opacity={0.85} />
          </g>
          <g transform="translate(9 1)">
            <rect x={-1} y={-3} width={2} height={4} fill={TRIM} opacity={0.8} />
            <circle cx={0} cy={-6} r={5.5} fill="var(--emerald)" fillOpacity={0.8} />
          </g>
        </g>
      )
    case 'building': // Projects — a construction site: stacked lumber, a sawhorse, the crane.
      // No walls, no roof at all (round 6 fix, 2026-08-27 — round 5's flat-roof revision was
      // STILL a box with a roof and windows, and at real render size that reads as "a house"
      // regardless of the roofline, live report "still 2 houses in the middle"). A workshop
      // that hasn't built its walls yet can't be mistaken for one.
      return (
        <g>
          <ellipse cx={0} cy={2} rx={14} ry={2.3} fill="var(--text)" opacity={0.17} />
          {/* Stacked lumber */}
          <g transform="translate(-8 -0.5)">
            <rect x={-5.5} y={-2.2} width={11} height={2} rx={0.5} fill={ROOF} stroke={TRIM} strokeWidth={0.4} />
            <rect x={-5} y={-4.2} width={10} height={2} rx={0.5} fill={ROOF_LIGHT} stroke={TRIM} strokeWidth={0.4} />
            <rect x={-5.5} y={-6.2} width={11} height={2} rx={0.5} fill={ROOF} stroke={TRIM} strokeWidth={0.4} />
          </g>
          {/* A sawhorse */}
          <g transform="translate(3 1.5)" stroke={TRIM} strokeWidth={0.9} strokeLinecap="round" fill="none">
            <path d="M -5 0 L -1.5 -6.5 L 2 0" />
            <path d="M -3.6 -3.5 L 1 -3.5" />
          </g>
          {/* Scaffold pole + the same crane silhouette as before. */}
          <rect x={7} y={-24} width={1.4} height={26} fill={TRIM} opacity={0.85} />
          <path d="M 7.7 -24 L 7.7 -32 L 15 -29" stroke={TRIM} strokeWidth={1.1} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 15 -29 L 15 -23.5" stroke={TRIM} strokeWidth={0.8} fill="none" strokeLinecap="round" />
          {/* String marking out a foundation — "under construction," not "a finished house." */}
          <path d="M -12 1.5 L 12 1.5" stroke={TRIM} strokeWidth={0.5} strokeDasharray="0.5 2.2" opacity={0.55} />
          {dark && <circle cx={15} cy={-27} r={2} fill="var(--amber)" opacity={0.75} className="village-glow" />}
        </g>
      )
    case 'book': // Archive — a stump with books stacked on top and a lantern beside it.
      // No walls, no roof (round 6 fix, 2026-08-27, same "still 2 houses" report as Projects
      // above) — nothing architectural left to be mistaken for a house.
      return (
        <g>
          <ellipse cx={0} cy={2} rx={12} ry={2.2} fill="var(--text)" opacity={0.17} />
          {/* The stump — a short cylinder (side rect + top ellipse) with grain rings. */}
          <rect x={-8} y={-9} width={16} height={9.5} fill={TRIM} opacity={0.5} />
          <ellipse cx={0} cy={-9} rx={8} ry={2.6} fill={ROOF_LIGHT} stroke={TRIM} strokeWidth={0.6} />
          <ellipse cx={0} cy={-9} rx={5.3} ry={1.7} fill="none" stroke={TRIM} strokeWidth={0.45} opacity={0.5} />
          <ellipse cx={0} cy={-9} rx={2.6} ry={0.85} fill="none" stroke={TRIM} strokeWidth={0.4} opacity={0.45} />
          {/* Books stacked on top, each tipped slightly so the stack reads as
              precarious/lived-in rather than a neat printed pile. */}
          <rect x={-6} y={-13.6} width={11} height={2.4} rx={0.5} fill="var(--amber)" opacity={0.85} transform="rotate(-3 -0.5 -12.4)" />
          <rect x={-5} y={-16.1} width={9} height={2.4} rx={0.5} fill={ROOF} opacity={0.85} transform="rotate(2 -0.5 -14.9)" />
          <rect x={-4} y={-18.4} width={7} height={2.2} rx={0.5} fill="var(--emerald)" opacity={0.8} transform="rotate(-4 -0.5 -17.3)" />
          {/* A small lantern beside the stump, glowing after dark. */}
          <g transform="translate(9.5 -4)">
            <rect x={-0.6} y={0} width={1.2} height={5} fill={TRIM} opacity={0.7} />
            <rect x={-2} y={-3.6} width={4} height={3.7} rx={0.8}
              fill={dark ? 'var(--amber)' : '#FAF3E4'} opacity={dark ? 0.95 : 0.85}
              className={dark ? 'village-glow' : undefined} stroke={TRIM} strokeWidth={0.4} strokeOpacity={0.5} />
          </g>
        </g>
      )
    case 'places': // Places — a little kiosk: signpost with an awning and a stand, not a bare sign.
      return (
        <g>
          <ellipse cx={0} cy={2} rx={9} ry={1.8} fill="var(--text)" opacity={0.16} />
          <rect x={-1} y={-24} width={2} height={26} fill={TRIM} opacity={0.85} />
          {/* A small stand base, so the post reads as a kiosk you'd stop at. */}
          <rect x={-4} y={0} width={8} height={2.2} rx={0.6} fill="url(#vwall)" stroke={TRIM} strokeWidth={0.5} />
          <path d="M -1 -22 L 12 -19 L -1 -16 Z" fill="url(#vroof)" stroke={TRIM} strokeWidth={0.7} strokeLinejoin="round" transform="rotate(-3 -1 -19)" />
          <path d="M -1 -14 L -10 -11 L -1 -8 Z" fill="var(--blush)" stroke={TRIM} strokeWidth={0.6} strokeLinejoin="round" transform="rotate(3 -1 -11)" />
        </g>
      )
    case 'people': // People — a bench with two people sharing it, not a house (round 4 point 2, 2026-08-27 —
      // the round-3 "second small house" read as a confusing duplicate of Home itself, live report
      // "there are two houses?" — a second FIGURE reads as "people," a second house just reads as
      // another house).
      return (
        <g>
          <ellipse cx={0} cy={2} rx={12} ry={2} fill="var(--text)" opacity={0.16} />
          <g transform="translate(-6 0)">
            <rect x={-6} y={-6} width={12} height={1.6} rx={0.5} fill={TRIM} opacity={0.85} />
            <rect x={-6} y={-9.5} width={12} height={1.4} rx={0.5} fill={TRIM} opacity={0.7} />
            <rect x={-5} y={-4.5} width={1.2} height={4.5} fill={TRIM} opacity={0.7} />
            <rect x={3.8} y={-4.5} width={1.2} height={4.5} fill={TRIM} opacity={0.7} />
          </g>
          <g transform="translate(-8.5 -6)">
            <circle cx={0} cy={-6} r={2.6} fill="#E8C4A0" />
            <path d="M -3 0 Q -3 -6.5 0 -6.5 Q 3 -6.5 3 0 Z" fill="var(--blush)" />
          </g>
          <g transform="translate(-2 -6)">
            <circle cx={0} cy={-6} r={2.6} fill="#D4A574" />
            <path d="M -3 0 Q -3 -6.5 0 -6.5 Q 3 -6.5 3 0 Z" fill="var(--emerald)" />
          </g>
        </g>
      )
  }
}

export function DistrictLabel({ x, y, icon, label, count, onClick, draggable = false, dragging = false, onPointerDown, dark = false, scale = 1 }: {
  x: number; y: number; icon: DistrictIconKind; label: string; count: string; onClick: () => void
  /** Arrange mode — see VillageScene's startDrag/onMoveLandmark. */
  draggable?: boolean
  dragging?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
  /** Warm window/light glow after dark — same idea as BuildingShape's own
   *  `dark` prop, threaded through here now that districts are real little
   *  buildings with windows instead of flat icons. */
  dark?: boolean
  /** Home reads slightly larger than the rest (2026-08-27) — "this is where
   *  you live," everything else branches outward from it. 1 for everyone
   *  else, 1.25 for Home's own call site. */
  scale?: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} onClick={onClick} onPointerDown={onPointerDown}
      className="village-district" style={{ cursor: draggable ? (dragging ? 'grabbing' : 'grab') : 'pointer' }}>
      <title>{draggable ? `${label} — drag to move` : `${label} — ${count}. Click to open.`}</title>
      {/* Invisible hit area, generous enough to cover the tallest roofline
          (a peaked roof now reaches further up than the old flat tile did)
          plus the label stack below — unchanged footprint otherwise. */}
      <rect x={-22} y={-40} width={44} height={64} fill="transparent" style={{ pointerEvents: 'all' }} />
      {/* A dashed ring while arranging — floats free of whichever silhouette
          is underneath, same "not settled yet" language blueprint-phase
          buildings already use. */}
      {draggable && (
        <rect x={-19} y={-31} width={38} height={38} rx={12} fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3" opacity={dragging ? 0.9 : 0.45} />
      )}
      {/* Scaled up ~30% (round two, 2026-08-27) — measured against a real
          screenshot, the art read as a small prop next to its own label at
          the original coordinates below. This is the one knob that fixes
          that for all six at once, independent of Home's own extra 1.25x. */}
      <g transform="scale(1.3)">
        <DistrictArt kind={icon} dark={dark} />
      </g>
      {/* A small numeric corner badge, iOS-notification-style, whenever the
          count actually leads with a number (plants growing, buildings
          standing, tree-rings/months) — a bonus glance, not a replacement
          for the hover text, since some counts are words ("today", "ready
          when you are") with nothing to badge. */}
      {count.match(/^\d+/) && (
        <>
          <circle cx={15} cy={-34} r={7} fill="var(--rose)" stroke="var(--surface)" strokeWidth={1.4} />
          <text x={15} y={-34} textAnchor="middle" dominantBaseline="central" fontSize={6} fill="#fff" fontWeight={600}>
            {count.match(/^\d+/)![0]}
          </text>
        </>
      )}
      {/* Name now hidden until you look too (round three, 2026-08-27 — round
          two only quieted it down and moved the count/detail line to
          hover-only, but a permanently-visible name under every building
          still made the scene read as an annotated diagram, not a place).
          Same .village-district-count pattern, new sibling class: opacity 0
          at rest, revealed on hover (real pointer devices only, same
          @media (hover: hover) and (pointer: fine) guard as the figure-hover
          fix). Forced visible via inline style while `draggable` — you need
          to see what you're moving in arrange mode regardless of hover
          state, and an inline style always wins over the stylesheet rule
          here. Touch still gets the full name+detail through the existing
          tap-triggered hover-board (openOrToggle/openPanel), unchanged. */}
      <text className="village-district-name" style={draggable ? { opacity: 0.85 } : undefined}
        textAnchor="middle" fontSize={8} fill="var(--muted)" stroke="var(--surface)" strokeWidth={2.2} paintOrder="stroke" strokeLinejoin="round" letterSpacing="0.02em" y={13}>{label}</text>
      <text className="village-district-count" style={draggable ? { opacity: 0.85 } : undefined}
        textAnchor="middle" fontSize={7} fill="var(--muted)" stroke="var(--surface)" strokeWidth={2} paintOrder="stroke" strokeLinejoin="round" y={23}>{count}</text>
    </g>
  )
}
