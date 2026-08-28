'use client'

import { STAGE_INDEX, hashPos, type Plant, type Building } from '@/lib/village/state'

// The repeated silhouettes: one per habit, one per project, one per district
// label. Split out of Village.tsx unchanged — these are the pieces that appear
// N times, while the one-off scenery stays in VillageScene where you can read
// the composition order top to bottom.

// A generic drag wrapper (round 27, 2026-08-27, "make everything moveable")
// — the DECOR_DEFAULTS/decorPos/startDrag mechanism (VillageScene.tsx) has
// covered the freestanding item-props since round 12, but the pond,
// benches, flower beds, fences, lamps, the Mailbox/Trips-signpost, and the
// three cast figures were all still hard-coded fixed points. Rather than
// hand-roll the same translate/onPointerDown/dashed-outline boilerplate at
// every one of those call sites, this wraps any existing shape (which
// already renders itself at a LOCAL (0,0) when given x=0/y=0) in one
// draggable group — same visual "dashed ring while arranging" language
// DistrictLabel/the generic decor-prop loop already use.
export function Draggable({ x, y, id, arranging, draggingId, onPointerDown, r = 12, children }: {
  x: number; y: number; id: string; arranging: boolean; draggingId: string | null
  onPointerDown: (e: React.PointerEvent) => void
  /** Dashed-ring radius while arranging — tune per prop so the ring roughly
   *  hugs what's actually drawn instead of one generic size for everything. */
  r?: number
  children: React.ReactNode
}) {
  return (
    <g transform={`translate(${x} ${y})`} onPointerDown={onPointerDown}
      style={{ cursor: arranging ? (draggingId === id ? 'grabbing' : 'grab') : undefined }}>
      {children}
      {arranging && (
        <circle r={r} fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
          opacity={draggingId === id ? 0.9 : 0.4} />
      )}
    </g>
  )
}

// Cycles through several real sprite frames in place (round 13, 2026-08-27,
// the user's own village-animations-complete.zip) — pure CSS, no JS timer
// and no re-render: N stacked <image>s share one @keyframes rule (defined
// in globals.css per frame count — village-cycle-2/4/7) that's visible only
// during its own 1/N slice of the period, each offset by a NEGATIVE
// animation-delay so they take turns without any JS driving it. steps(1)
// makes each switch an instant cut, matching these sprites' own discrete-
// pose art rather than a smooth crossfade between them.
//
// Frames can have different aspect ratios (a cat sitting vs. stretched-out
// mid-play is a very different shape) — height is shared, width is derived
// per frame so nothing gets squashed, and every frame is bottom-center
// anchored at (x, y) so the figure's "feet" don't drift as poses change.
// The 4-frame round-tree sway cycle (round 13, 2026-08-27,
// village-animations-complete.zip) — module-level so every tree instance
// shares one array reference rather than re-allocating it per render.
// Re-cropped round 23 (2026-08-27, "update only using these elements") from
// the same village-master-visual-assets folder's own tree-sway sheet — same
// content as before (this file's original source, just re-sourced directly
// rather than through an earlier round's crop) so aspect ratios shifted only
// slightly.
const TREE_SWAY_FRAMES = [
  { src: '/village-assets/round-tree-sway-1.png', aspect: 331 / 459 },
  { src: '/village-assets/round-tree-sway-2.png', aspect: 355 / 459 },
  { src: '/village-assets/round-tree-sway-3.png', aspect: 350 / 458 },
  { src: '/village-assets/round-tree-sway-4.png', aspect: 333 / 458 },
]

