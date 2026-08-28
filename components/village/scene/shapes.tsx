'use client'

import { STAGE_INDEX, hashPos, type Plant, type Building } from '@/lib/village/state'

// The repeated silhouettes: one per habit, one per project, one per district
// label. Split out of Village.tsx unchanged — these are the pieces that appear
// N times, while the one-off scenery stays in VillageScene where you can read
// the composition order top to bottom.

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
  // Third species added (round 16, 2026-08-27, the user's own
  // village-master-visual-assets.zip growth-neglect-recovery sheet) — a
  // real 5-stage flower growth sequence, the first genuine "grows AND
  // visibly neglects" art this scene has: two wilted-branch frames replace
  // the flat grayscale filter tomato/potato still use for a dormant plant.
  const species = (() => {
    const r = hashPos(plant.id + 'species')
    return r < 0.34 ? 'tomato' : r < 0.67 ? 'potato' : 'flower'
  })()
  const size = [14, 20, 27, 33, 38][i]
  const dormantSprite = species === 'flower'
    ? `flower-dormant-${hashPos(plant.id + 'wilt') < 0.5 ? 1 : 2}`
    : null

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
export function BenchShape({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const w = 15.7, h = 9.9 // 327×207 source, same aspect ratio
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={2} rx={9} ry={1.6} fill="var(--text)" opacity={0.1} />
      <image href="/village-assets/bench2.png" x={-w / 2} y={-h + 2} width={w} height={h}
        style={{ imageRendering: 'pixelated' }} />
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
// Real sprite (round 10, 2026-08-27) — same custom pack. The stone lantern's
// window is baked in as already-lit, so it reads warm even by day; the
// amber blur glow is added only at night, on top, for real atmosphere.
export function LampShape({ x, y, dark = false, scale = 1 }: { x: number; y: number; dark?: boolean; scale?: number }) {
  const w = 12.5, h = 13.1 // 253×266 source, same aspect ratio
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={1.5} rx={5} ry={1.4} fill="var(--text)" opacity={0.12} />
      {dark && <circle cy={-8} r={6} fill="var(--amber)" opacity={0.22} filter="url(#vglow)" />}
      <image href="/village-assets/stone-lantern.png" x={-w / 2} y={-h} width={w} height={h}
        style={{ imageRendering: 'pixelated' }} className={dark ? 'village-glow' : undefined} />
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
  const w = 12.6, h = 15.6 // 262×325 source, same aspect ratio
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
  const w = 13.7, h = 18 // 207×272 source, same aspect ratio
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
// Real sprite (round 10, 2026-08-27) — the pack's own pennant banner reads
// as festive on its own (a flower on cream fabric), replacing the hand-drawn
// flag string.
export function BuntingShape({ x, y }: { x: number; y: number }) {
  const w = 14.2, h = 12.5 // 281×247 source, same aspect ratio
  return (
    <g transform={`translate(${x} ${y})`} opacity={0.95} pointerEvents="none">
      <image href="/village-assets/pennant.png" x={-w / 2} y={-40} width={w} height={h}
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
const VILLAGER_SPRITE: Record<string, { src: string; w: number; h: number }> = {
  Sylvia: { src: '/village-assets/sylvia.png', w: 156, h: 319 },
  Harry: { src: '/village-assets/harry.png', w: 175, h: 312 },
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
  // Real sprite art (round 9), made alive (round 13), then replaced with a
  // cleaner second animation set the user supplied directly (round 15,
  // 2026-08-27, village-animation-somi-transparent.png — genuinely clean
  // hard-alpha art, confirmed via a full histogram: every pixel is either
  // 0 or 255, no soft/dithered edges at all). Six poses now, not seven —
  // round 13's belly-up frame came from a different source file and had
  // no equivalent here, so it's dropped rather than mixed with a
  // differently-styled art source. Every frame cropped to its own EXACT
  // opaque bounding box (no padding) specifically so SpriteCycle's
  // bottom-anchor lines up the same "ground" position in every pose —
  // the user's own "make sure they are aligned" ask: padding this size
  // would’ve differed as a fraction of each frame's own height and made
  // poses visibly hop up/down as they cycled.
  const h = 20
  const frames = [
    { src: '/village-assets/somi-idle-1.png', aspect: 272 / 305 },
    { src: '/village-assets/somi-idle-2.png', aspect: 240 / 301 },
    { src: '/village-assets/somi-idle-3.png', aspect: 285 / 300 },
    { src: '/village-assets/somi-walk.png', aspect: 360 / 230 },
    { src: '/village-assets/somi-stretch.png', aspect: 357 / 223 },
    { src: '/village-assets/somi-play.png', aspect: 372 / 211 },
  ]
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} onClick={handleClick}
      className={onClick ? 'village-entity' : undefined}
      style={{ cursor: onClick ? 'pointer' : undefined }}>
      <title>{name}</title>
      {/* Same oversized invisible hit circle as VillagerShape — see its own
          2026-08-25 fix comment ("can't click the figures"). Sized off the
          idle pose's own width, not whichever frame happens to be showing —
          a stable hit target regardless of which pose is currently up. */}
      {onClick && <circle cx={0} cy={-h / 2} r={Math.max(14, h / 2 + 4)} fill="transparent" style={{ pointerEvents: 'all' }} />}
      <ellipse cx={0} cy={1} rx={h / 2.2} ry={1.6} fill="var(--text)" opacity={0.15} />
      <SpriteCycle frames={frames} x={0} y={0} height={h} periodSec={18} />
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
          <ellipse cx={0} cy={2} rx={15} ry={2.2} fill="var(--text)" opacity={0.16} />
          <path d="M -11 2 Q -2 4 4 1 T 11 2" stroke="var(--surface2)" strokeWidth={2.5} strokeLinecap="round" opacity={0.4} fill="none" />
          <path d="M -11 2 Q -2 4 4 1 T 11 2" stroke="var(--border)" strokeWidth={2.5} strokeDasharray="1 5" strokeLinecap="round" opacity={0.5} fill="none" />
          <g opacity={0.85}>
            <SpriteCycle frames={TREE_SWAY_FRAMES} x={-16 + 6.2} y={1} height={15} periodSec={6.5} />
          </g>
          <image href="/village-assets/pine-tree.png" x={-7} y={-26} width={13.3} height={26}
            style={{ imageRendering: 'pixelated' }} />
          <SpriteCycle frames={TREE_SWAY_FRAMES} x={6 + 7.9} y={0} height={19} periodSec={7.8} />
        </g>
      )
    case 'building': // Projects — a real workshop sprite (round 11, 2026-08-27, same custom
      // pack), replacing the hand-drawn construction site.
      return (
        <g>
          <ellipse cx={0} cy={2} rx={16} ry={2.3} fill="var(--text)" opacity={0.17} />
          <image href="/village-assets/workshop.png" x={-16.8} y={-24} width={33.5} height={24}
            style={{ imageRendering: 'pixelated' }} />
          {dark && <circle cx={4} cy={-15} r={5} fill="var(--amber)" opacity={0.2} filter="url(#vglow)" />}
        </g>
      )
    case 'book': // Archive — a real greenhouse sprite (round 11, 2026-08-27, same custom pack) —
      // the exact "library/greenhouse" identity this district has been reaching for by hand
      // since the 2026-08-24 reskin, now with the actual building. The Life Tree stays where
      // it is, drawn separately in VillageScene (real years-of-account data, not decoration).
      return (
        <g>
          <ellipse cx={0} cy={2} rx={15} ry={2.2} fill="var(--text)" opacity={0.17} />
          <image href="/village-assets/greenhouse.png" x={-15} y={-24} width={30} height={24}
            style={{ imageRendering: 'pixelated' }} />
          {dark && <circle cx={0} cy={-13} r={6} fill="var(--amber)" opacity={0.16} filter="url(#vglow)" />}
        </g>
      )
    case 'places': // Places — a real market/shop sprite (round 11, 2026-08-27, same custom
      // pack), replacing the hand-drawn kiosk.
      return (
        <g>
          <ellipse cx={0} cy={2} rx={16} ry={2.2} fill="var(--text)" opacity={0.16} />
          <image href="/village-assets/shop.png" x={-16.1} y={-24} width={32.3} height={24}
            style={{ imageRendering: 'pixelated' }} />
          {dark && <circle cx={0} cy={-14} r={5.5} fill="var(--amber)" opacity={0.2} filter="url(#vglow)" />}
        </g>
      )
    case 'people': // People — an empty bench, not a second Sylvia/Harry (round 14 fix,
      // 2026-08-27 — round 13 briefly used the pack's real couple-on-a-bench sprite here, but
      // there should only ever be ONE Sylvia and ONE Harry in the village, and the real ones
      // already stand by Home; a second rendering of them sitting on a district badge was
      // exactly the kind of duplicate-character confusion the "two houses" fix spent a whole
      // round eliminating for buildings. The real bench2.png sprite already used at the actual
      // People corner (VillageScene's peopleCorner prop) stands in for the district itself too.
      return (
        <g>
          <ellipse cx={0} cy={2} rx={12} ry={2} fill="var(--text)" opacity={0.16} />
          <image href="/village-assets/bench2.png" x={-5.9} y={-7.5} width={11.85} height={7.5}
            style={{ imageRendering: 'pixelated' }} />
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
