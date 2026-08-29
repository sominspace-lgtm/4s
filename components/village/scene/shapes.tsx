'use client'

import { STAGE_INDEX, hashPos, type Plant, type Building, type VillageState } from '@/lib/village/state'

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
// The 4-frame round-tree sway cycle was retired round 62 ("make growing
// garden symbol the swaying flowers") — the Growth Garden district symbol
// (DistrictArt's 'leaf' case) was its only user; it's a swaying flower
// cluster now. round-tree-sway-*.png stay in the folder (the Inventory's
// 'roundTree' item still places one).

// Seasonal tree sprites (round 51, 2026-08-28, "update the village on 4s os
// with all of these new animations elements") — from
// seasonal-trees-ambience-alpha.png: two silhouettes (round/broadleaf and
// pine) each in spring-blossom / summer-green / autumn-orange / winter-bare.
// Keyed off VillageState.season so the background tree line actually turns
// with the year instead of staying summer-green in December. Static (no
// sway) — same motion-budget reasoning as EXTRA_TREES in VillageScene.
export type TreeKind = 'round' | 'pine'
const SEASON_TREE: Record<TreeKind, Record<VillageState['season'], { src: string; aspect: number }>> = {
  round: {
    spring: { src: '/village-assets/tree-round-spring.png', aspect: 259 / 372 },
    summer: { src: '/village-assets/tree-round-summer.png', aspect: 258 / 372 },
    autumn: { src: '/village-assets/tree-round-autumn.png', aspect: 254 / 372 },
    winter: { src: '/village-assets/tree-round-winter.png', aspect: 232 / 338 },
  },
  pine: {
    spring: { src: '/village-assets/tree-pine-spring.png', aspect: 239 / 456 },
    summer: { src: '/village-assets/tree-pine-summer.png', aspect: 239 / 457 },
    autumn: { src: '/village-assets/tree-pine-autumn.png', aspect: 263 / 456 },
    winter: { src: '/village-assets/tree-pine-winter.png', aspect: 232 / 415 },
  },
}
export function seasonTree(kind: TreeKind, season: VillageState['season']) {
  return SEASON_TREE[kind][season]
}

// SMALL_TREE_SWAY_FRAMES removed round 57 — its source sheet,
// tree-flower-sway-animation-alpha.png, is no longer in the master folder.