export function SpriteCycle({ frames, x, y, height, periodSec, opacity = 1 }: {
  frames: { src: string; aspect: number }[]; x: number; y: number; height: number; periodSec: number; opacity?: number
}) {
  const n = frames.length
  return (
    <g opacity={opacity}>
      {frames.map((f, i) => {
        const w = height * f.aspect
        return (
          <image key={f.src} href={f.src} x={x - w / 2} y={y - height} width={w} height={height}
            className="village-cycle-frame"
            style={{
              imageRendering: 'pixelated',
              animation: `village-cycle-${n} ${periodSec}s steps(1) infinite`,
              animationDelay: `${-(periodSec * i / n)}s`,
            }} />
        )
      })}
    </g>
  )
}

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
  const opacity = plant.dormant ? 0.4 : 1

  // Real pixel-art crop sprites (round 8, 2026-08-27) — "make it more
  // aesthetic or artistic," after establishing that pushing the flat-SVG
  // style further had a hard ceiling (user direction: "use free tier
  // [shubibubi's Cozy Farm asset pack] then make own" for what it doesn't
  // cover). Every plant picks one species once, via the same hashPos()
  // determinism every other scattered element in this scene already uses —
  // same plant, same species, every load. Size ramps 14→38 units across the
  // 5 real stages, in the same spirit as the old h/w arrays but tuned to
  // the sprites' actual source proportions instead of the hand-drawn circle
  // sizes.
  // Down to one species (round 23, 2026-08-27, "update only using these
  // elements. delete all old ones") — tomato/potato came from the original
  // free-tier Cozy Farm pack, which the master-visual-assets folder has no
  // equivalent for; only flower's real 5-stage growth-neglect-recovery
  // sequence (round 16, same master folder) does. Every plant is a flower
  // now; hashPos still picks which of the two dormant/wilt variants a given
  // plant gets, same determinism rule as everywhere else in this file.
  const species = 'flower'
  const size = [14, 20, 27, 33, 38][i]
  const dormantSprite = `flower-dormant-${hashPos(plant.id + 'wilt') < 0.5 ? 1 : 2}`

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
      {onClick && <circle cx={0} cy={-size / 2} r={Math.max(16, size / 2 + 6)} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} />}
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
        <ellipse cx={0} cy={1.5} rx={Math.max(4, size / 2.6)} ry={1.6} fill="var(--text)" opacity={0.12} />
        {dormantSprite && plant.dormant ? (
          // A real wilted-branch sprite, not a filter — same aspect ratio
          // for both neglect frames (~0.72), so one width formula covers
          // either pick.
          <image href={`/village-assets/${dormantSprite}.png`} x={-size * 0.36} y={-size}
            width={size * 0.72} height={size}
            style={{ imageRendering: 'pixelated' }} />
        ) : (
          <image href={`/village-assets/${species}-${i}.png`} x={-size / 2} y={-size}
            width={size} height={size}
            style={{ imageRendering: 'pixelated', filter: plant.dormant ? 'grayscale(1)' : undefined }} />
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

// Real sprite (round 10, 2026-08-27) — same custom pack as the cottage/cast.
// Redrawn as plain SVG (round 36, 2026-08-27, "the fences i dont want are
// still there") — bench2.png's actual silhouette is two parallel
// horizontal rails between two posts, which is exactly a short fence
// section's own visual language; every one of the four bench2.png
// instances in the scene (three PROPS.benches plus the People corner) had
// been getting reported back as "a fence." A real bench profile instead —
// one seat plank on four short legs, no second rail above it — reads as
// sit-down furniture rather than a barrier. Same TRIM-family fixed-hex
// language as LampShape/BuntingShape's own round 23/29 redraws.
export function BenchShape({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const w = 15.7
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={2} rx={9} ry={1.6} fill="var(--text)" opacity={0.1} />
      <rect x={-w / 2 - 1.4} y={-2} width={1.6} height={3.6} fill={TRIM} opacity={0.85} />
      <rect x={w / 2 - 0.2} y={-2} width={1.6} height={3.6} fill={TRIM} opacity={0.85} />
      <rect x={-w / 2 - 1.6} y={-3.4} width={w + 3.2} height={1.8} rx={0.5} fill={TRIM} />
      <rect x={-w / 2 - 1.6} y={-3.4} width={w + 3.2} height={1.8} rx={0.5} fill="url(#vsheen)" />
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
// BushShape/GrassClumpShape/WildflowerShape (hand-drawn SVG ground cover)
// removed (round 12, 2026-08-27, "remove all old elements that do not fit
// anymore") — VillageScene's FOREGROUND/MIDGROUND_BUSHES now render the
// user's own bush-mound.png/flowering-bush.png/tall-grass.png sprites
// instead, matching the rest of the scene's real pixel art.

// A short picket fence run (2026-08-25) — pure scenery, same "small fixed
// prop near the path" idiom as Bench/FlowerBed above.
// Real sprite (round 24, 2026-08-27, "add everything from
// [structures-clean.png] onto the village") — fence-rail.png, cropped from
// the same master-visual-assets sheet as shop/greenhouse/workshop/gate/car/
// signpost/mailbox/bus-stop, the one item from that sheet not yet wired
// anywhere.
// Fixed round 29 (2026-08-27, "fences also have white in the middle") —
// round 24 tiled this sprite `length` times with only ~8% overlap between
// copies to suggest a longer run. That was the actual bug: the sprite is
// already a COMPLETE two-post panel with a lot of transparent margin around
// the wood, so tiling it left visible gaps of bare (pale) ground showing
// through between panels — not a color defect in the art itself (this file
// has no baked-in white), a real gap in the composition. Now a single panel,
// scaled by `length/4` instead of repeated, so a "longer" fence just reads
// as one continuous, taller/wider run with no seams. Sized up ~35% too
// (round 29, "fix the sizing of everything... do not make anything too
// tiny") — the original run read thin next to everything else's round 24-25
// size bump.
export function FenceShape({ x, y, length = 4, scale = 1 }: { x: number; y: number; length?: number; scale?: number }) {
  const baseW = 13.4, baseH = 6.5 // 367×177 source, ~2.07 aspect
  const w = baseW * (length / 4), h = baseH * (length / 4)
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={0.95}>
      <ellipse cx={0} cy={0.8} rx={w / 2 + 1} ry={1.4} fill="var(--text)" opacity={0.12} />
      <image href="/village-assets/fence-rail.png" x={-w / 2} y={-h} width={w} height={h}
        style={{ imageRendering: 'pixelated' }} />
    </g>
  )
}

// A lamppost (2026-08-25) — glows after dark, same window-glow reasoning as
// BuildingShape's own (`dark` gates the lit look rather than leaving it
// unconditionally on). Pure scenery, no click target.
// Redrawn as a plain post + globe (round 23, 2026-08-27, "update only using
// these elements. delete all old ones") — the round 10 stone-lantern.png
// sprite has no equivalent in the master-visual-assets folder, and losing
// the three path lamps outright would undo round 25's own night-path-
// visibility fix; a small flat post/globe in this file's existing
// TRIM/vglow language keeps the actual light without the old sprite.
export function LampShape({ x, y, dark = false, scale = 1 }: { x: number; y: number; dark?: boolean; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={1.8} rx={6} ry={1.6} fill="var(--text)" opacity={0.12} />
      {dark && <circle cy={-12.5} r={9} fill="var(--amber)" opacity={0.3} filter="url(#vglow)" />}
      {/* Sized up round 29 ("do not make anything too tiny") — post + globe
          grew ~25%. */}
      <rect x={-1.1} y={-11} width={2.2} height={11} fill={TRIM} opacity={0.85} />
      <circle cy={-12.8} r={3.3} fill={dark ? 'var(--amber)' : 'var(--surface2)'} opacity={dark ? 0.9 : 0.6}
        stroke={TRIM} strokeWidth={0.7} className={dark ? 'village-glow' : undefined} />
    </g>
  )
}

// A mailbox, standing in for capture (2026-08-24) — Rest Lake's click used
// to open the Brief and focus the capture box; removing the lake removed
// that entry point too. This gives "jot something down" a small, real place
// in the scene again without needing a whole district for it.
// Real sprite (round 9, 2026-08-27) — same pack as the cottage/cast, see
// their own header comments.
export function MailboxShape({ x, y, onClick }: { x: number; y: number; onClick?: () => void }) {
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  const w = 19.7, h = 20 // re-sourced round 23 from the master-assets folder (256×260), sized up rounds 24/35 for visibility
  return (
    <g transform={`translate(${x} ${y})`}>
      {onClick && <circle cx={0} cy={-h / 2} r={14} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} />}
      <g onClick={handleClick} className={onClick ? 'village-entity' : undefined}>
        <title>Jot something down</title>
        <ellipse cx={0} cy={1.5} rx={6} ry={1.6} fill="var(--text)" opacity={0.12} />
        <image href="/village-assets/mailbox2.png" x={-w / 2} y={-h} width={w} height={h}
          style={{ imageRendering: 'pixelated' }} />
      </g>
    </g>
  )
}

// A signpost toward Trips (2026-08-24) — Places' Trips sub-tab has no
// district of its own; a signpost at the village edge, pointing off-canvas,
// gives "somewhere else" a presence without inventing an eighth district.
// Real sprite (round 11, 2026-08-27, village-matching-expansion-pack) — an
// actual directional arrow-sign on a post, an even better fit for "points
// toward Trips" than the hand-drawn flag it replaces.
export function SignpostShape({ x, y, label, onClick }: { x: number; y: number; label: string; onClick?: () => void }) {
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  const w = 19.75, h = 26 // re-sourced round 23 from the master-assets folder (205×270), sized up rounds 24/35 for visibility
  return (
    <g transform={`translate(${x} ${y})`}>
      {onClick && <circle cx={4} cy={-9} r={16} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} />}
      <g onClick={handleClick} className={onClick ? 'village-entity' : undefined}>
        <title>{label}</title>
        <ellipse cx={0} cy={1.5} rx={5} ry={1.3} fill="var(--text)" opacity={0.12} />
        <image href="/village-assets/signpost2.png" x={-w / 2} y={-h + 1} width={w} height={h}
          style={{ imageRendering: 'pixelated' }} />
      </g>
    </g>
  )
}

// Birthday bunting (2026-08-24) — a small flag string over the People
// district, only on the actual day (see VillageScene's use of
// soonestBirthdayDays === 0). No new data: the same daysUntilBirthday
// already driving the district's count badge.
// A small flag string, hand-drawn again (round 23, 2026-08-27, "update only
// using these elements. delete all old ones") — round 10's pennant.png has
// no equivalent in the master-visual-assets folder; this is a plain
// triangle-flag bunting in the same gold-family/fixed-hex language as
// FeatureIcon's other flat shapes, strung between two short posts.
export function BuntingShape({ x, y }: { x: number; y: number }) {
  const flags = [-10, -5, 0, 5, 10]
  return (
    <g transform={`translate(${x} ${y - 34})`} opacity={0.95} pointerEvents="none">
      <path d="M -12 0 Q 0 5 12 0" fill="none" stroke={TRIM} strokeWidth={0.8} opacity={0.7} />
      {flags.map((dx, i) => (
        <path key={i} d={`M ${dx} 0.5 L ${dx - 2.4} 6 L ${dx + 2.4} 6 Z`}
          fill={i % 2 === 0 ? 'var(--blush)' : 'var(--gold)'} opacity={0.85} />
      ))}
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
//
// Real sprite art (round 9, 2026-08-27) — replaces the hand-drawn faceless
// blob-body from every prior round. This was the actual, structural ceiling
// flagged before committing to this direction: no amount of stroke-width or
// scale tuning on flat SVG paths reads as "a person" the way real character
// art does. The user supplied a matching custom sprite pack
// (simple-cozy-village-sprite-pack.zip, self-made — see public/village-assets/
// for the cropped individual PNGs, sourced from village-core-sprites.png).
// `hairColor`/`outfitColor` are now unused (sprite art has its own fixed
// coloring) but kept in the prop signature rather than removed — deleting
// them would touch both call sites in VillageScene.tsx for zero behavioral
// gain, and a future non-sprite fallback might want them again.
// Swapped to the master-assets folder's own default poses (round 23,
// 2026-08-27, "update only using these elements") — sh-default-sylvia/
// -harry.png, cropped in round 16 from sylvia-harry-outfit-states.png and
// sitting unused ever since; the earlier sylvia.png/harry.png (a different,
// older custom pack) are deleted, not kept alongside.
// Re-cropped again round 32 (2026-08-27, "delete any elements that are not
// from my folder") — sylvia-harry-outfit-states.png itself was replaced by
// the user with sylvia-harry-outfit-states-remade-alpha.png; this pulls the
// overalls pose (row 3 of that sheet — a separable, non-hand-holding pair)
// instead of row 1's hand-holding pose, which crops as one joined sprite.
const VILLAGER_SPRITE: Record<string, { src: string; w: number; h: number }> = {
  Sylvia: { src: '/village-assets/sh-default-sylvia.png', w: 245, h: 387 },
  Harry: { src: '/village-assets/sh-default-harry.png', w: 191, h: 360 },
}

export function VillagerShape({ x, y, name, scale = 1, onClick }: {
  x: number; y: number; name: string
  /** Unused now that this renders a fixed-art sprite — see this file's own
   *  header note on why the props stayed rather than being removed. */
  hairColor?: string; outfitColor?: string
  scale?: number
  onClick?: () => void
}) {
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  const sprite = VILLAGER_SPRITE[name] ?? VILLAGER_SPRITE.Harry
  // Fixed render height in scene units, width derived from the sprite's own
  // aspect ratio so it's never stretched.
  const h = 30
  const w = h * (sprite.w / sprite.h)
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} onClick={handleClick}
      className={onClick ? 'village-entity' : undefined}
      style={{ cursor: onClick ? 'pointer' : undefined }}>
      <title>{name}</title>
      {/* Invisible hit-padding — same oversized-hit-circle idiom as every
          other clickable prop in this scene (see this file's other shapes'
          own 2026-08-25 comments on why). */}
      {onClick && <circle cx={0} cy={-h / 2} r={Math.max(16, h / 2 + 4)} fill="transparent" style={{ pointerEvents: 'all' }} />}
      <ellipse cx={0} cy={1} rx={w / 2.4} ry={1.6} fill="var(--text)" opacity={0.15} />
      <image href={sprite.src} x={-w / 2} y={-h} width={w} height={h}
        style={{ imageRendering: 'pixelated' }} preserveAspectRatio="none" />
    </g>
  )
}

// Somi's real coloring (2026-08-25) — white/grey siamese mix, blue eyes.
// Fixed hex, not theme vars, for the same reason grass reads green
// elsewhere in this file: a specific cat's actual coat isn't themeable.
// Siamese "points" (ears, tail, face mask) run a cooler blue-grey against
// a warm white body/chest.
export function CatShape({ x, y, name = 'Somi', scale = 1, onClick, wander = true }: {
  x: number; y: number; name?: string
  /** Same reasoning as VillagerShape's own `scale` (round 4 bug-fix,
   *  2026-08-27) — the whiskers/paws/nose added earlier this round were
   *  too small to actually see at 1x. */
  scale?: number
  onClick?: () => void
  /** Off during arrange mode (round 31, 2026-08-27) — same reasoning as
   *  Sylvia/Harry's own wander class in VillageScene.tsx: a moving target
   *  fighting a real drag would be unusable, so the caller drops this to
   *  false while `arranging`. */
  wander?: boolean
}) {
  // stopPropagation, same reason as VillagerShape above.
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  // Real sprite art (round 9), made alive (round 13), replaced (round 15),
  // replaced again (round 20), updated (round 22), briefly cut to a 2-pose
  // "night ambient" sheet (round 25), corrected back to 8 poses from the
  // folder's real 12-pose sheet (round 26) — see that round's own note on
  // exec-1a806105….png. Round 28 reordered/rebuilt the cycle into all 12
  // poses in a real narrative order and slowed it way down (24s → 144s).
  //
  // Round 31 (2026-08-27, "only use somi walking animation if she is
  // walking around. when she is still do not use walking animation") split
  // the single 12-frame cycle in two: an IDLE set (sit, blink, look back
  // both angles, pounce crouch/pounce, sit tall, curled — 8 poses, no
  // walking) and a WALK set (the 4-frame walk cycle). She now actually
  // wanders a little (village-somi-move, globals.css — same idea as
  // Sylvia/Harry's round 30 drift) instead of standing still while walk
  // poses flashed past her regardless; the idle set only shows while she's
  // stationary and the walk set only shows while village-somi-move is
  // actually translating her, via two opacity-gated <g>s
  // (village-somi-idle-vis/-walk-vis) sharing that same animation's
  // timeline so the two can never both be visible at once.
  const h = 20
  const idleFrames = [
    { src: '/village-assets/somi-sit-1.png', aspect: 141 / 195 },
    { src: '/village-assets/somi-sit-2.png', aspect: 159 / 195 },
    { src: '/village-assets/somi-look-back-1.png', aspect: 165 / 195 },
    { src: '/village-assets/somi-look-back-2.png', aspect: 174 / 195 },
    { src: '/village-assets/somi-pounce-crouch.png', aspect: 210 / 178 },
    { src: '/village-assets/somi-pounce.png', aspect: 216 / 183 },
    { src: '/village-assets/somi-sit-tall.png', aspect: 180 / 188 },
    { src: '/village-assets/somi-curled.png', aspect: 163 / 187 },
  ]
  const walkFrames = [
    { src: '/village-assets/somi-walk-1.png', aspect: 235 / 185 },
    { src: '/village-assets/somi-walk-2.png', aspect: 226 / 193 },
    { src: '/village-assets/somi-walk-3.png', aspect: 230 / 185 },
    { src: '/village-assets/somi-walk-4.png', aspect: 226 / 192 },
  ]
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g onClick={handleClick}
        className={[onClick && 'village-entity', wander && 'village-somi-move'].filter(Boolean).join(' ') || undefined}
        style={{ cursor: onClick ? 'pointer' : undefined }}>
        <title>{name}</title>
        {/* Same oversized invisible hit circle as VillagerShape — see its own
            2026-08-25 fix comment ("can't click the figures"). Sized off the
            idle pose's own width, not whichever frame happens to be showing —
            a stable hit target regardless of which pose is currently up.
            Inside the moving group (round 31) so the tap target actually
            follows her the short distance she wanders. */}
        {onClick && <circle cx={0} cy={-h / 2} r={Math.max(14, h / 2 + 4)} fill="transparent" style={{ pointerEvents: 'all' }} />}
        <ellipse cx={0} cy={1} rx={h / 2.2} ry={1.6} fill="var(--text)" opacity={0.15} />
        {/* Idle/walk visibility only alternates when she's actually wandering
            — with `wander` off (arrange mode), the idle set just shows
            plainly and the walk set is skipped outright rather than the two
            gated animations racing a movement loop that isn't running. */}
        <g className={wander ? 'village-somi-idle-vis' : undefined}>
          <SpriteCycle frames={idleFrames} x={0} y={0} height={h} periodSec={96} />
        </g>
        {wander && (
          <g className="village-somi-walk-vis">
            <SpriteCycle frames={walkFrames} x={0} y={0} height={h} periodSec={1.6} />
          </g>
        )}
      </g>
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
    case 'leaf': // Growth Forest — real tree sprites (round 11, 2026-08-27, the user's own
      // village-matching-expansion-pack), replacing the single repeated tree.png icon with
      // an actual small grove: one pine, one round tree, a third smaller round tree behind.
      // The two round trees now actually sway (round 13, 2026-08-27,
      // village-animations-complete.zip's 4-frame tree-sway sheet) — different
      // periodSec per tree so they drift in and out of phase rather than
      // swaying in perfect lockstep.
      return (
        <g>
          <ellipse cx={0} cy={2} rx={18} ry={2.4} fill="var(--text)" opacity={0.16} />
          <path d="M -11 2 Q -2 4 4 1 T 11 2" stroke="var(--surface2)" strokeWidth={2.5} strokeLinecap="round" opacity={0.4} fill="none" />
          <path d="M -11 2 Q -2 4 4 1 T 11 2" stroke="var(--border)" strokeWidth={2.5} strokeDasharray="1 5" strokeLinecap="round" opacity={0.5} fill="none" />
          {/* Trees sized up (round 25, 2026-08-27, "make sure the trees,
              building, car are bigger than the figures") — VillagerShape
              renders Sylvia/Harry at 30 units tall; these read close to
              that before, not clearly past it. */}
          <g opacity={0.85}>
            <SpriteCycle frames={TREE_SWAY_FRAMES} x={-16 + 6.2} y={1} height={30} periodSec={6.5} />
          </g>
          <image href="/village-assets/pine-tree.png" x={-8.9} y={-34} width={17.8} height={34}
            style={{ imageRendering: 'pixelated' }} />
          <SpriteCycle frames={TREE_SWAY_FRAMES} x={6 + 7.9} y={0} height={34} periodSec={7.8} />
        </g>
      )
    case 'building': // Projects — a real workshop sprite (round 11, 2026-08-27, same custom
      // pack), replacing the hand-drawn construction site. Sized up round 25 (same "bigger
      // than the figures" reasoning as the trees above).
      return (
        <g>
          <ellipse cx={0} cy={2} rx={20} ry={2.9} fill="var(--text)" opacity={0.17} />
          <image href="/village-assets/workshop.png" x={-20} y={-30} width={40} height={30}
            style={{ imageRendering: 'pixelated' }} />
          {dark && <circle cx={5} cy={-19} r={8.75} fill="var(--amber)" opacity={0.26} filter="url(#vglow)" />}
        </g>
      )
    case 'book': // Archive — a real greenhouse sprite (round 11, 2026-08-27, same custom pack) —
      // the exact "library/greenhouse" identity this district has been reaching for by hand
      // since the 2026-08-24 reskin, now with the actual building. The Life Tree stays where
      // it is, drawn separately in VillageScene (real years-of-account data, not decoration).
      // Sized up round 25, same reasoning as workshop above.
      return (
        <g>
          <ellipse cx={0} cy={2} rx={18.75} ry={2.75} fill="var(--text)" opacity={0.17} />
          <image href="/village-assets/greenhouse.png" x={-18.1} y={-30} width={36.3} height={30}
            style={{ imageRendering: 'pixelated' }} />
          {dark && <circle cx={0} cy={-16.25} r={10} fill="var(--amber)" opacity={0.22} filter="url(#vglow)" />}
        </g>
      )
    case 'places': // Places — the car (round 30, 2026-08-27, "make the car the symbol for
      // places") — car.png, the same sprite already used for the standalone car prop near
      // Home, reused here rather than re-cropped. "Somewhere to go" reads more directly as a
      // car than the market/shop building (round 11-25) it replaces; shop.png is unused now
      // but kept in the assets folder — real master-folder content, just not this district's
      // symbol any more.
      return (
        <g>
          {/* car.png is 256×204, ~1.2549 aspect — h=24 keeps it close to
              the workshop/greenhouse badges' own visual weight. */}
          <ellipse cx={0} cy={2.5} rx={16} ry={2.6} fill="var(--text)" opacity={0.16} />
          <image href="/village-assets/car.png" x={-15.05} y={-24} width={30.1} height={24}
            style={{ imageRendering: 'pixelated' }} />
          {dark && <circle cx={-6} cy={-14} r={5} fill="var(--amber)" opacity={0.5} filter="url(#vglow)" />}
          {dark && <circle cx={6} cy={-14} r={5} fill="var(--amber)" opacity={0.5} filter="url(#vglow)" />}
        </g>
      )
    case 'people': // People — an empty bench, not a second Sylvia/Harry (round 14 fix,
      // 2026-08-27 — round 13 briefly used the pack's real couple-on-a-bench sprite here, but
      // there should only ever be ONE Sylvia and ONE Harry in the village, and the real ones
      // already stand by Home; a second rendering of them sitting on a district badge was
      // exactly the kind of duplicate-character confusion the "two houses" fix spent a whole
      // round eliminating for buildings. Now BenchShape's own redrawn bench (round 36) instead
      // of the raw bench2.png sprite directly — same fence-reads-as-a-bar reasoning as
      // BenchShape's own header comment, and keeps this badge and the real People-corner bench
      // as literally the same shape instead of two different renderings of "a bench."
      return (
        <g>
          <ellipse cx={0} cy={2} rx={12} ry={2} fill="var(--text)" opacity={0.16} />
          <BenchShape x={0} y={2} scale={0.6} />
        </g>
      )
  }
}

