import { hashPos } from '@/lib/village/state'
import type { LandmarkId } from '@/lib/village/layout'

// Static scene data + pure helpers, extracted from VillageScene.tsx
// (2026-09-04) — ~500 lines of module-scope constant scatter arrays and
// path math that never touched component state. VillageScene imports
// them back; nothing else moved.

export const GROUND_Y = 210

// A fixed scatter of grass tufts along the ground line (2026-08-21) — one
// of the concrete things making the scene read as sparse rather than calm:
// a wide gap of bare ground between the tree line and the district row with
// nothing in it. hashPos() keyed by a fixed per-tuft string keeps every
// tuft's position and height stable across renders — same "pure function of
// an id" rule the rest of the village runs under, just with a literal index
// standing in for a real entity id since these aren't tied to any data.
export const GRASS_TUFTS = Array.from({ length: 64 }, (_, i) => {
  const seed = `grass-${i}`
  const x = 20 + hashPos(seed) * 760
  const h = 4 + hashPos(seed + 'h') * 5
  return { x, h, id: seed }
})

// More texture on the ground (2026-08-24) — same reasoning as GRASS_TUFTS,
// borrowed directly from BloomScan's own ground: it scatters 80 tufts AND
// 14 stones AND a distant treeline AND pollen motes, where Village had only
// the grass. Stones sit a little further from the path line than the grass
// does, low opacity, so they read as texture rather than as things.
export const STONES = Array.from({ length: 32 }, (_, i) => {
  const seed = `stone-${i}`
  const x = 15 + hashPos(seed) * 770
  const r = 1.4 + hashPos(seed + 'r') * 2.2
  return { x, r, id: seed }
})

// Distant treeline silhouette, behind the grass, in front of the sky — the
// empty gap between horizon and ground that made the scene read as flat.
// A little more here than one flat band: two overlapping rows at slightly
// different heights, same trick BloomScan's own treeline uses.
export const DISTANT_TREES = Array.from({ length: 30 }, (_, i) => {
  const seed = `dtree-${i}`
  const x = 10 + hashPos(seed) * 780
  const h = 8 + hashPos(seed + 'h') * 7
  return { x, h, id: seed }
})

// Pollen motes — pure atmosphere, no data behind them at all, same as
// BloomScan's own four fixed dust circles. Deterministic positions so the
// scene doesn't shimmer differently every render.
export const POLLEN = [
  { x: 176, y: 185 }, { x: 248, y: 240 }, { x: 496, y: 165 }, { x: 680, y: 350 },
  { x: 340, y: 300 }, { x: 590, y: 220 },
]

// A real green palette (2026-08-27, round 6) — the whole scene ran on two
// tones (#8CA57C/#94AD84) plus a flat --emerald, which is most of why it
// read as an illustration of a village rather than a place. The reference
// art the direction is drawn from (Stardew/Animal-Crossing-style cozy tile
// games) never uses one green: it stacks a light sunlit tone, two or three
// mid tones, and a deep shadow tone, and lets the variation itself do the
// work of texture. Ordered light -> dark so callers can index by depth
// (nearer/lower on the canvas = deeper, since the light comes from the sky).
export const GREENS = ['#A7C08E', '#95B07E', '#87A471', '#789364', '#688055', '#586E47']