// Sylvia and Harry in sleepwear (round 51, 2026-08-28) — from
// sylvia-harry-sleepwear-alpha.png, shown standing near Home only when it's
// actually night (VillageScene's `night`), the real art behind round 48's
// "quiet evenings" beat that until now could only fake bedtime with the
// couple sitting still on a bench.
export function SleepwearFigure({ src, aspect, x, y }: { src: string; aspect: number; x: number; y: number }) {
  const h = 33
  const w = h * aspect
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <ellipse cx={0} cy={1} rx={w / 2.4} ry={1.6} fill="var(--text)" opacity={0.15} />
      <image href={src} x={-w / 2} y={-h} width={w} height={h}
        style={{ imageRendering: 'pixelated' }} preserveAspectRatio="none" />
    </g>
  )
}

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
              // linear, not steps(1) (round 69) — the keyframe already hard-
              // cuts between frames (e.g. `24.9% {1}` then `25% {0}`), and
              // steps(1) on top of a negative delay can freeze the whole
              // cycle on frame 1 in some engines. linear just lets each
              // frame's clock tick normally.
              animation: `village-cycle-${n} ${periodSec}s linear infinite`,
              // Delay chosen so the on-screen order is frame 0,1,2,…,n-1
              // (a plain `-i/n` delay plays them 0,n-1,…,1 — a walk cycle
              // running backwards).
              animationDelay: `${-(periodSec * ((n - i) % n) / n)}s`,
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
  const size = [11, 16, 21, 26, 30][i] // ~20% smaller round 59 ("make flowers a bit smaller")
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
      {/* Hit circle sized up round 38 (2026-08-27, "make hit box for
          habits/growth grove bigger") — was max(16, size/2+6), the
          smallest hit target of any clickable entity in the scene next to
          how densely the grove now scatters plants and trees together. */}
      {onClick && (() => { const hw = Math.max(9, size / 2 + 3); return <rect x={-hw} y={-size - 3} width={2 * hw} height={size + 6} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} /> })()}
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
      {onClick && <rect x={-w / 2 - 3} y={-spec.h - 3} width={w + 6} height={spec.h + 6} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} />}
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
export function PondShape({ x, y, scale = 1, onClick }: { x: number; y: number; scale?: number; onClick?: () => void }) {
  // onClick (round 50, 2026-08-28) — the pond is the "picnic" tap target for
  // the new attention/nudge system (VillageScene's own nudge state); same
  // stopPropagation/oversized-hit-circle idiom as VillagerShape's own
  // onClick, gated `!arranging` by the caller, not here.
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={0.8} onClick={handleClick}
      className={onClick ? 'village-entity' : undefined} style={{ cursor: onClick ? 'pointer' : undefined }}>
      {onClick && <ellipse cx={0} cy={0} rx={24} ry={9} fill="transparent" style={{ pointerEvents: 'all' }} />}
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
// been getting reported back as "a fence."
// Real sprite again round 39 (2026-08-27, "sync all new elements and
// animations") — bench.png, cropped from village-structures-decor-paths-
// alpha.png: an actual garden-bench profile (seat, backrest, legs, no
// second parallel rail), so this can go back to real art without
// reintroducing the fence-lookalike problem the plain-SVG redraw fixed.
export function BenchShape({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const w = 18.3, h = 7.5 // 307×126 source, ~2.44 aspect, sized up round 44 ("make everything better scale")
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={2} rx={9} ry={1.6} fill="var(--text)" opacity={0.1} />
      <image href="/village-assets/bench.png" x={-w / 2} y={-h + 2} width={w} height={h}
        style={{ imageRendering: 'pixelated' }} />
    </g>
  )
}

export function FlowerBedShape({ x, y, scale = 1, hue = 'var(--blush)', onClick }: { x: number; y: number; scale?: number; hue?: string; onClick?: () => void }) {
  // onClick (round 50, 2026-08-28) — the "garden" tap target for the
  // attention/nudge system, same idiom as PondShape's own onClick above.
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  const petals = [-8, -3, 3, 8]
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} onClick={handleClick}
      className={onClick ? 'village-entity' : undefined} style={{ cursor: onClick ? 'pointer' : undefined }}>
      {onClick && <ellipse cx={0} cy={-1} rx={14} ry={6} fill="transparent" style={{ pointerEvents: 'all' }} />}
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
// Re-cropped round 39 (2026-08-27, "sync all new elements and animations")
// from village-structures-decor-paths-alpha.png — a genuinely solid wooden
// fence panel (two posts, two full rails, no lattice/diamond gaps), unlike
// the round 24 crop this replaces (which turned out to be an open gate,
// removed round 35 for reading like a see-through barrier). Back in the
// scene now that there's real art for it.
export function FenceShape({ x, y, length = 4, scale = 1 }: { x: number; y: number; length?: number; scale?: number }) {
  // Sized up round 44 ("make everything better scale") — 6.7 tall read
  // noticeably thinner/smaller than everything else in the scene (the
  // 30-unit cast, ~39-unit building badges).
  const baseW = 17.9, baseH = 9 // 251×125 source, ~2.01 aspect
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
// Redrawn as a plain post + globe (round 23, 2026-08-27) — the round 10
// stone-lantern.png sprite had no folder equivalent at the time. Real
// sprite again round 39 (2026-08-27, "sync all new elements and
// animations") — lamppost.png, cropped from village-structures-decor-
// paths-alpha.png, an actual lamppost. The sprite's own glass reads warm
// regardless of time of day (no separate lit/unlit crop exists for it),
// so the amber blur glow stays the only `dark`-gated part, same as before.
export function LampShape({ x, y, dark = false, scale = 1 }: { x: number; y: number; dark?: boolean; scale?: number }) {
  const w = 10.5, h = 20.2 // 134×258 source, ~0.52 aspect — sized up round 66 ("make street lamps bigger")
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={1.8} rx={7} ry={1.8} fill="var(--text)" opacity={0.12} />
      {/* A soft warm cast even by day (round 66, "add more glow on items") —
          brighter and larger after dark. */}
      <circle cy={-h + 4} r={dark ? 12 : 6} fill="var(--amber)" opacity={dark ? 0.38 : 0.16} filter="url(#vglow)"
        className={dark ? 'village-glow' : undefined} />
      <image href="/village-assets/lamppost.png" x={-w / 2} y={-h + 1.5} width={w} height={h}
        style={{ imageRendering: 'pixelated' }} className={dark ? 'village-glow' : undefined} />
    </g>
  )
}

// The village clock tower (round 54, 2026-08-28) — from
// village-civic-landmarks-alpha.png, which drew it four times, one per time
// of day (plain face by day, warm/gold at dusk, orange at dawn, a moon face
// lit blue at night). `timeOfDay` picks the frame, same idea as
// BuildingShape/LampShape swapping on `dark`.
const CLOCK_SRC: Record<string, string> = {
  dawn: '/village-assets/clock-tower-dawn.png',
  day: '/village-assets/clock-tower-day.png',
  dusk: '/village-assets/clock-tower-dusk.png',
  night: '/village-assets/clock-tower-night.png',
}
export function ClockTowerShape({ x, y, timeOfDay, dark = false, scale = 1 }: {
  x: number; y: number; timeOfDay: string; dark?: boolean; scale?: number
}) {
  const h = 76, w = h * (236 / 438) // 236x438 source — sized up rounds 62/63 ("make ... clock tower bigger" / "a bit bigger"); reads as a real civic landmark
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={1.6} rx={w / 2.2} ry={2} fill="var(--text)" opacity={0.14} />
      {dark && <circle cy={-h * 0.62} r={7} fill="var(--amber)" opacity={0.3} filter="url(#vglow)" />}
      <image href={CLOCK_SRC[timeOfDay] ?? CLOCK_SRC.day} x={-w / 2} y={-h} width={w} height={h}
        style={{ imageRendering: 'pixelated' }} />
    </g>
  )
}