export function DistrictLabel({ x, y, icon, label, count, onClick, draggable = false, dragging = false, onPointerDown, dark = false, scale = 1, selected = false }: {
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
  /** This district's tap-panel is open right now (round 18, 2026-08-27) —
   *  touch's equivalent of :hover for revealing the label, see the name/
   *  count text below. VillageScene passes `openPanel === id`. */
  selected?: boolean
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
      {/* A soft ambient glow behind every symbol (round 18, 2026-08-27,
          "make the symbols glow a bit too") — same vglow blur filter every
          other light source in the scene shares, at a low, constant
          opacity (not gated on `dark`) so it reads as the building's own
          warm presence rather than a night-only light. */}
      <circle r={16} fill="var(--amber)" opacity={0.1} filter="url(#vglow)" />
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
          hover-only. Round 10 made both permanently visible ("do not make
          anything hover"); round 18 reverses that back on explicit later
          direction ("only show when hover or selected") — opacity 0 at
          rest, revealed on hover (real pointer devices only, same
          @media (hover: hover) and (pointer: fine) guard as the figure-hover
          fix). Forced visible via inline style while `draggable` OR
          `selected` — you need to see what you're moving in arrange mode
          regardless of hover state, and touch gets the same reveal via its
          own tap-triggered `selected` (openPanel) rather than a real
          :hover it can't produce. An inline style always wins over the
          stylesheet rule here. */}
      <text className="village-district-name" style={draggable || selected ? { opacity: 0.85 } : undefined}
        textAnchor="middle" fontSize={8} fill="var(--muted)" stroke="var(--surface)" strokeWidth={2.2} paintOrder="stroke" strokeLinejoin="round" letterSpacing="0.02em" y={13}>{label}</text>
      <text className="village-district-count" style={draggable || selected ? { opacity: 0.85 } : undefined}
        textAnchor="middle" fontSize={7} fill="var(--muted)" stroke="var(--surface)" strokeWidth={2} paintOrder="stroke" strokeLinejoin="round" y={23}>{count}</text>
    </g>
  )
}