// The near foreground (2026-08-27, round 6) — the actual fix for "there is
// too much empty space," which survived four rounds of adding detail because
// every round added it to the SAME thin band. Everything in this scene lives
// between roughly GROUND_Y-40 and GROUND_Y+40 (y 170..250); the canvas is 440
// tall, so the bottom ~43% was bare gradient with nothing in it at all.
//
// This is the diorama trick the reference art leans on: a band of scenery
// nearer the camera than anything else, drawn LARGER and DARKER (less
// atmospheric light reaches it, and near things are bigger), which does two
// things at once — it fills the dead space, and it pushes the village itself
// into the middle distance so the whole picture reads as having depth rather
// than as one flat plane with props on it.
//
// `depth` runs 0..1 from the back of this band to the very front and drives
// both scale and which GREENS tone gets used, so the layer self-sorts into a
// gradient of size and darkness instead of being a uniform scatter.
export const FOREGROUND_COUNT = 38
export const FOREGROUND = Array.from({ length: FOREGROUND_COUNT }, (_, i) => {
  const seed = `fg-${i}`
  const depth = hashPos(seed + 'd')
  // Round 58 ("fix the random trees and bushes (scale and placement)") —
  // held to a ~110-unit band (was 172, which flung the near ones almost to
  // the canvas edge) and a lower scale ceiling.
  const y = GROUND_Y + 56 + depth * 110
  const kind = (hashPos(seed + 'k') < 0.42 ? 'bush' : hashPos(seed + 'k') < 0.78 ? 'grass' : 'flower') as 'bush' | 'grass' | 'flower'
  // Bucketed for a guaranteed minimum spacing (round 7 — overlapping
  // same-tone clumps fused into a "shapeless mass"), but every 4th item is
  // pulled toward its neighbour so the meadow has clumps and clearings
  // instead of one even carpet (round 74).
  const bucketW = 860 / FOREGROUND_COUNT
  let x = -30 + i * bucketW + hashPos(seed + 'x') * bucketW * 0.85
  if (i % 4 === 1) x -= bucketW * 0.55
  // Scale ceiling lowered from 2.2x to ~1.55x, and flowers capped lower
  // still — a giant flower cluster read as a magenta block, while a giant
  // bush at least still reads as "a bush," just an oversized one.
  const baseScale = 0.55 + depth * 0.72
  return {
    id: seed, x, y, depth, kind,
    scale: kind === 'flower' ? baseScale * 0.7 : baseScale,
    tone: Math.min(GREENS.length - 1, 2 + Math.floor(depth * 4)),
  }
}).sort((a, b) => a.depth - b.depth)

// Mid-ground bushes (2026-08-27, round 6) — between the treeline and the
// district row, the other band that was mostly bare. Smaller and lighter
// than FOREGROUND, so the two layers read as different distances rather
// than as the same scatter repeated twice.
export const MIDGROUND_COUNT = 22
export const MIDGROUND_BUSHES = Array.from({ length: MIDGROUND_COUNT }, (_, i) => {
  const seed = `mg-${i}`
  // Bucketed x, same reasoning as FOREGROUND above (round 7 fix); every
  // third one nudged toward its neighbour for clumping (round 74).
  const bucketW = 820 / MIDGROUND_COUNT
  return {
    id: seed,
    x: -10 + i * bucketW + hashPos(seed + 'x') * bucketW * 0.8 - (i % 3 === 0 ? bucketW * 0.5 : 0),
    // Extended from +2..+36 to +2..+56 (round 14, 2026-08-27) — that left a
    // bare 22-unit gap (y 246..268) between where MIDGROUND stopped and
    // FOREGROUND started, undoing some of round 6's own "close the empty
    // space" fix now that there's a real named prop or two also sitting in
    // that band.
    y: GROUND_Y + 4 + hashPos(seed + 'y') * 40,
    scale: 0.45 + hashPos(seed + 's') * 0.4,
    tone: 1 + Math.floor(hashPos(seed + 't') * 3),
  }
})