// The wishing well (round 57, 2026-08-28, "wishing well is [a] thank you
// well where we can submit thanks") — well.png from village/village-civic-
// landmarks-alpha.png. Tapping it opens a prompt to drop a thank-you in;
// the caller saves it (see VillageScene's onGratitude).
export function WishingWellShape({ x, y, onClick, glow = false }: { x: number; y: number; onClick?: () => void; glow?: boolean }) {
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  const w = 38, h = 38 // 330x322 source, ~1:1 — sized up rounds 62/63 ("make ... wishing well bigger" / "a bit bigger")
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Hit target = the sprite itself + a hair (round 72, "make sure all
          hit boxes match the element"). */}
      {onClick && <rect x={-w / 2 - 1} y={-h - 1} width={w + 2} height={h + 3} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} />}
      <g onClick={handleClick} className={onClick ? 'village-entity' : undefined} style={{ cursor: onClick ? 'pointer' : undefined }}>
        <title>Drop a thank-you in the well</title>
        <ellipse cx={0} cy={1.5} rx={10} ry={2.4} fill="var(--text)" opacity={0.13} />
        <image href="/village-assets/well.png" x={-w / 2} y={-h} width={w} height={h}
          style={{ imageRendering: 'pixelated' }} />
        {/* Always a soft warm light down in the well (round 63, "make well ...
            like it is glowing inside") — sits over the opening below the
            bucket, gently pulsing via village-glow. The submit-flash `glow`
            is a brighter burst on top of it. */}
        <ellipse cx={0} cy={-h * 0.36} rx={w * 0.2} ry={w * 0.13} fill="var(--amber)"
          opacity={0.45} filter="url(#vglow)" className="village-glow" />
        {glow && <circle cx={0} cy={-h * 0.4} r={12} fill="var(--amber)" opacity={0.5} filter="url(#vglow)" className="village-sparkle" />}
      </g>
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
      {onClick && <rect x={-w / 2 - 1.5} y={-h - 1.5} width={w + 3} height={h + 4} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} />}
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
      {/* Was an off-centre circle (cx 4, cy -9) that missed the post and
          overhung the right (round 72). Now the sprite box + a hair. */}
      {onClick && <rect x={-w / 2 - 1.5} y={-h} width={w + 3} height={h + 3} fill="transparent" style={{ pointerEvents: 'all' }} onClick={handleClick} />}
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
// Real sprite again round 40 (2026-08-27, "put other elements in") —
// bunting.png, cropped from village-decor-lanterns-alpha.png. Hand-drawn
// (round 23, 2026-08-27) in the meantime since round 10's pennant.png had
// no folder equivalent at the time.
export function BuntingShape({ x, y }: { x: number; y: number }) {
  const w = 15.7, h = 6 // 287×109 source, ~2.63 aspect
  return (
    <g transform={`translate(${x} ${y - 34})`} opacity={0.95} pointerEvents="none">
      <image href="/village-assets/bunting.png" x={-w / 2} y={0} width={w} height={h}
        style={{ imageRendering: 'pixelated' }} />
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
// Re-cropped once more round 39 (2026-08-27, "sync all new elements and
// animations") — that sheet was itself replaced by
// sylvia-harry-multi-outfit-library-alpha.png (in the user's "New folder"
// subfolder, moved there alongside the walk/interaction sheets); pulls
// Sylvia's picnic-basket pose and Harry's coffee-cup pose, the first
// cleanly separable (non-touching) pair on that sheet — its own first
// pair (gardening, watering can reaching toward a flower pot) crops as one
// joined sprite the same way the outfit sheet's hand-holding pose did.
// Re-sourced round 51 (2026-08-28, "all of these new animations elements")
// to the dedicated core-animation sheets (sylvia/harry-core-animations-
// alpha.png) — the same figures, cleaner front-facing idle pose, and (the
// point of the swap) a matched smile frame from the same sheet so the
// standing pose can carry a small periodic "smile" beat instead of holding
// one dead expression. Walk/wave stay on their own sheets (SYLVIA_WALK_
// FRAMES / HARRY_WAVE_FRAMES) — those are already tuned and gated.
// Idle + smile re-sourced round 55 (2026-08-28, "update sylvia and harry
// figures") to the crisper *-everyday-message-states-alpha.png sheets in
// character/animation/ — same characters, cleaner line and a matched smile.
// Round 66 — whole core vocabulary (idle / walk×4 / wave×4 / smile) re-cut
// from sylvia-core-animations-alpha.png / harry-core-animations-alpha.png
// in one pass, so proportions and anchor match across every pose and the
// walk is a real 4-frame cycle again (round 55 had trimmed it to 2).
// Re-cut round 73 (2026-08-29, "sylvia's character flower on her hair") from
// the current sylvia/harry-core-animations-alpha.png — the older crops had
// picked up a washed-out pale bloom that read as nothing at scene scale;
// this sheet's flower is a vivid coral on every pose. Whole vocabulary
// (idle / walk×4 / wave×4 / smile) re-cut in one pass so proportions and
// bottom-centre anchor match across every frame.
const VILLAGER_SPRITE: Record<string, { src: string; w: number; h: number }> = {
  Sylvia: { src: '/village-assets/sylvia-idle.png', w: 146, h: 288 },
  Harry: { src: '/village-assets/harry-idle.png', w: 158, h: 266 },
}

// Auto wardrobe (round 71, "make wardrobe change — auto is dependent on
// time or event") — the standing idle pose swaps outfit by season /
// weather: a winter coat + knit hat when it's cold, a rain coat +
// umbrella when it's actually raining, a cosy sweater in autumn. Night is
// handled separately (SleepwearFigure). Cropped from
// character/wardrobe/sylvia-harry-multi-outfit-library-alpha.png. Walk and
// wave frames stay in the default outfit — they're on their own sheets and
// only show for a beat while moving.
// Re-cut round 73 (2026-08-29) from character/wardrobe/wardrobe-*-walk-
// couple-alpha.png — each of those sheets carries a whole matched set
// (standing + a real 4-frame side-walk + a couple pose), so the wardrobe
// now changes the WALK too, not just the standing idle (VILLAGER_OUTFIT_
// WALK below). `party` / `tennis` / `travel` / `artsy` are cropped and
// wired but have no auto-trigger yet — they're one line in VillageScene's
// `outfit` selector away from an event hook. cozy stays on its older crop.
export type Outfit = 'default' | 'winter' | 'rain' | 'cozy' | 'party' | 'business' | 'tennis' | 'travel' | 'artsy'
const VILLAGER_OUTFIT: Record<string, Partial<Record<Outfit, { src: string; w: number; h: number }>>> = {
  Sylvia: {
    winter: { src: '/village-assets/sylvia-winter.png', w: 146, h: 268 },
    rain: { src: '/village-assets/sylvia-rain.png', w: 212, h: 339 },
    cozy: { src: '/village-assets/sylvia-cozy.png', w: 154, h: 357 },
    party: { src: '/village-assets/sylvia-party.png', w: 156, h: 249 },
    business: { src: '/village-assets/sylvia-business.png', w: 133, h: 253 },
    tennis: { src: '/village-assets/sylvia-tennis.png', w: 169, h: 276 },
    travel: { src: '/village-assets/sylvia-travel.png', w: 172, h: 276 },
    artsy: { src: '/village-assets/sylvia-artsy.png', w: 138, h: 271 },
  },
  Harry: {
    winter: { src: '/village-assets/harry-winter.png', w: 153, h: 246 },
    rain: { src: '/village-assets/harry-rain.png', w: 231, h: 341 },
    cozy: { src: '/village-assets/harry-cozy.png', w: 157, h: 342 },
    party: { src: '/village-assets/harry-party.png', w: 158, h: 233 },
    business: { src: '/village-assets/harry-business.png', w: 153, h: 231 },
    tennis: { src: '/village-assets/harry-tennis.png', w: 203, h: 273 },
    travel: { src: '/village-assets/harry-travel.png', w: 128, h: 266 },
    artsy: { src: '/village-assets/harry-artsy.png', w: 130, h: 280 },
  },
}
// The matching 4-frame side-walk for each outfit, so a figure crossing the
// village in the rain actually walks with an umbrella (round 73).
const outfitWalk = (who: string, k: Exclude<Outfit, 'default' | 'cozy'>, aspects: number[]) =>
  aspects.map((aspect, i) => ({ src: `/village-assets/${who.toLowerCase()}-${k}-walk-${i + 1}.png`, aspect }))
const VILLAGER_OUTFIT_WALK: Record<string, Partial<Record<Outfit, { src: string; aspect: number }[]>>> = {
  Sylvia: {
    winter: outfitWalk('Sylvia', 'winter', [151 / 256, 149 / 257, 145 / 255, 146 / 255]),
    rain: outfitWalk('Sylvia', 'rain', [227 / 318, 218 / 316, 230 / 317, 238 / 320]),
    party: outfitWalk('Sylvia', 'party', [127 / 249, 125 / 249, 120 / 249, 127 / 251]),
    business: outfitWalk('Sylvia', 'business', [124 / 250, 129 / 253, 121 / 253, 128 / 239]),
    tennis: outfitWalk('Sylvia', 'tennis', [198 / 293, 189 / 291, 186 / 291, 179 / 291]),
    travel: outfitWalk('Sylvia', 'travel', [172 / 276, 167 / 271, 170 / 273, 169 / 271]),
    artsy: outfitWalk('Sylvia', 'artsy', [138 / 271, 166 / 269, 161 / 271, 160 / 271]),
  },
  Harry: {
    winter: outfitWalk('Harry', 'winter', [117 / 203, 121 / 204, 122 / 204, 120 / 205]),
    rain: outfitWalk('Harry', 'rain', [220 / 308, 228 / 309, 231 / 309, 226 / 304]),
    party: outfitWalk('Harry', 'party', [121 / 231, 121 / 230, 122 / 230, 123 / 230]),
    business: outfitWalk('Harry', 'business', [122 / 227, 134 / 227, 126 / 227, 124 / 229]),
    tennis: outfitWalk('Harry', 'tennis', [191 / 275, 183 / 274, 181 / 274, 178 / 274]),
    travel: outfitWalk('Harry', 'travel', [128 / 266, 135 / 271, 138 / 270, 135 / 270]),
    artsy: outfitWalk('Harry', 'artsy', [130 / 280, 133 / 286, 142 / 286, 134 / 286]),
  },
}
const VILLAGER_SMILE: Record<string, string> = {
  Sylvia: '/village-assets/sylvia-smile.png',
  Harry: '/village-assets/harry-smile.png',
}

// Sylvia's real 4-frame walk cycle and Harry's real 4-frame wave, both from
// sylvia-harry-walk-wave-animation-alpha.png (round 46, 2026-08-28, "make
// sure the animations also work and are not randomized but make sense.
// walking when still. interaction when near"). Round 30 gave both figures
// a CSS position-drift (village-wander-sylvia/-harry, globals.css) but no
// pose to go with it — a fixed standing sprite sliding across the ground
// is exactly the "walking while still" mismatch this round fixes. Harry's
// own keyframes bring him closest to Sylvia once per lap (his wander
// animation's own 50% mark); his wave is gated to just that window via
// village-harry-wave-vis/-idle-vis (globals.css), so he greets her
// specifically when they're actually near each other, not at random.
//
// Round 47 (2026-08-28, "when users first goon they should both wave then
// walk around... face the direction they are walking... every now and
// then the couple should interact") adds two more things, both driven
// entirely from globals.css so no new render-time state is needed here:
// an opening 0-6%-of-loop window where Harry's wave plays a SECOND time
// (a real greeting the moment the village loads, ahead of the recurring
// near-Sylvia one) and Sylvia holds her idle pose instead of already
// walking mid-stride — hence Sylvia now needs the same idle/walk gate
// Harry's wave/idle already had, not "always walking while wander" any
// more; and a facing flip (village-face-sylvia/-harry) on a dedicated
// inner <g>, timed to the exact same movement keyframes, so each of them
// visibly turns toward whichever way they're currently headed.
// Round 52 (2026-08-28, "add all the animations in a random cycle that
// makes sense", character/animation/ folder) — re-sourced from the two
// core-animation sheets so each figure's whole vocabulary (idle / walk /
// wave / smile) comes from ONE sheet: consistent proportions, anchor and
// three-quarter view. Both figures now have a real walk cycle AND a real
// wave — before, Harry only ever slid across the ground in his standing
// pose (no walk art) and Sylvia had no wave to greet with. The old
// back-view walk-wave sheet crops (sylvia-walk / harry-wave, round 46) are
// retired. Widths vary per wave frame because the raised arm sticks out
// past the body — SpriteCycle derives width per frame and bottom-center
// anchors, so the body stays planted while the arm extends.
// Just the two profile stride frames (round 55) — the core sheet's other
// two walk poses are near-frontal, which broke the "facing the way they
// walk" read; a clean 2-frame contact/contact cycle sells the direction.
const SYLVIA_WALK_FRAMES = [
  { src: '/village-assets/sylvia-walk-1.png', aspect: 140 / 288 },
  { src: '/village-assets/sylvia-walk-2.png', aspect: 137 / 286 },
  { src: '/village-assets/sylvia-walk-3.png', aspect: 138 / 287 },
  { src: '/village-assets/sylvia-walk-4.png', aspect: 138 / 286 },
]
const SYLVIA_WAVE_FRAMES = [
  { src: '/village-assets/sylvia-wave-1.png', aspect: 146 / 290 },
  { src: '/village-assets/sylvia-wave-2.png', aspect: 164 / 290 },
  { src: '/village-assets/sylvia-wave-3.png', aspect: 168 / 289 },
  { src: '/village-assets/sylvia-wave-4.png', aspect: 146 / 283 },
]
const HARRY_WALK_FRAMES = [
  { src: '/village-assets/harry-walk-1.png', aspect: 150 / 265 },
  { src: '/village-assets/harry-walk-2.png', aspect: 147 / 267 },
  { src: '/village-assets/harry-walk-3.png', aspect: 148 / 263 },
  { src: '/village-assets/harry-walk-4.png', aspect: 149 / 264 },
]
const HARRY_WAVE_FRAMES = [
  { src: '/village-assets/harry-wave-1.png', aspect: 158 / 267 },
  { src: '/village-assets/harry-wave-2.png', aspect: 176 / 273 },
  { src: '/village-assets/harry-wave-3.png', aspect: 187 / 267 },
  { src: '/village-assets/harry-wave-4.png', aspect: 158 / 266 },
]
const VILLAGER_WALK: Record<string, { src: string; aspect: number }[]> = { Sylvia: SYLVIA_WALK_FRAMES, Harry: HARRY_WALK_FRAMES }
const VILLAGER_WAVE: Record<string, { src: string; aspect: number }[]> = { Sylvia: SYLVIA_WAVE_FRAMES, Harry: HARRY_WAVE_FRAMES }

// Real two-character interaction art (round 49, 2026-08-28, "there are
// interactions for harry and sylvia... update all elements and
// animations"), from sylvia-harry-interactions-special-moments-alpha.png
// and village-animation-people-interaction.png — nine combined poses (a
// high-five, a flower handed over, planting a seedling together, a heart
// card, a couple of plain together-stances, a walk side by side, watering a
// pot together, sharing an umbrella) cycled slowly and shown only during
// the brief "together" window each wander lap already brings Sylvia and
// Harry home for (village-couple-interact-vis/village-wander-sylvia's own
// added opacity term in globals.css) — the real version of round 47's
// "every now and then the couple should interact," which until now had
// only a position-drift standing in for it. One 9-pose meta-cycle exactly
// covers 9 wander laps (48s × 9 = 432s), so a different pose shows each
// time they come together rather than the same one on repeat.
const COUPLE_INTERACT_FRAMES = [
  { src: '/village-assets/sh-int-standing.png', aspect: 328 / 334 },
  { src: '/village-assets/sh-int-highfive.png', aspect: 375 / 330 },
  { src: '/village-assets/sh-int-flower-card.png', aspect: 358 / 315 },
  { src: '/village-assets/sh-int-planting.png', aspect: 328 / 296 },
  { src: '/village-assets/sh-int-heart-card.png', aspect: 361 / 355 },
  { src: '/village-assets/sh-int-stand2.png', aspect: 443 / 402 },
  { src: '/village-assets/sh-int-walk-together.png', aspect: 432 / 395 },
  { src: '/village-assets/sh-int-watering.png', aspect: 492 / 393 },
  { src: '/village-assets/sh-int-umbrella.png', aspect: 435 / 429 },
  // Index 9 — the couple reading on a bench (sh-int-bench). Not part of the
  // random meta-cycle above; VillageScene selects it explicitly when the
  // couple gather at a bench (round 59, "when we put sylvia harry in a
  // known element like bench or picnic they do their respective interaction").
  { src: '/village-assets/sh-int-bench.png', aspect: 346 / 323 },
]
/** Frame index for "reading on a bench". */
export const COUPLE_BENCH_FRAME = 9
/** Frame index for "picnic / sitting under the umbrella". */
export const COUPLE_PICNIC_FRAME = 8

// One interaction pose, chosen by the caller (round 52 follow-up) — was a
// slow auto-cycling SpriteCycle, but the couple only actually meet for one
// stretch per lap, so VillageScene now holds a `poseIndex` it bumps each
// meeting and this just draws that frame. A different interaction every
// time they come together, and nothing animating while they're apart.
// One combined-pose crop per outfit (round 73) — when the couple meet in
// the rain or the snow they do the outfit's own together-beat (sharing an
// umbrella, warming their hands on mugs) instead of a default one.
const COUPLE_OUTFIT_POSE: Partial<Record<Outfit, { src: string; aspect: number }>> = {
  rain: { src: '/village-assets/couple-rain.png', aspect: 275 / 350 },
  winter: { src: '/village-assets/couple-winter.png', aspect: 294 / 353 },
  tennis: { src: '/village-assets/couple-tennis.png', aspect: 247 / 266 },
  travel: { src: '/village-assets/couple-travel.png', aspect: 333 / 333 },
  artsy: { src: '/village-assets/couple-artsy.png', aspect: 299 / 300 },
}

export function CoupleInteraction({ x, y, poseIndex = 0, outfit = 'default' }: { x: number; y: number; poseIndex?: number; outfit?: Outfit }) {
  const n = COUPLE_INTERACT_FRAMES.length
  const outfitPose = outfit !== 'default' ? COUPLE_OUTFIT_POSE[outfit] : undefined
  const f = outfitPose ?? COUPLE_INTERACT_FRAMES[((poseIndex % n) + n) % n]
  const h = 34
  const w = h * f.aspect
  return (
    <image href={f.src} x={x - w / 2} y={y - h} width={w} height={h}
      style={{ imageRendering: 'pixelated' }} preserveAspectRatio="none" />
  )
}

// The tenth pose from the same interactions sheet — sitting together on a
// bench — held in reserve for quiet evenings (see VillageScene's own
// `quiet` block): round 48 could only fake "two figures sit on a bench"
// with plain stillness since no seated art existed yet; this is that real
// pose, finally.
export function CoupleBenchShape({ x, y }: { x: number; y: number }) {
  const h = 34
  const w = h * (346 / 323)
  return (
    <image href="/village-assets/sh-int-bench.png" x={x - w / 2} y={y - h} width={w} height={h}
      style={{ imageRendering: 'pixelated' }} preserveAspectRatio="none" />
  )
}

export function VillagerShape({ x, y, name, scale = 1, onClick, wander = true, pose = 'idle', face = 1, outfit = 'default' }: {
  x: number; y: number; name: string
  /** Unused now that this renders a fixed-art sprite — see this file's own
   *  header note on why the props stayed rather than being removed. */
  hairColor?: string; outfitColor?: string
  scale?: number
  onClick?: () => void
  /** Auto wardrobe (round 71) — the idle pose only; walk/wave/smile stay
   *  in the default outfit. */
  outfit?: Outfit
  /** Off during arrange mode (round 46) — a moving/animating figure
   *  fighting a real drag would be unusable, so the caller forces a static
   *  idle pose, native facing. */
  wander?: boolean
  /** Which sprite set to show (round 53, 2026-08-28) — driven by
   *  useCoupleLife's state machine now, not a CSS visibility track. */
  pose?: 'idle' | 'walk' | 'wave'
  /** 1 = native facing, -1 = mirrored (round 53). */
  face?: 1 | -1
}) {
  const handleClick = onClick ? (e: React.MouseEvent) => { e.stopPropagation(); onClick() } : undefined
  const sprite = VILLAGER_SPRITE[name] ?? VILLAGER_SPRITE.Harry
  // Fixed render height in scene units, width derived from the sprite's own
  // aspect ratio so it's never stretched.
  const h = 33
  const w = h * (sprite.w / sprite.h)
  const isSylvia = name === 'Sylvia'
  const showWalk = wander && pose === 'walk'
  const showWave = wander && pose === 'wave'
  const showIdle = !showWalk && !showWave
  // The idle pose can carry a seasonal/weather outfit; everything else
  // stays in the default kit.
  const outfitSprite = outfit !== 'default' ? VILLAGER_OUTFIT[name]?.[outfit] : undefined
  const outfitWalkFrames = outfit !== 'default' ? VILLAGER_OUTFIT_WALK[name]?.[outfit] : undefined
  const idleSprite = outfitSprite ?? sprite
  const iw = h * (idleSprite.w / idleSprite.h)
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} onClick={handleClick}
      className={onClick ? 'village-entity' : undefined}
      style={{ cursor: onClick ? 'pointer' : undefined }}>
      <title>{name}</title>
      {/* Hit box hugs the figure (round 72) — was a 41-wide circle on a
          ~18-wide sprite, which stole taps from whoever was standing
          next to them. A bit of side pad for the wave arm. */}
      {onClick && <rect x={-w / 2 - 4} y={-h - 3} width={w + 8} height={h + 7} fill="transparent" style={{ pointerEvents: 'all' }} />}
      {/* Facing via the standalone CSS `scale` property (composes with the
          outer `transform` rather than replacing it — see this file's round
          47 note) — flipped the instant a walk starts (round 55, "always
          walk looking towards direction they walk"). Native facing while
          idle/arranging. */}
      <g style={wander ? { scale: `${face} 1` } : undefined}>
        <ellipse cx={0} cy={1} rx={w / 2.4} ry={1.6} fill="var(--text)" opacity={0.15} />
        {showIdle && (
          <g>
            <image href={idleSprite.src} x={-iw / 2} y={-h} width={iw} height={h}
              style={{ imageRendering: 'pixelated' }} preserveAspectRatio="none" />
            {wander && !outfitSprite && (
              <image href={VILLAGER_SMILE[name]} x={-w / 2} y={-h} width={w} height={h}
                style={{ imageRendering: 'pixelated', animation: 'village-idle-smile 7s linear infinite', animationDelay: isSylvia ? '0s' : '-3.5s' }}
                preserveAspectRatio="none" />
            )}
          </g>
        )}
        {showWalk && <SpriteCycle frames={outfitWalkFrames ?? VILLAGER_WALK[name]} x={0} y={0} height={h} periodSec={1} />}
        {showWave && <SpriteCycle frames={VILLAGER_WAVE[name]} x={0} y={0} height={h} periodSec={isSylvia ? 2.1 : 1.9} />}
      </g>
    </g>
  )
}