// A handful of extra trees scattered around the wider village, not just in
// the Growth Forest badge's own compact 3-tree grove (round 29, 2026-08-27,
// "add more trees and ambient elements") — real pine-tree.png/round-tree
// sprites at fixed spots away from the districts and named props, so the
// village itself reads more wooded rather than all the greenery living in
// one small icon. Not draggable (same "fixed background scenery" idiom as
// DISTANT_TREES/POLLEN) — these are atmosphere, not something to arrange.
// Grown into a real grove (round 37, 2026-08-27, "make growth forest a
// whole area like a grove that has both trees and flowers for habits") —
// FOREST (lib/village/layout.ts) lays real habit-plants out across x
// 40..360; this used to only put 3 trees in that same band (one pine, two
// round, all crammed into the small DistrictArt badge) plus a couple more
// scattered elsewhere in the village. Now 7 trees genuinely fill that same
// x-range as a loose backdrop the flowers actually stand among, so Growth
// Forest reads as a wooded place with habits growing in it rather than a
// small icon next to a scatter of flower dots. Two more stay outside that
// range as unrelated ambient trees near Archive/Home.
// Un-lined (round 38, 2026-08-27, "fix arrangement of bushes, tree as it
// is in a straigt line right now") — round 37's 7 grove trees were laid
// out by hand at even x-spacing and a narrow ~20-unit y range (all hugging
// the path), which is exactly what reads as a row instead of a grove.
// Procedural now, same hashPos-per-seed determinism GRASS_TUFTS/STONES/
// FOREGROUND already use: x spans the same forest band with real jitter, y
// spans a much wider band (GROUND_Y+8..+72) so trees actually sit at
// different depths, and height/opacity follow that same depth (nearer =
// bigger and fuller) the way FOREGROUND's own scatter already does.
// Round 58 ("fix the random trees and bushes (scale and placement)") —
// fewer trees (7 -> 5), held to a shallow depth band (GROUND_Y+10..+32)
// instead of scattering across 64 units of the whole yard, and a tighter
// height range so they read as one grove at one distance rather than a
// jumble. Still hashPos-deterministic per seed.
// Clustered, not lined up (round 74, 2026-08-29, "fix arrangement of
// nature") — every earlier pass laid trees at even x-spacing with a little
// jitter, which is still a row. `clusterX` gathers items around a handful
// of copse anchors with a long tail of lone stragglers, the way real
// woodland reads: dense knots with gaps between, not a hedge. A shared
// helper so the grove, the backdrop line and the meadow all use the same
// clumping.
export function clusterX(seed: string, anchors: number[], spread: number, strayChance = 0.18, strayRange: [number, number] = [40, 760]) {
  if (hashPos(seed + 'stray') < strayChance) {
    return strayRange[0] + hashPos(seed + 'sx') * (strayRange[1] - strayRange[0])
  }
  const a = anchors[Math.floor(hashPos(seed + 'a') * anchors.length) % anchors.length]
  return a + (hashPos(seed + 'jx') - 0.5) * spread
}

// The grove behind Growth Garden — a real thicket now: ~10 trees in three
// tight knots across the forest band, canopies overlapping, a couple of
// saplings out front. Still hashPos-deterministic.
export const GROVE_TREE_COUNT = 10
export const GROVE_TREES = Array.from({ length: GROVE_TREE_COUNT }, (_, i) => {
  const seed = `grove-${i}`
  const x = clusterX(seed, [86, 168, 250, 320], 46, 0.12, [46, 350])
  const depth = hashPos(seed + 'd')
  const y = GROUND_Y + 4 + depth * 22
  return {
    x, y, kind: (hashPos(seed + 'k') < 0.42 ? 'pine' : 'round') as 'pine' | 'round',
    h: 13 + depth * 9, opacity: 0.62 + depth * 0.26,
    sway: hashPos(seed + 'sw') < 0.7,
  }
})

// The backdrop woodland — set back near the hill line, drawn small and
// dim so it's a horizon, not clutter. Clustered into copses with the
// centre kept clear so Home never sits in a bush. ~18 trees.
export const BACKDROP_TREES = Array.from({ length: 18 }, (_, i) => {
  const seed = `bg-tree-${i}`
  const x = clusterX(seed, [40, 96, 150, 210, 560, 620, 690, 748], 44, 0.14, [20, 780])
  const depth = hashPos(seed + 'd')
  return {
    x, y: GROUND_Y - 20 + depth * 14,
    kind: (hashPos(seed + 'k') < 0.5 ? 'pine' : 'round') as 'pine' | 'round',
    h: 13 + depth * 10, opacity: 0.34 + depth * 0.24,
    sway: hashPos(seed + 'sw') < 0.5,
  }
}).filter(t => t.x < 315 || t.x > 500)

// A few mid-distance trees standing among the districts themselves, near
// Archive and off past People — the village reads as sitting IN the woods,
// not next to a painting of them.
export const YARD_TREES = [
  { x: 690, y: GROUND_Y + 6, kind: 'round' as const, h: 20, opacity: 0.9, sway: true },
  { x: 44, y: GROUND_Y + 30, kind: 'pine' as const, h: 24, opacity: 0.95, sway: true },
  { x: 772, y: GROUND_Y + 40, kind: 'round' as const, h: 22, opacity: 0.92, sway: true },
]

export const EXTRA_TREES: { x: number; y: number; kind: 'pine' | 'round'; h: number; opacity?: number; sway?: boolean }[] = [
  ...BACKDROP_TREES,
  ...GROVE_TREES,
  ...YARD_TREES,
]

// A path through the ground, and a few small props along it (2026-08-24) —
// "less empty, more composed": a dirt path implies the districts are places
// you actually walk between, rather than icons floating over bare ground. It
// deliberately does NOT try to touch every district label's exact
// coordinate — those float freely as draggable UI badges (see arrange mode
// above) and a path wired to their literal position would tear the moment
// someone rearranges one. This is scenery, not wiring: one gentle curve
// through the ground band, fixed regardless of layout.
//
// Moved from GROUND_Y-40..-20 down to GROUND_Y+14..+40 (round 4, 2026-08-27
// fix) — that original band sat almost exactly on top of the separate hill-
// ridge silhouette line just below (same GROUND_Y-8..-26 range), so the two
// unrelated lines visually tangled into one confusing squiggle instead of
// reading as "a ridge behind a path" (live report: "the path looks off").
// Now clearly BELOW the ridge, in the actual grass the buildings stand in.
// Shifted down +15 (round 42, 2026-08-28, "move path down") — was sitting
// close enough to the district row that it read as tangled up with it
// rather than a clearly separate ground feature underneath everything.
// A wanderier line round 66 ("make paths more natural") — more through-
// points and a wider y-swing, and it's built from the same PATH_WAYPOINTS
// the pavers follow so the stones and the dirt tint never drift apart. A
// Catmull-Rom-ish smooth curve through every point.
export const PATH_D = catmullRom([
  { x: 24, y: GROUND_Y + 44 }, { x: 130, y: GROUND_Y + 30 }, { x: 235, y: GROUND_Y + 52 },
  { x: 345, y: GROUND_Y + 33 }, { x: 455, y: GROUND_Y + 56 }, { x: 560, y: GROUND_Y + 34 },
  { x: 668, y: GROUND_Y + 52 }, { x: 780, y: GROUND_Y + 30 },
])