// Somi's real coloring (2026-08-25) — white/grey siamese mix, blue eyes.
// Fixed hex, not theme vars, for the same reason grass reads green
// elsewhere in this file: a specific cat's actual coat isn't themeable.
// Siamese "points" (ears, tail, face mask) run a cooler blue-grey against
// a warm white body/chest.
export function CatShape({ x, y, name = 'Somi', scale = 1, onClick, wander = true, sleeping = false, pose = 'idle', face = 1 }: {
  x: number; y: number; name?: string
  /** JS-driven wander (round 65, "allow somi to wander") — useWanderer
   *  supplies an absolute target the caller glides to with a CSS transition;
   *  `pose` picks the sprite set and `face` mirrors her, exactly like
   *  VillagerShape. Replaces the old fixed village-somi-move CSS loop. */
  pose?: 'idle' | 'walk' | 'react'
  face?: 1 | -1
  /** Night (round 51, 2026-08-28) — swaps the idle/walk pose sets for one
   *  curled sleeping loaf (somi-sleep.png, from somi-sleeping-states-alpha
   *  .png), the real art behind "Somi is asleep nearby" that dusk/night
   *  quiet mode only implied before. Click target / hover-card unchanged. */
  sleeping?: boolean
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
  // "night ambient" sheet (round 25), corrected to 8 poses from
  // exec-1a806105….png (round 26), reordered into all 12 in a real
  // narrative order (round 28), and split into gated idle/walk sets (round
  // 31). Round 39 (2026-08-27, "sync all new elements and animations")
  // re-sources the whole cycle again — exec-1a806105….png is gone from the
  // folder, replaced by two purpose-built sheets:
  // somi-idle-tail-head-animation-alpha.png (4 sit/head-tilt idle frames)
  // and somi-walk-stretch-animation-alpha.png (a real, correctly-ordered
  // 4-frame walk cycle plus a 4-frame stretch sequence — this is the
  // actual dedicated walk-cycle sheet the earlier "mixed pose sheet, hope
  // the walk frames are in order" approach never had). The old pounce/
  // sit-tall/curled poses have no equivalent in either new sheet and are
  // dropped rather than kept without a source.
  // 20 -> 22 (round 50, "make all items a bit bigger... nothing too big or
  // small") — same modest bump as VillagerShape's own h, keeping Somi's
  // proportion to Sylvia/Harry roughly where it already was.
  const h = 22
  const idleFrames = [
    { src: '/village-assets/somi-sit-1.png', aspect: 254 / 335 },
    { src: '/village-assets/somi-sit-2.png', aspect: 273 / 335 },
    { src: '/village-assets/somi-head-tilt-1.png', aspect: 261 / 337 },
    { src: '/village-assets/somi-head-tilt-2.png', aspect: 262 / 334 },
    { src: '/village-assets/somi-stretch.png', aspect: 316 / 265 },
  ]
  const walkFrames = [
    { src: '/village-assets/somi-walk-1.png', aspect: 317 / 260 },
    { src: '/village-assets/somi-walk-2.png', aspect: 305 / 260 },
    { src: '/village-assets/somi-walk-3.png', aspect: 320 / 258 },
    { src: '/village-assets/somi-walk-4.png', aspect: 303 / 260 },
  ]
  const showWalk = wander && pose === 'walk' && !sleeping
  const reacting = pose === 'react' && !sleeping
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g onClick={handleClick}
        className={[onClick && 'village-entity', reacting && 'village-tapped'].filter(Boolean).join(' ') || undefined}
        style={{ cursor: onClick ? 'pointer' : undefined }}>
        <title>{name}</title>
        {/* Hit box matches Somi's widest pose (the stretch) + a hair
            (round 72) — was a circle wide enough to also catch Sylvia
            standing beside her. */}
        {onClick && <rect x={-14} y={-h - 2} width={28} height={h + 5} fill="transparent" style={{ pointerEvents: 'all' }} />}
        {/* Facing composes with the caller's translate() via the standalone
            `scale` property, same trick VillagerShape uses. */}
        <g style={wander ? { scale: `${face} 1` } : undefined}>
          <ellipse cx={0} cy={1} rx={h / 2.2} ry={1.6} fill="var(--text)" opacity={0.15} />
          {sleeping ? (() => {
            const sh = h * 0.6, sw = sh * (379 / 282)
            return <image href="/village-assets/somi-sleep.png" x={-sw / 2} y={-sh} width={sw} height={sh}
              style={{ imageRendering: 'pixelated' }} />
          })() : reacting ? (() => {
            // Tapped — a stretch (round 66, "when we click figures they
            // should react"). somi-stretch.png is her one non-idle single
            // pose; the village-tapped bounce on the group sells the beat.
            const rw = h * (316 / 265)
            return <image href="/village-assets/somi-stretch.png" x={-rw / 2} y={-h} width={rw} height={h}
              style={{ imageRendering: 'pixelated' }} />
          })() : showWalk ? (
            <SpriteCycle frames={walkFrames} x={0} y={0} height={h} periodSec={0.8} />
          ) : (
            <SpriteCycle frames={idleFrames} x={0} y={0} height={h} periodSec={60} />
          )}
        </g>
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
// Rendered footprint of each DistrictArt case, in its own local units
// BEFORE the outer <g scale(1.3)> DistrictLabel applies. `home` and
// `building` draw nothing here (Home's cottage and the Projects log cabin
// are real structures in VillageScene, each with its own hit area). Used to
// size DistrictLabel's invisible tap target so it matches the sprite that's
// actually drawn instead of a one-size fixed rect (round 72, "make sure all
// hit boxes match the element").
const DISTRICT_ART_BOX: Record<DistrictIconKind, { w: number; h: number }> = {
  home: { w: 0, h: 0 },
  building: { w: 0, h: 0 },
  leaf: { w: 30, h: 14 },   // the swaying-flower cluster
  book: { w: 46, h: 41 },   // greenhouse.png
  places: { w: 32, h: 24 }, // car.png
  people: { w: 44, h: 53 }, // people-tree.png
}

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
    case 'leaf': // Growth Garden — a cluster of swaying flowers (round 62, "make
      // growing garden symbol the swaying flowers"). Real bloomed-flower sprites
      // (flower-4.png) leaning gently side to side via village-flower-sway
      // (globals.css), each offset by a negative animation-delay so the cluster
      // never sways in lockstep. Replaces the tree grove (rounds 11-61) — real
      // habits still grow as plants in the grove nearby; the symbol itself is
      // flowers now, and the one big tree that used to sit here is gone (only
      // People keeps a big tree).
      // Several single blooms (round 63, "make growth garden symbol multiple
      // small flowers swaying") — bloom-red/-white-a/-white-b.png are single
      // flowers cropped from the flower growth sheet. Spread across the
      // symbol's footprint at mixed heights, each swaying on its own delay
      // AND its own slightly different duration, so the little patch ripples
      // rather than leaning as one block.
      // Smaller again round 65 ("growth garden flowers are still too big,
      // make smaller") — heights cut ~45% and the spread pulled in; note
      // DistrictLabel scales this whole group by 1.3 × the district's own
      // 1.12, so a listed h of 7 renders ~10 units tall.
      return (
        <g>
          <ellipse cx={0} cy={1.5} rx={11} ry={1.8} fill="var(--text)" opacity={0.16} />
          {[
            { src: 'bloom-white-a', x: -9, h: 9, ar: 140 / 232, d: '-0.4s', dur: '4.3s' },
            { src: 'bloom-red', x: -4, h: 11.5, ar: 128 / 224, d: '-2.1s', dur: '4.9s' },
            { src: 'bloom-white-b', x: 2, h: 9.5, ar: 128 / 220, d: '-1.2s', dur: '3.9s' },
            { src: 'bloom-red', x: 7.5, h: 7.5, ar: 128 / 224, d: '-3.0s', dur: '4.6s' },
            { src: 'bloom-white-a', x: 11.5, h: 7, ar: 140 / 232, d: '-0.8s', dur: '4.1s' },
          ].map((b, i) => {
            const w = b.h * b.ar
            return (
              <image key={i} href={`/village-assets/${b.src}.png`}
                x={b.x - w / 2} y={-b.h} width={w} height={b.h}
                className="village-flower-sway"
                style={{ imageRendering: 'pixelated', animationDelay: b.d, animationDuration: b.dur }} />
            )
          })}
        </g>
      )
    case 'building': // Projects — nothing here now (round 64, "make log house bigger and
      // the symbol for projects"). Same pattern as 'home': the real log cabin is drawn
      // directly in VillageScene, anchored to this district's position, so drawing a
      // second symbol (the briefcase, rounds 57-63) on top of it was two things competing
      // for one job. DistrictLabel still renders its glow + hit-rect + "Projects" label
      // here; the cabin a few pixels away is the symbol.
      return null
    case 'book': // Archive — a real library building now (round 45, 2026-08-28, "update the
      // village with these elements. relabel if makes more sense") — library.png, from
      // village-social-town-spaces-alpha.png, an actual library (book-motif gable window),
      // replacing the greenhouse crop (rounds 11-44) that had been standing in for "library/
      // greenhouse" since there was no real library art yet. The Life Tree stays where it is,
      // drawn separately in VillageScene (real years-of-account data, not decoration) — also
      // upgraded this round to real tree art, see its own comment.
      return (
        <g>
          <ellipse cx={0} cy={2} rx={20} ry={2.9} fill="var(--text)" opacity={0.17} />
          {/* Back to greenhouse.png round 57 — library.png's source sheet
              (village-social-town-spaces) is no longer in the master folder.
              Sized up round 58 ("other buildings a bit bigger"). */}
          <image href="/village-assets/greenhouse.png" x={-23} y={-41} width={46} height={41}
            style={{ imageRendering: 'pixelated' }} />
          {dark && <circle cx={0} cy={-22} r={12} fill="var(--amber)" opacity={0.26} filter="url(#vglow)" />}
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
    case 'people': // People — the big community tree (round 57, 2026-08-28, "make people
      // symbol the big tree (make bigger)") — people-tree.png, the gnarled tree-with-a-
      // bench-round-its-base from village/village-civic-landmarks-alpha.png. A gathering
      // tree reads as "the people in your life" far better than the picnic mat (rounds
      // 40-56) it replaces, and it's drawn large on purpose — the tallest district symbol.
      return (
        <g>
          {/* Re-cropped round 65 — the old crop sliced the left of the
              canopy and the top off ("people tree is still broken and
              sliced and small"). Full sprite now (374×450, ar 0.831),
              rendered bigger. */}
          {/* Eased down again round 69 ("also make the people tree smaller")
              — 53 -> 44 wide. Still the tallest district symbol, just not
              house-sized any more. */}
          <ellipse cx={-1} cy={2} rx={16} ry={2.4} fill="var(--text)" opacity={0.17} />
          <image href="/village-assets/people-tree.png" x={-22} y={-53} width={44} height={53}
            style={{ imageRendering: 'pixelated' }} />
        </g>
      )
  }
}

export function DistrictLabel({ x, y, icon, label, count, onClick, draggable = false, dragging = false, onPointerDown, onHoverIn, onHoverOut, dark = false, scale = 1, selected = false }: {
  x: number; y: number; icon: DistrictIconKind; label: string; count: string; onClick: () => void
  /** Arrange mode — see VillageScene's startDrag/onMoveLandmark. */
  draggable?: boolean
  dragging?: boolean
  onPointerDown?: (e: React.PointerEvent) => void
  /** Desktop hover preview (round 71) — a tap opens the district directly
   *  now, so the compact summary card only shows on real pointer hover. */
  onHoverIn?: () => void
  onHoverOut?: () => void
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
      onMouseEnter={draggable ? undefined : onHoverIn} onMouseLeave={draggable ? undefined : onHoverOut}
      className="village-district" style={{ cursor: draggable ? (dragging ? 'grabbing' : 'grab') : 'pointer' }}>
      <title>{draggable ? `${label} — drag to move` : `${label} — ${count}. Tap to open.`}</title>
      {/* Invisible hit area, sized from the actual DistrictArt footprint
          (×1.3, the scale it's drawn at) plus the label/count text stack
          below (round 72). For `home`/`building` the art is empty, so this
          falls back to a small rect covering the glow + label — the real
          cottage/cabin carry their own bigger hit areas in VillageScene. */}
      {(() => {
        const box = DISTRICT_ART_BOX[icon]
        const artW = box.w * 1.3, artH = box.h * 1.3
        const halfW = Math.max(19, artW / 2 + 2)
        const top = Math.min(-18, -artH - 2)
        const bottom = 27 // covers the label (y 13) and count (y 23) lines
        return <rect x={-halfW} y={top} width={2 * halfW} height={bottom - top} fill="transparent" style={{ pointerEvents: 'all' }} />
      })()}
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
      {/* Bumped 0.1 → 0.15, r 16 → 19 (round 40, 2026-08-28, "add glow and
          ambience to light sources and ambience"). */}
      <circle r={19} fill="var(--amber)" opacity={0.15} filter="url(#vglow)" />
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