// Fixed cozy nature details (round 74, 2026-08-29, "make everything more
// aesthetic and cozy" / "import all elements") — boulders, wildflower
// meadows and flower patches placed by hand in the open ground away from
// the path and the districts, so the village reads as a lived-in clearing
// in the woods rather than props on a lawn. Not draggable — atmosphere,
// same idiom as GRASS_TUFTS / EXTRA_TREES.
export const NATURE_DETAILS: { src: string; x: number; y: number; w: number; flip?: boolean }[] = [
  { src: 'boulder-cluster.png', x: 96, y: GROUND_Y + 70, w: 20 },
  { src: 'boulder-cluster.png', x: 726, y: GROUND_Y + 30, w: 15, flip: true },
  { src: 'rock-cluster.png', x: 300, y: GROUND_Y + 66, w: 15 },
  { src: 'rock-cluster.png', x: 590, y: GROUND_Y + 72, w: 13, flip: true },
  { src: 'wildflower-meadow.png', x: 200, y: GROUND_Y + 86, w: 78 },
  { src: 'wildflower-meadow.png', x: 640, y: GROUND_Y + 90, w: 66, flip: true },
  { src: 'flower-patch.png', x: 486, y: GROUND_Y + 40, w: 16 },
  { src: 'flower-patch.png', x: 140, y: GROUND_Y + 44, w: 14 },
  { src: 'firewood-bundle.png', x: 250, y: GROUND_Y + 20, w: 11 },
]
export function catmullRom(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`
  }
  return d
}

// Stepping-stone pavers along the path (round 26, 2026-08-27, "make the
// path look more like a path... fit the style and theme more") — the
// smooth gradient-stroke trail from round 25 read more like a road-with-
// lane-markings than the flat, blocky, muted-earth-tone pixel language
// every sprite in this scene actually uses (see ATTRIBUTION.md's own style
// guardrail: "large clean pixel blocks... avoid photorealism"). Small
// rounded squares in the same TRIM-family palette as the buildings, placed
// along PATH_D's own through-points (a straight-segment approximation of
// its Q/T curve — close enough at paver scale) via the same hashPos
// determinism GRASS_TUFTS/STONES already use for "same spot, every load."
export const PATH_WAYPOINTS = [
  { x: 24, y: GROUND_Y + 44 }, { x: 130, y: GROUND_Y + 30 }, { x: 235, y: GROUND_Y + 52 },
  { x: 345, y: GROUND_Y + 33 }, { x: 455, y: GROUND_Y + 56 }, { x: 560, y: GROUND_Y + 34 },
  { x: 668, y: GROUND_Y + 52 }, { x: 780, y: GROUND_Y + 30 },
]
export function pointOnPathWaypoints(t: number) {
  const segs = PATH_WAYPOINTS.length - 1
  const scaled = Math.min(segs - 0.0001, t * segs)
  const i = Math.floor(scaled)
  const localT = scaled - i
  const a = PATH_WAYPOINTS[i], b = PATH_WAYPOINTS[i + 1]
  return { x: a.x + (b.x - a.x) * localT, y: a.y + (b.y - a.y) * localT }
}
// Denser and bigger (round 42, 2026-08-28, "use the cobblestone path") —
// 32 small, widely-jittered stones read as a faint scatter rather than a
// path you could actually see at a glance; 48 larger ones with a tighter
// rotation range overlap enough to read as one continuous cobbled surface.
export const PATH_PAVER_COUNT = 48
export const PATH_PAVERS = Array.from({ length: PATH_PAVER_COUNT }, (_, i) => {
  const t = i / (PATH_PAVER_COUNT - 1)
  const { x, y } = pointOnPathWaypoints(t)
  const seed = `paver-${i}`
  return {
    id: seed, x, y: y + (hashPos(seed + 'y') - 0.5) * 3,
    rot: (hashPos(seed + 'r') - 0.5) * 10,
    size: 7 + hashPos(seed + 's') * 2.4,
    tone: hashPos(seed + 't') < 0.5,
  }
})

// Short spur paths connecting the main trail to each district's door
// (round 65, "connect paths") — a run of the same cobblestones from the
// nearest point on the main path up to just below the landmark. Wired to
// each district's DEFAULT position, not its live one: like the main path
// this is ground scenery, and a spur that snapped around every time a
// badge was dragged would tear (see PATH_D's own "scenery, not wiring"
// note). DISTRICT_SPUR_TARGETS is filled in after DEFAULT_LANDMARK_POS is
// declared (below).
export function nearestPathX(x: number) {
  // The main path is near-horizontal, so the closest point is essentially
  // straight down at the same x — clamp to the path's own x-range.
  const cx = Math.max(PATH_WAYPOINTS[0].x, Math.min(PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1].x, x))
  // y from the piecewise-linear waypoints at that x.
  let seg = 0
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    if (cx >= PATH_WAYPOINTS[i].x && cx <= PATH_WAYPOINTS[i + 1].x) { seg = i; break }
  }
  const a = PATH_WAYPOINTS[seg], b = PATH_WAYPOINTS[seg + 1]
  const f = (cx - a.x) / (b.x - a.x)
  return { x: cx, y: a.y + (b.y - a.y) * f }
}
export function spurPavers(targetX: number, targetY: number, key: string) {
  const from = nearestPathX(targetX)
  const to = { x: targetX, y: targetY + 6 }
  const n = Math.max(3, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 9))
  // A gentle sideways bow so the spur curves off the main path rather than
  // meeting it at a hard right angle (round 66, "make paths more natural").
  const bow = (hashPos(key + 'bow') - 0.5) * 18
  return Array.from({ length: n }, (_, i) => {
    const f = i / (n - 1)
    const seed = `spur-${key}-${i}`
    const arc = Math.sin(f * Math.PI) * bow
    return {
      id: seed,
      x: from.x + (to.x - from.x) * f + arc + (hashPos(seed + 'x') - 0.5) * 3,
      y: from.y + (to.y - from.y) * f + (hashPos(seed + 'y') - 0.5) * 3,
      rot: (hashPos(seed + 'r') - 0.5) * 12,
      size: 6 + hashPos(seed + 's') * 2,
    }
  })
}

// A pond, two benches, three flower beds — small fixed props scattered near
// the path, same "pure atmosphere, deterministic position" rule as
// STONES/POLLEN above.
// Positions baked from Sylvia's own arrangement round 61 where she moved
// one (bench-1, lamp-2, flowerBed-2, pond); the rest keep their earlier
// composed spots.
export const PROPS = {
  pond: { x: 663, y: 320 },
  benches: [
    { x: 260, y: GROUND_Y - 6 },
    { x: 527, y: 280 },
    { x: 130, y: GROUND_Y + 26 },
  ],
  flowerBeds: [
    { x: 90, y: GROUND_Y + 14, hue: 'var(--blush)' },
    { x: 340, y: GROUND_Y - 30, hue: 'var(--gold)' },
    { x: 623, y: 210, hue: 'var(--blush)' },
    { x: 700, y: GROUND_Y - 8, hue: 'var(--gold)' },
    { x: 200, y: GROUND_Y + 32, hue: 'var(--blush)' },
  ],
  // Fences (2026-08-25, removed round 34, back round 39 with real solid-
  // panel art — see FenceShape's own comment) and lamps — the rest of
  // "denser, more lived-in ground" from PROPS above. A short fence run
  // near Home reads as a real yard boundary; lamps mark the path itself so
  // it reads as a real route, lit after dark.
  fences: [
    { x: 350, y: GROUND_Y + 6, length: 4 },
    { x: 450, y: GROUND_Y + 10, length: 4 },
  ],
  // y shifted from GROUND_Y-24..-36 to GROUND_Y+18..+34 (round 4,
  // 2026-08-27) — PATH_D itself moved down the same amount this round (see
  // its own comment), and these are specifically meant to mark the path,
  // not just decorate the general area.
  lamps: [
    { x: 240, y: GROUND_Y + 26 },
    { x: 500, y: GROUND_Y + 34 },
    { x: 426, y: 261 },
  ],
}

// Default scale for a few items Sylvia sized in her arrangement (round 61)
// — layout[id].scale still wins when set.
export const DEFAULT_ITEM_SCALE: Record<string, number> = {
  busStop: 1.15,
  wildflowerScene: 0.4,
}

// Postcards from your trips together (round 66) — the images live in
// public/village-assets/postcards/, cropped from the `post/` master folder.
// The rack in the scene opens a panel of these; a Google Photos album link
// per postcard is the next step (stored per-user, keyed by `id`).
export const POSTCARDS: { id: string; label: string }[] = [
  { id: 'yosemite', label: 'Yosemite' },
  { id: 'lakeside-camping', label: 'Lakeside camping' },
  { id: 'bike-ride', label: 'Bike ride' },
  { id: 'new-apartment', label: 'New apartment' },
  { id: 'cooking-at-home', label: 'Cooking at home' },
  { id: 'board-game-night', label: 'Board game night' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'bowling', label: 'Bowling' },
  { id: 'golf', label: 'Golf' },
]


// Village district labels read as a dashboard the moment a number leads a
// string — DistrictLabel puts an iOS-style red notification-badge circle on
// ANY count starting with a digit (see its own comment), which is exactly
// the "notification badge" the Village vision explicitly asks to remove.
// Spelling small counts as words (matching the vision doc's own "Six ideas
// quietly grew" style) keeps the number legible without it reading as an
// unread-count. Caps at ten; anything past that is a genuinely large
// number, and "many" reads better than a wall of digits anyway.
export const SMALL_NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
export function spellCount(n: number): string {
  return n <= 10 ? SMALL_NUMBER_WORDS[n] : 'many'
}
// Default landmark-label positions — the ones every account starts with,
// and what "Reset positions" (see Village.tsx) restores. Pulled out as a
// named map (rather than left as literal props on each DistrictLabel call)
// so arrangeable() below has one place to fall back to.
// Grounded (round 17 fix, 2026-08-27, "make the buildings on the ground;
// its floating right now") — archive/people/places sat at y 180-205 while
// forest/home/projects sat at y 250. GROUND_Y is 210 and the actual path
// (PATH_D, drawn at GROUND_Y+18..+40) runs well below that, so those three
// districts' real sprite buildings were rendering up in the hillside band
// above the path instead of sitting on it — a genuine positioning bug, not
// a rendering one. All six now share the same ground line; x stays put.
// Round 61 baked in Sylvia's own arrangement, but that pushed projects/
// archive/people down to y ~300-318 — far into the near foreground, where
// their art rendered oversized and in front of the path while the other
// three sat on the ground line. Round 65 ("fix depth") brings all six back
// onto one ground band (y ~198-214) with only a gentle stagger, so the row
// reads as one village at one distance. x spread out a little too so the
// bigger cabin / people-tree / greenhouse don't crowd each other.
// Round 66 — Sylvia's own arrangement (Arrange → Copy layout): forest /
// archive / home / places / clock tower on the ground line, people /
// projects / gazebo / the well pulled forward into the near foreground
// on purpose.
export const DEFAULT_LANDMARK_POS: Record<LandmarkId, { x: number; y: number }> = {
  forest: { x: 132, y: 204 },
  home: { x: 400, y: 208 },
  projects: { x: 114, y: 306 },
  archive: { x: 725, y: 204 },
  people: { x: 627, y: 317 },
  places: { x: 512, y: 209 },
}

// Spur cobblestones from the main path to each district (round 65) — see
// spurPavers() above. Static, keyed to the default positions.
export const SPUR_PAVERS = (Object.entries(DEFAULT_LANDMARK_POS) as [LandmarkId, { x: number; y: number }][])
  .filter(([id]) => id !== 'home') // Home sits on the path already
  .flatMap(([id, p]) => spurPavers(p.x, p.y, id))

// Default positions for every purely-decorative prop (round 12, 2026-08-27,
// "make it so we are able to customize the placement of these") — the six
// district labels above have been draggable in arrange mode since round
// 2026-08-21; this extends the exact same mechanism (decorPos/startDrag/
// onMoveLandmark, all now string-keyed) to individual scenery instead of
// just the six landmarks. Coordinates below are each prop's own original
// fixed spot, unchanged — this only adds an override path, nothing moves
// until a user actually drags something.
// Round 23 (2026-08-27, "update only using these elements. delete all old
// ones") removed bike/flowerPot/laundryBasket/breadBasket/teaSet/swing/
// blankSign — the round 9-10 custom-pack sprites behind them have no
// equivalent in the master-visual-assets folder, and rather than leave
// mismatched old art in, these props (and their scene blocks below) are
// gone rather than replaced.
// Extended to EVERY named prop in the scene (round 27, 2026-08-27, "make
// everything moveable") — the pond, benches, flower beds, fences, lamps,
// the Mailbox, the Trips signpost, and the cast (Sylvia/Harry/Somi) were
// the only things left with no override path; each now gets an id here
// (PROPS' own arrays are spread in below so their positions stay the one
// source of truth) and a <Draggable> wrapper at its render call, same as
// every other decor prop. Still NOT extended to FOREGROUND/MIDGROUND_
// BUSHES — 62 procedurally-scattered, individually-meaningless texture
// items where dragging one at a time would be tedium, not customization.
export const DECOR_DEFAULTS: Record<string, { x: number; y: number }> = {
  // 'gate' removed round 35 (2026-08-27) — see the item-prop list below.
  // Round 61 ("make the village default what it is right now") — positions
  // for everything Sylvia moved are baked in from her Copy layout dump;
  // the rest keep their earlier spots.
  busStop: { x: 570, y: 215 },
  postcardRack: { x: 648, y: 236 },
  peopleCorner: { x: 225, y: GROUND_Y + 2 },
  bushMound: { x: 166, y: 310 },
  floweringBush: { x: 586, y: 248 },
  tallGrass: { x: 264, y: 290 },
  rockCluster: { x: 751, y: 238 },
  paperLantern: { x: 602, y: 213 },
  // Round 27 additions — previously-fixed scenery, now draggable too.
  pond: PROPS.pond,
  ...Object.fromEntries(PROPS.benches.map((p, i) => [`bench-${i}`, p])),
  ...Object.fromEntries(PROPS.flowerBeds.map((p, i) => [`flowerBed-${i}`, p])),
  ...Object.fromEntries(PROPS.fences.map((p, i) => [`fence-${i}`, p])),
  ...Object.fromEntries(PROPS.lamps.map((p, i) => [`lamp-${i}`, p])),
  mailbox: { x: 462, y: GROUND_Y - 4 },
  signpost: { x: 752, y: 322 },
  clockTower: { x: 212, y: 211 },
  wishingWell: { x: 297, y: 328 },
  picnicMat: { x: 430, y: 300 },
  gazebo: { x: 715, y: 309 },
  footBridgeScene: { x: 239, y: 285 },
  firewoodScene: { x: 458, y: GROUND_Y + 6 },
  wildflowerScene: { x: 634, y: 328 },
  waterPumpScene: { x: 520, y: 317 },
  // Round 63 ("import all elements ... place some too") — a raised garden
  // bed and a flower planter box near Growth Garden, and a warm garden
  // lantern on the path. All from the village/ master folder's
  // progress-garden-beds / left-behind-objects / decor-lanterns sheets.
  gardenBed: { x: 96, y: GROUND_Y + 40 },
  flowerPlanter: { x: 250, y: GROUND_Y + 44 },
  gardenLantern: { x: 318, y: 261 },
  hobbyEasel: { x: 150, y: GROUND_Y + 58 },
  hobbyTennis: { x: 449, y: 293 },
  hobbyBookCoffee: { x: 505, y: GROUND_Y + 40 },
  hobbyMusicStand: { x: 560, y: GROUND_Y + 62 },
  hobbyInstrumentCase: { x: 489, y: 323 },
  hobbyBicycle: { x: 452, y: GROUND_Y + 66 },
  hobbyGardenBasket: { x: 118, y: GROUND_Y + 30 },
  sylvia: { x: 372, y: GROUND_Y + 8 },
  harry: { x: 428, y: GROUND_Y + 8 },
  somi: { x: 330, y: 237 },
  // Round 27's seven community-props items (well, clothesline, an
  // alternate mailbox, bird bath, bench-and-arbor, bike+flower pot, a veg
  // crate) are gone (round 32, 2026-08-27, "delete any elements that are
  // not from my folder and currently not in my folder right now") — their
  // source, village-expansion-community-props-alpha.png, is no longer in
  // the user's master-assets folder (replaced by a foliage/path-tile sheet
  // and a festival-props sheet, neither of which covers the same items).
}
