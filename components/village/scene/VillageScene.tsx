'use client'

import { useEffect, useRef, useState } from 'react'
import type { VillageState } from '@/lib/village/state'
import type { Slot } from '@/lib/village/layout'
import type { SeasonPalette } from '@/lib/village/palette'
import type { Celestial as CelestialData } from '@/lib/village/sky'
import { weatherMeta, type WeatherCondition } from '@/lib/village/weather'
import { goToSection, goToPersonal, goToHousehold, openSmartHome } from '@/lib/utils/navigate'
import { PlantShape, BuildingShape, DistrictLabel, EntityCallout, FeatureIcon, PondShape, BenchShape, FlowerBedShape, FenceShape, LampShape, MemoryMarker, VillagerShape, CatShape, MailboxShape, SignpostShape, BuntingShape, ClockTowerShape, WishingWellShape, Draggable, CoupleInteraction, CoupleBenchShape, SleepwearFigure, seasonTree, WALL, WALL_SHADOW, ROOF, ROOF_LIGHT, TRIM } from './shapes'
import { createClient } from '@/lib/supabase/client'

// The swaying flower cluster (round 13) and its FLOWER_SWAY_FRAMES were
// removed round 57 — the tree-flower-sway-animation sheet they came from is
// no longer in the master folder.
import Sky from './Sky'
import Clouds from './Clouds'
import Ambient from './Ambient'
import Horizon from './Horizon'
import type { HorizonPlace } from '@/lib/hooks/useSharedHorizon'
import type { VillageChanges } from '@/lib/village/state'
import { hashPos } from '@/lib/village/state'
import { LANDMARK_IDS, type VillageLayout, type LandmarkId } from '@/lib/village/layout'
import { findAsset, parseCustomItemId } from '@/lib/village/assetLibrary'
import { useCoupleLife } from './useCoupleLife'

// Raised from 372 (2026-08-25) — the ground used to be a thin strip at the
// very bottom of the canvas (68px of 440, ~15%) with almost the whole frame
// spent on empty sky gradient above it. 210 puts the ground/village at
// roughly 52% of the frame, matching "this is my little world" rather than
// "a sitemap floating over a sky." Every other position in this file is
// already expressed relative to GROUND_Y (forestSlots/districtSlots,
// Horizon, Ambient, the path/props/grass/stones below), so they all move up
// with it automatically — only DEFAULT_LANDMARK_POS below needed a manual
// nudge to actually sit near the new, higher ground line.
export const GROUND_Y = 210

// A fixed scatter of grass tufts along the ground line (2026-08-21) — one
// of the concrete things making the scene read as sparse rather than calm:
// a wide gap of bare ground between the tree line and the district row with
// nothing in it. hashPos() keyed by a fixed per-tuft string keeps every
// tuft's position and height stable across renders — same "pure function of
// an id" rule the rest of the village runs under, just with a literal index
// standing in for a real entity id since these aren't tied to any data.
const GRASS_TUFTS = Array.from({ length: 64 }, (_, i) => {
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
const STONES = Array.from({ length: 32 }, (_, i) => {
  const seed = `stone-${i}`
  const x = 15 + hashPos(seed) * 770
  const r = 1.4 + hashPos(seed + 'r') * 2.2
  return { x, r, id: seed }
})

// Distant treeline silhouette, behind the grass, in front of the sky — the
// empty gap between horizon and ground that made the scene read as flat.
// A little more here than one flat band: two overlapping rows at slightly
// different heights, same trick BloomScan's own treeline uses.
const DISTANT_TREES = Array.from({ length: 17 }, (_, i) => {
  const seed = `dtree-${i}`
  const x = 10 + hashPos(seed) * 780
  const h = 8 + hashPos(seed + 'h') * 7
  return { x, h, id: seed }
})

// Pollen motes — pure atmosphere, no data behind them at all, same as
// BloomScan's own four fixed dust circles. Deterministic positions so the
// scene doesn't shimmer differently every render.
const POLLEN = [
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
const GREENS = ['#A7C08E', '#95B07E', '#87A471', '#789364', '#688055', '#586E47']

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
const FOREGROUND_COUNT = 40
const FOREGROUND = Array.from({ length: FOREGROUND_COUNT }, (_, i) => {
  const seed = `fg-${i}`
  const depth = hashPos(seed + 'd')
  const y = GROUND_Y + 58 + depth * 172
  const kind = (hashPos(seed + 'k') < 0.5 ? 'bush' : hashPos(seed + 'k') < 0.82 ? 'grass' : 'flower') as 'bush' | 'grass' | 'flower'
  // One bucket of the canvas width per item, jittered within the bucket
  // (round 7 fix, 2026-08-27) — the previous fully-random x let several
  // same-depth items land close together, and at this layer's largest
  // scale (nearest the bottom edge) a handful of overlapping same-tone
  // bushes/flowers fused into one solid, shapeless mass instead of reading
  // as a meadow (live report: "this is not cute"). A guaranteed minimum
  // spacing fixes that without losing the organic scatter — the jitter
  // still varies each item's exact position within its own bucket.
  const bucketW = 860 / FOREGROUND_COUNT
  const x = -30 + i * bucketW + hashPos(seed + 'x') * bucketW * 0.85
  // Scale ceiling lowered from 2.2x to ~1.55x, and flowers capped lower
  // still — a giant flower cluster read as a magenta block, while a giant
  // bush at least still reads as "a bush," just an oversized one.
  const baseScale = 0.6 + depth * 0.95
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
const MIDGROUND_COUNT = 22
const MIDGROUND_BUSHES = Array.from({ length: MIDGROUND_COUNT }, (_, i) => {
  const seed = `mg-${i}`
  // Bucketed x, same reasoning as FOREGROUND above (round 7 fix).
  const bucketW = 820 / MIDGROUND_COUNT
  return {
    id: seed,
    x: -10 + i * bucketW + hashPos(seed + 'x') * bucketW * 0.85,
    // Extended from +2..+36 to +2..+56 (round 14, 2026-08-27) — that left a
    // bare 22-unit gap (y 246..268) between where MIDGROUND stopped and
    // FOREGROUND started, undoing some of round 6's own "close the empty
    // space" fix now that there's a real named prop or two also sitting in
    // that band.
    y: GROUND_Y + 2 + hashPos(seed + 'y') * 54,
    scale: 0.5 + hashPos(seed + 's') * 0.5,
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
const GROVE_TREE_COUNT = 7
const GROVE_TREES = Array.from({ length: GROVE_TREE_COUNT }, (_, i) => {
  const seed = `grove-${i}`
  // x0 nudged 20 -> 65 (round 40, "zoom in but make sure everything is
  // still in frame") — the tighter viewBox's own left edge sits at 50 (see
  // BASE_VB_W/CX below); 65 leaves real margin for a tree's own width past
  // its trunk-center x, not just the trunk itself.
  const bucketW = 300 / GROVE_TREE_COUNT
  const x = 65 + i * bucketW + hashPos(seed + 'x') * bucketW * 0.9
  const depth = hashPos(seed + 'd')
  const y = GROUND_Y + 8 + depth * 64
  return {
    x, y, kind: (hashPos(seed + 'k') < 0.5 ? 'pine' : 'round') as 'pine' | 'round',
    h: 17 + depth * 12, opacity: 0.65 + depth * 0.3,
  }
})
// Two fixed ambient trees outside the forest band, near Archive/Home —
// unrelated to the grove, unchanged from round 37.
const EXTRA_TREES: { x: number; y: number; kind: 'pine' | 'round'; h: number; opacity?: number }[] = [
  ...GROVE_TREES,
  { x: 680, y: GROUND_Y + 36, kind: 'round', h: 25 },
  { x: 470, y: GROUND_Y + 32, kind: 'pine', h: 22 },
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
const PATH_D = `M 40 ${GROUND_Y + 39} Q 130 ${GROUND_Y + 55} 220 ${GROUND_Y + 45} T 400 ${GROUND_Y + 37} T 580 ${GROUND_Y + 47} T 760 ${GROUND_Y + 35}`

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
const PATH_WAYPOINTS = [
  { x: 40, y: GROUND_Y + 39 }, { x: 220, y: GROUND_Y + 45 }, { x: 400, y: GROUND_Y + 37 },
  { x: 580, y: GROUND_Y + 47 }, { x: 760, y: GROUND_Y + 35 },
]
function pointOnPathWaypoints(t: number) {
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
const PATH_PAVER_COUNT = 48
const PATH_PAVERS = Array.from({ length: PATH_PAVER_COUNT }, (_, i) => {
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

// A pond, two benches, three flower beds — small fixed props scattered near
// the path, same "pure atmosphere, deterministic position" rule as
// STONES/POLLEN above.
const PROPS = {
  pond: { x: 460, y: GROUND_Y + 30 },
  benches: [
    { x: 260, y: GROUND_Y - 6 },
    { x: 660, y: GROUND_Y + 4 },
    { x: 130, y: GROUND_Y + 26 },
  ],
  flowerBeds: [
    { x: 90, y: GROUND_Y + 14, hue: 'var(--blush)' },
    { x: 340, y: GROUND_Y - 30, hue: 'var(--gold)' },
    { x: 570, y: GROUND_Y + 20, hue: 'var(--blush)' },
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
    { x: 690, y: GROUND_Y + 18 },
  ],
}

export type { Slot } from '@/lib/village/layout'

// The weather card's own short phrase (round 3, 2026-08-27) — "1:12 AM 61° /
// Thursday, August 27 · Clear · full moon / A still night in your village."
// was three lines of increasingly specific data; "Still tonight / 61° · Full
// moon" says the same thing as a place, not a readout, and matches what the
// brief actually asked for. A separate short map rather than trimming
// POSTCARD_LINE itself — that one's still used at full sentence length
// elsewhere (its own three lines' worth of context is the point there).
const SHORT_POSTCARD: Record<VillageState['timeOfDay'], string> = {
  dawn: 'Quiet morning', day: 'Bright day', dusk: 'Evening settles', night: 'Still tonight',
}
function shortPostcard(timeOfDay: VillageState['timeOfDay'], condition?: WeatherCondition | null): string {
  if (condition === 'rain' || condition === 'storm') return 'Rain on the path'
  return SHORT_POSTCARD[timeOfDay]
}

// Village district labels read as a dashboard the moment a number leads a
// string — DistrictLabel puts an iOS-style red notification-badge circle on
// ANY count starting with a digit (see its own comment), which is exactly
// the "notification badge" the Village vision explicitly asks to remove.
// Spelling small counts as words (matching the vision doc's own "Six ideas
// quietly grew" style) keeps the number legible without it reading as an
// unread-count. Caps at ten; anything past that is a genuinely large
// number, and "many" reads better than a wall of digits anyway.
const SMALL_NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
function spellCount(n: number): string {
  return n <= 10 ? SMALL_NUMBER_WORDS[n] : 'many'
}

/**
 * The scene itself: pure presentation, no hooks and no dates. Everything
 * time-shaped arrives as `live` (see Sky) and everything data-shaped arrives as
 * `village`, so this file can be read top to bottom as a draw order.
 */
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
const DEFAULT_LANDMARK_POS: Record<LandmarkId, { x: number; y: number }> = {
  forest: { x: 175, y: 250 },
  home: { x: 400, y: 250 },
  projects: { x: 620, y: 250 },
  archive: { x: 725, y: 250 },
  people: { x: 265, y: 250 },
  places: { x: 505, y: 250 },
}

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
const DECOR_DEFAULTS: Record<string, { x: number; y: number }> = {
  // 'gate' removed round 35 (2026-08-27) — see the item-prop list below.
  busStop: { x: 568, y: GROUND_Y + 10 },
  peopleCorner: { x: 225, y: GROUND_Y + 2 },
  bushMound: { x: 78, y: GROUND_Y - 2 },
  floweringBush: { x: 611, y: GROUND_Y + 27 },
  tallGrass: { x: 305, y: GROUND_Y + 31 },
  rockCluster: { x: 693, y: GROUND_Y + 29 },
  // Round 13 (2026-08-27) additions.
  flowerCluster: { x: 240, y: GROUND_Y + 33 },
  paperLantern: { x: 565, y: GROUND_Y + 10 },
  // Round 27 additions — previously-fixed scenery, now draggable too.
  pond: PROPS.pond,
  ...Object.fromEntries(PROPS.benches.map((p, i) => [`bench-${i}`, p])),
  ...Object.fromEntries(PROPS.flowerBeds.map((p, i) => [`flowerBed-${i}`, p])),
  ...Object.fromEntries(PROPS.fences.map((p, i) => [`fence-${i}`, p])),
  ...Object.fromEntries(PROPS.lamps.map((p, i) => [`lamp-${i}`, p])),
  mailbox: { x: 462, y: GROUND_Y - 4 },
  // x nudged 770 -> 745 (round 40, "zoom in but make sure everything is
  // still in frame") — sat right at the tighter viewBox's own edge.
  signpost: { x: 745, y: GROUND_Y + 30 },
  // The village clock tower (round 54 batch 2, "import all" —
  // village-civic-landmarks-alpha.png) — stands back-left, its face shows
  // the current time of day.
  clockTower: { x: 92, y: GROUND_Y + 2 },
  // The wishing well (round 57) — tap it to drop a thank-you in.
  wishingWell: { x: 300, y: GROUND_Y + 34 },
  // Round 56 ("remake the village design to look the best with everything")
  // — a curated layer of the imported decor placed as real scenery instead
  // of leaving it all in the Inventory, spread to balance the composition
  // rather than pile onto the already-busy Growth Forest side. Draggable
  // like everything else.
  gazebo: { x: 648, y: GROUND_Y + 26 },
  footBridgeScene: { x: 470, y: GROUND_Y + 34 },
  firewoodScene: { x: 458, y: GROUND_Y + 6 },
  wildflowerScene: { x: 250, y: GROUND_Y + 42 },
  waterPumpScene: { x: 560, y: GROUND_Y + 12 },
  sylvia: { x: 372, y: GROUND_Y + 8 },
  harry: { x: 428, y: GROUND_Y + 8 },
  somi: { x: 345, y: GROUND_Y + 20 },
  // Round 27's seven community-props items (well, clothesline, an
  // alternate mailbox, bird bath, bench-and-arbor, bike+flower pot, a veg
  // crate) are gone (round 32, 2026-08-27, "delete any elements that are
  // not from my folder and currently not in my folder right now") — their
  // source, village-expansion-community-props-alpha.png, is no longer in
  // the user's master-assets folder (replaced by a foliage/path-tile sheet
  // and a festival-props sheet, neither of which covers the same items).
}

export default function VillageScene({
  village: v, live, palette, celestial, plantSlots, buildingSlots,
  horizon = [], changes, locked = false, onLockedNavigate,
  layout = {}, arranging = false, onMoveLandmark, onRemoveItem, onResizeItem,
  placesCount = 0, placeNames = [], peopleCount = 0, soonestBirthdayDays = null, dateIdeaAreas = [], weather = null,
  timeLabel = null, dateLabel = null, moonLabel = null, tripCount = 0, zoom = 1,
  homeOccupied = null, dateKey = null,
}: {
  village: VillageState
  live: boolean
  palette: SeasonPalette
  celestial: CelestialData | null
  plantSlots: (Slot & { plant: VillageState['plants'][number] })[]
  buildingSlots: (Slot & { building: VillageState['buildings'][number] })[]
  horizon?: HorizonPlace[]
  changes?: VillageChanges
  /** Saved pins, for the Places district's count badge. */
  placesCount?: number
  /** A few real place names for the Places hover-card (2026-08-25) — not
   *  personal data, safe to show in shared mode too (see districtLocked). */
  placeNames?: string[]
  /** Contacts, for the People district's count badge. */
  peopleCount?: number
  /** Days until the soonest upcoming birthday, if any — see usePeople's daysUntilBirthday. */
  soonestBirthdayDays?: number | null
  /** Date ideas grouped by area (SLO, Santa Cruz, …) — the memory map, see MemoryMarker. */
  dateIdeaAreas?: { area: string; count: number }[]
  /** Real weather, from lib/village/weather.ts. null while loading/unavailable — the scene never blocks on it. */
  weather?: { tempF: number; condition: WeatherCondition } | null
  /** Pre-formatted, real — this component stays a pure function of props,
   *  no dates computed in here (see the file's own header comment). */
  timeLabel?: string | null
  dateLabel?: string | null
  /** Only meaningful (and only ever passed) at night — see Village.tsx. */
  moonLabel?: string | null
  /** Trips not done/cancelled — drives the Trips signpost, see useTrips(). */
  tripCount?: number
  /** Round 16 (2026-08-27) — real Smart Home signal: true if any device in
   *  the household is currently on, null while unknown/no space yet. Drives
   *  Home's window glow independent of time-of-day (a lit window means
   *  someone's actually home right now, not "it happens to be night"). */
  homeOccupied?: boolean | null
  /** 1 = the full 800×440 scene (default/unchanged). Below 1 shows more of
   *  the world at once; above 1 zooms in. Purely a `viewBox` computation —
   *  every coordinate inside the scene stays exactly as authored, see
   *  Village.tsx's own zoom-control comment for why this is a discrete
   *  +/- control rather than a gesture. */
  zoom?: number
  /** 'YYYY-MM-DD', pre-formatted in Village.tsx from the same clock as
   *  timeLabel/dateLabel — round 50's "living painting" day-to-day flavor
   *  (lib/village/vignette.ts) needs a stable per-day key and this component
   *  stays date-computation-free, same reasoning as those two props. */
  dateKey?: string | null
  /** Shared-mode: the scene is visible, but the districts lead into personal
   *  spaces, so tapping one asks for a PIN instead of navigating. */
  locked?: boolean
  onLockedNavigate?: (label: string) => void
  /** Dragged positions for the five landmark labels — only the pins move,
   *  not the scenery underneath them (see Village.tsx's own header comment
   *  on why: labels already float above their district as independent map
   *  pins, they were never glued to the art). */
  layout?: VillageLayout
  arranging?: boolean
  /** id is now any string, not just LandmarkId (round 12, 2026-08-27) —
   *  the same drag mechanism now also moves individual decorative props
   *  (see DECOR_DEFAULTS/decorDrag below), not just the six districts. */
  onMoveLandmark?: (id: string, x: number, y: number) => void
  /** Removes one custom-placed inventory item (round 31, 2026-08-27, "make
   *  a inventory tab in arrange where we can place anything from asset
   *  library") — only ever called with a `custom:` id, see
   *  lib/village/assetLibrary.ts. */
  onRemoveItem?: (id: string) => void
  /** Sets one item's stored scale (round 48, 2026-08-28, "make all
   *  elements resizable in arrange") — called with the item's own
   *  currently-resolved (x, y) so the caller never needs to know that
   *  item's own default position, only ever ADD a scale to what's already
   *  stored. */
  onResizeItem?: (id: string, x: number, y: number, scale: number) => void
}) {
  // Per-district lock (2026-08-25, Home exception added 2026-08-25) —
  // `locked` used to gate every district uniformly, but Places isn't
  // personal data (shared saved pins/trips) and shouldn't sit behind the
  // same PIN as a habit's or a contact's name. Home dropped out too once its
  // own tap target changed from Today's Brief (personal) to Smart Home
  // (shared household devices, not personal data) — see panelContent.home
  // below. Forest/Projects/Archive/People stay locked (habits, projects, the
  // reflection archive, and contacts are all personal). Non-landmark navs
  // (Mailbox, the Trips signpost, the date-idea memory markers) pass their
  // own lock intent explicitly.
  const districtLocked = (id: LandmarkId) => locked && id !== 'places' && id !== 'home'

  // One wrapper so every district gets the same treatment — a locked click
  // never silently no-ops, it always explains itself via the unlock prompt.
  // Also the arranging guard: a click shouldn't navigate away mid-drag-mode.
  const nav = (label: string, go: () => void, requiresLock = true) => () => {
    if (arranging) return
    if (locked && requiresLock) onLockedNavigate?.(label)
    else go()
  }

  // Dev-only time-of-day override (round 50, 2026-08-28) — a `?vtod=dawn|
  // day|dusk|night` URL param, so all four "living painting" buckets can
  // actually be screenshotted in one sitting instead of waiting for each to
  // occur naturally (real time-of-day only changes ~4x/day, see
  // useVillageClock's own header comment). No production UI exposes this —
  // it's a URL param, not a setting, and it only ever touches this one
  // render's local `v.timeOfDay`, never the real clock or any stored data.
  const [vtodOverride, setVtodOverride] = useState<VillageState['timeOfDay'] | null>(null)
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('vtod')
      if (p === 'dawn' || p === 'day' || p === 'dusk' || p === 'night') setVtodOverride(p)
    } catch { /* ignore */ }
  }, [])
  if (vtodOverride) v = { ...v, timeOfDay: vtodOverride }

  // Dusk/night — windows glow, otherwise they're just glass (2026-08-24).
  const dark = v.timeOfDay === 'dusk' || v.timeOfDay === 'night'
  // Quiet compositions (round 48, 2026-08-28, "certain moments where
  // almost nothing happens. but looks and feels very nice... Evening. The
  // sun is low. Birds are gone. ... Somi is asleep nearby.") — the cast's
  // wander/move loops pause during dusk/night rather than puttering
  // around, so the scene settles into real stillness instead of active
  // motion right when the mood calls for the opposite. This leans on what
  // the scene already does at night rather than new art: birds are
  // already dawn/day-only (Ambient.tsx), Home's window already glows, the
  // ground already dims. Round 48 could only fake "two figures on a bench"
  // with plain stillness since no seated-pose art existed; round 49
  // (2026-08-28) has the real thing now (CoupleBenchShape, shapes.tsx, from
  // sylvia-harry-interactions-special-moments-alpha.png) and swaps it in —
  // see the cast render below, where quiet replaces the two separate
  // figures with the one seated-together sprite instead of just holding
  // them still in place.
  const quiet = dark
  // Full night (not just dusk) — the couple change into sleepwear near Home
  // and Somi curls up asleep (round 51, 2026-08-28, "all of these new
  // animations elements"): the real bedtime art behind round 48's evening
  // mood. Dusk keeps the bench.
  const night = v.timeOfDay === 'night'

  // A worn path near wherever you actually go (2026-08-24) — the one
  // "attention" cue in the scene, deliberately not a number or a
  // leaderboard, just a soft warm patch of ground under whichever landmark
  // has the most clicks. Counted locally (this browser, this account) via
  // localStorage — real interaction, not a stored village (see state.ts's
  // own rule against that): nothing here is stored ABOUT the village, it's
  // stored about which door you tend to walk through.
  const [visitCounts, setVisitCounts] = useState<Record<string, number>>({})
  useEffect(() => {
    try { setVisitCounts(JSON.parse(localStorage.getItem('4s-village-visits') ?? '{}')) } catch { /* ignore */ }
  }, [])
  function recordVisit(id: string) {
    setVisitCounts(prev => {
      const next = { ...prev, [id]: (prev[id] ?? 0) + 1 }
      try { localStorage.setItem('4s-village-visits', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }
  // Filtered to CURRENT landmark ids — a browser that clicked "lake" before
  // it was removed still has that key in localStorage, and it must never be
  // treated as a real landmark again (DEFAULT_LANDMARK_POS has no entry for
  // it any more, so looking it up would throw).
  const visitEntries = Object.entries(visitCounts).filter(([id]) => (LANDMARK_IDS as readonly string[]).includes(id))
  const totalVisits = visitEntries.reduce((s, [, n]) => s + n, 0)
  // Only shown once there's a real pattern (5+ clicks) — a single early tap
  // shouldn't already look like a favorite spot.
  const wornPath = totalVisits >= 5 ? visitEntries.sort((a, b) => b[1] - a[1])[0]?.[0] : null

  // Tapping the pond or a flower bed now literally sends the couple there
  // (round 53) — walkTo, wired at the call sites below. The round-50
  // localStorage "nudge / attention" indirection is retired.

  const navLandmark = (id: LandmarkId, label: string, go: () => void) => () => {
    if (arranging) return
    recordVisit(id)
    if (districtLocked(id)) onLockedNavigate?.(label)
    else go()
  }

  // A small hover-board instead of leaving straight away (2026-08-25) —
  // same idea as Archive already opening its own panel rather than
  // navigating off the Village on the first click. Forest/Home/Projects/
  // Places/People now open a compact summary card near the icon; a second
  // click on its own button is what actually leaves the Village. Archive
  // is untouched — it already IS this pattern, via the real ArchivePanel.
  const [openPanel, setOpenPanel] = useState<Exclude<LandmarkId, 'archive'> | null>(null)

  // Tap-your-own-figure personal entry (2026-08-25) — same hover-card idea
  // as openPanel above, for Sylvia/Harry's cast figures. Only wired up in
  // shared mode: outside it, you're already in your own session, so tapping
  // your own figure means nothing. No real personal data in the card (the
  // shared session's RLS can't see it anyway — see onLockedNavigate below,
  // which is the exact same full-session-swap unlock every locked district
  // already uses, not a new mechanism).
  const [openFigure, setOpenFigure] = useState<'sylvia' | 'harry' | null>(null)
  const figureContent: Record<'sylvia' | 'harry', { title: string; lines: string[] }> = {
    sylvia: { title: 'Sylvia', lines: ['Tap to open your personal space'] },
    harry: { title: 'Harry', lines: ['Tap to open your personal space'] },
  }
  const openFigureOrToggle = (id: 'sylvia' | 'harry') => () => {
    if (arranging || !locked) return
    setOpenFigure(prev => (prev === id ? null : id))
  }

  // Somi got a hover-card back (2026-08-26) — the direct one-tap navigate
  // tried on 2026-08-25 read as glitchy in practice (a tap on her tiny
  // figure hard-cutting straight to another tab, with nothing to visually
  // confirm the tap actually landed on HER and not the ground beside her).
  // Same card mechanism as Sylvia/Harry's openFigure below, just its own
  // state and no PIN gate — pet care isn't personal data, it's household
  // business, same as chores. "Somi's Care" is chores/routines/maintenance
  // tracked the same way every other recurring household task is (see
  // useHousehold.ts/useRoutines.ts) — not a separate pet-specific model.
  const [openSomiCard, setOpenSomiCard] = useState(false)
  const somiInfo = { title: 'Somi', lines: ['Her chores, routines, and maintenance'] }
  const openSomi = () => {
    if (arranging) return
    setOpenSomiCard(o => !o)
  }

  const openOrToggle = (id: Exclude<LandmarkId, 'archive'>, label: string) => () => {
    if (arranging) return
    recordVisit(id)
    if (districtLocked(id)) { onLockedNavigate?.(label); return }
    setOpenPanel(prev => (prev === id ? null : id))
  }

  const growingCount = v.plants.filter(p => !p.dormant).length
  const restingCount = v.plants.length - growingCount
  const standingCount = v.buildings.filter(b => b.phase === 'complete' || b.phase === 'landmark').length
  const underwayCount = v.buildings.length - standingCount
  const panelContent: Record<Exclude<LandmarkId, 'archive'>, { title: string; lines: string[]; actionLabel: string; go: () => void }> = {
    forest: {
      title: 'Growth Forest',
      lines: [
        `${v.plants.length} habit${v.plants.length === 1 ? '' : 's'}`,
        v.plants.length ? `${growingCount} growing · ${restingCount} resting` : 'Nothing planted yet',
        // Real names, not just the count (2026-08-25) — "reveal depth
        // progressively" per the vision doc. Free data: plantSlots already
        // carries each plant's real name, no new prop needed. Safe to show
        // here specifically because this panel only ever renders when the
        // district ISN'T locked (see openOrToggle above) — a locked click
        // never reaches this content at all, it goes straight to the PIN
        // prompt instead.
        ...(v.plants.length ? [plantSlots.slice(0, 3).map(s => s.plant.name).join(', ')] : []),
      ],
      actionLabel: 'Open Habits', go: () => goToPersonal('habits'),
    },
    home: {
      title: 'Home',
      // Retargeted from Today's Brief to Smart Home (2026-08-25) — Home is
      // the primary entry to the shared household devices, not a personal
      // surface; Today stays reachable via the swipe-up sheet (shared mode)
      // or the Today tab (personal mode), just not through this tap.
      lines: ['Lights, temperature, and more'],
      actionLabel: 'Open Smart Home', go: openSmartHome,
    },
    projects: {
      title: 'Projects',
      lines: [
        `${v.buildings.length} project${v.buildings.length === 1 ? '' : 's'}`,
        v.buildings.length ? `${standingCount} standing · ${underwayCount} underway` : 'Nothing underway yet',
        // Same "real names, safe because it's locked-gated" reasoning as
        // Growth Forest above — buildingSlots already carries each
        // project's real title.
        ...(v.buildings.length ? [buildingSlots.slice(0, 3).map(s => s.building.title).join(', ')] : []),
      ],
      actionLabel: 'Open Tasks', go: () => goToPersonal('tasks'),
    },
    places: {
      title: 'Places',
      lines: [
        `${placesCount} saved place${placesCount === 1 ? '' : 's'}`,
        // Places isn't personal/locked data, so a few real names here are
        // fine even in shared mode — see districtLocked's own comment.
        ...(placeNames.length ? [placeNames.slice(0, 3).join(', ')] : []),
      ],
      actionLabel: 'Open Places', go: () => goToSection('places'),
    },
    people: {
      title: 'People',
      lines: [
        `${peopleCount} close`,
        ...(soonestBirthdayDays != null ? [soonestBirthdayDays === 0 ? 'Birthday today' : `Birthday in ${soonestBirthdayDays}d`] : []),
      ],
      actionLabel: 'Open People', go: () => goToPersonal('people'),
    },
  }

  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  // Resize-in-arrange (round 48, 2026-08-28, "make all elements resizable
  // in arrange") — a tap (pointer down then up with no real movement) on a
  // draggable item, while arranging, SELECTS it for resize instead of
  // moving it; a real drag still just moves it, as before. itemDragRef
  // tracks whether the pointer actually travelled since the last
  // startDrag(), the same "was this a tap or a drag" distinction
  // onScenePointerMove already makes for the scene's own pan gesture.
  const [resizingId, setResizingId] = useState<string | null>(null)
  const itemDragRef = useRef<{ id: string; startClientX: number; startClientY: number; moved: boolean } | null>(null)
  const pos = (id: LandmarkId) => layout[id] ?? DEFAULT_LANDMARK_POS[id]
  // Decorative props' own position lookup (round 12, 2026-08-27) — same
  // "custom position if dragged, else a fixed default" rule as pos() above,
  // just for the open-ended prop set in DECOR_DEFAULTS instead of the six
  // districts. One shared layout blob (VillageLayout is now string-keyed),
  // so a decor id and a landmark id can never collide as long as
  // DECOR_DEFAULTS' keys don't reuse a LandmarkId — they don't.
  const decorPos = (id: string) => layout[id] ?? DECOR_DEFAULTS[id]

  // Sylvia & Harry's day (round 53, 2026-08-28, "figures can wander around
  // the map / walk to clicked area and interact / usually still and smiling
  // but wander and interact time to time"). A JS state machine — see
  // useCoupleLife — replacing the retired CSS village-wander-* loop. `life`
  // gives each figure an absolute target position + pose + facing, plus
  // `walkTo(x,y)` for tap-to-walk and a `together`/`interactPose` gate for
  // the interaction art. Off entirely during arrange and quiet/night.
  const life = useCoupleLife({
    enabled: !arranging && !quiet,
    sylviaHome: decorPos('sylvia'),
    harryHome: decorPos('harry'),
    bounds: { x0: 70, x1: 730, y0: GROUND_Y + 2, y1: GROUND_Y + 74 },
  })
  const coupleTogether = life.together
  const interactPose = life.interactPose

  // Wishing well (round 57) — a thank-you the user drops in is saved as a
  // capture tagged `gratitude`, the same table Quick Add / Daily Reflection
  // already write to, so it shows up in their world rather than vanishing.
  const [wellGlow, setWellGlow] = useState(false)
  async function submitGratitude() {
    const text = window.prompt('Something you’re thankful for — drop it in the well:')?.trim()
    if (!text) return
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await supabase.from('captures').insert({ text, user_id: user.id, domain: 'gratitude' })
      window.dispatchEvent(new CustomEvent('4s:captures-changed'))
    } catch { /* ignore — the well is a gesture, not a form */ }
    setWellGlow(true)
    setTimeout(() => setWellGlow(false), 1600)
  }

  // Screen coordinates → the SVG's own 800×440 user space, so a drag tracks
  // correctly regardless of how large the scene is actually rendered on the
  // page (viewBox scaling means CSS pixels and SVG units are never 1:1).
  function toSvgPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    const local = pt.matrixTransform(ctm.inverse())
    return { x: Math.max(15, Math.min(785, local.x)), y: Math.max(15, Math.min(410, local.y)) }
  }

  // Unclamped version of the above, for pan (2026-08-27, round 5) — the
  // clamping in toSvgPoint exists to keep a dragged landmark on-canvas; for
  // measuring how far the pointer has moved in SVG units, clamping the raw
  // point would silently flatten the delta near the edges, making a drag
  // that starts or crosses near x=15/785 or y=15/410 feel like it stalls.
  function rawSvgPoint(clientX: number, clientY: number): { x: number; y: number } | null {
    const svg = svgRef.current
    const ctm = svg?.getScreenCTM()
    if (!svg || !ctm) return null
    const pt = svg.createSVGPoint()
    pt.x = clientX; pt.y = clientY
    const local = pt.matrixTransform(ctm.inverse())
    return { x: local.x, y: local.y }
  }

  function startDrag(id: string) {
    return (e: React.PointerEvent) => {
      if (!arranging) return
      e.stopPropagation()
      ;(e.target as Element).setPointerCapture(e.pointerId)
      setDraggingId(id)
      itemDragRef.current = { id, startClientX: e.clientX, startClientY: e.clientY, moved: false }
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingId || !onMoveLandmark) return
    if (itemDragRef.current && Math.hypot(e.clientX - itemDragRef.current.startClientX, e.clientY - itemDragRef.current.startClientY) > 3) {
      itemDragRef.current.moved = true
    }
    const p = toSvgPoint(e.clientX, e.clientY)
    if (p) onMoveLandmark(draggingId, Math.round(p.x), Math.round(p.y))
  }
  function endDrag() {
    // A tap (no real movement) selects the item for resize instead of
    // having moved it; a real drag just ends normally, same item stays
    // deselected so the resize controls don't pop up under your thumb
    // mid-drag.
    if (draggingId && itemDragRef.current && !itemDragRef.current.moved) {
      setResizingId(prev => (prev === draggingId ? null : draggingId))
    }
    itemDragRef.current = null
    setDraggingId(null)
  }
  useEffect(() => { if (!arranging) setResizingId(null) }, [arranging])
  const itemScale = (id: string) => layout[id]?.scale ?? 1
  function resizeItem(id: string, x: number, y: number, delta: number) {
    if (!onResizeItem) return
    const next = Math.max(0.4, Math.min(2.5, +(itemScale(id) + delta).toFixed(2)))
    onResizeItem(id, x, y, next)
  }
  // Small −/+ buttons, shown only for the one item currently selected via
  // a tap (see endDrag's own comment). onPointerDown must stop
  // propagation too, not just onClick — a pointerdown on a child bubbles
  // to the item's own startDrag() before the click ever fires, which
  // would start dragging the item out from under the button.
  // `renderX/renderY` place the buttons relative to wherever this is
  // mounted (usually already inside a translated group); `storeX/storeY`
  // are the item's real absolute scene position, passed straight through
  // to onResizeItem — using the relative render offset there instead would
  // silently teleport the item to (0,0) the first time it's resized.
  function ResizeControls({ id, storeX, storeY, renderX, renderY }: {
    id: string; storeX: number; storeY: number; renderX: number; renderY: number
  }) {
    if (!arranging || resizingId !== id || !onResizeItem) return null
    const stop = (e: React.PointerEvent) => e.stopPropagation()
    return (
      <g transform={`translate(${renderX} ${renderY})`}>
        <g onPointerDown={stop} onClick={e => { e.stopPropagation(); resizeItem(id, storeX, storeY, -0.15) }} style={{ cursor: 'pointer' }}>
          <circle cx={-9} r={7.5} fill="var(--surface)" stroke="var(--gold)" strokeWidth={1} />
          <text x={-9} y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="var(--gold)" fontWeight={700}>−</text>
        </g>
        <g onPointerDown={stop} onClick={e => { e.stopPropagation(); resizeItem(id, storeX, storeY, 0.15) }} style={{ cursor: 'pointer' }}>
          <circle cx={9} r={7.5} fill="var(--surface)" stroke="var(--gold)" strokeWidth={1} />
          <text x={9} y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="var(--gold)" fontWeight={700}>+</text>
        </g>
      </g>
    )
  }

  // Drag-to-pan (2026-08-27, round 5) — "should we make the village like
  // Stardew/Animal Crossing, users can wander if they want." A full
  // controllable character and a pixel-art rebuild are a different project
  // (confirmed with the user); this is the scoped version: once you've
  // zoomed in, you can drag the scene around like a map instead of only
  // seeing whatever the zoom's fixed center happened to land on. At zoom 1
  // there's nothing off-screen to reveal, so panning is a no-op by
  // construction (see the clamp below) rather than something that needs to
  // be separately disabled.
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panDragRef = useRef<{ startClientX: number; startClientY: number; startPanX: number; startPanY: number; moved: boolean } | null>(null)
  // Swallows the click that would otherwise follow a real pan-drag (e.g.
  // clearing the selected callout, or firing a district/entity's own
  // onClick if the drag happened to end over one) — set for one event loop
  // tick via a capturing listener below, then cleared.
  const suppressClickRef = useRef(false)

  function onScenePointerDown(e: React.PointerEvent) {
    if (arranging || zoom <= 1 || draggingId) return
    panDragRef.current = { startClientX: e.clientX, startClientY: e.clientY, startPanX: pan.x, startPanY: pan.y, moved: false }
  }
  function onScenePointerMove(e: React.PointerEvent) {
    onPointerMove(e) // landmark-drag path, unchanged
    const s = panDragRef.current
    if (!s) return
    const start = rawSvgPoint(s.startClientX, s.startClientY)
    const cur = rawSvgPoint(e.clientX, e.clientY)
    if (!start || !cur) return
    const dx = cur.x - start.x
    const dy = cur.y - start.y
    if (!s.moved && Math.hypot(dx, dy) < 3) return
    s.moved = true
    setPan({ x: s.startPanX - dx, y: s.startPanY - dy })
  }
  function onScenePointerUp() {
    endDrag()
    if (panDragRef.current?.moved) suppressClickRef.current = true
    panDragRef.current = null
  }
  function onSceneClickCapture(e: React.MouseEvent) {
    if (suppressClickRef.current) {
      e.stopPropagation()
      e.preventDefault()
      suppressClickRef.current = false
    }
  }
  const grew = new Set(changes?.grownPlantIds ?? [])
  const planted = new Set(changes?.newPlantIds ?? [])
  const landmarked = new Set(changes?.newLandmarkIds ?? [])

  // Per-entity selection (2026-08-21) — clicking a plant or building opens a
  // styled callout with its actual name and stage, in place of the browser's
  // unstyled native tooltip. In locked (shared-mode) view a plant's name IS
  // personal data — a habit's title in someone's tooltip — so a click there
  // routes through the same unlock prompt as the district labels rather than
  // revealing it; see the `locked` branch below.
  const [selected, setSelected] = useState<{ type: 'plant' | 'building'; id: string } | null>(null)

  // Click-to-care (2026-08-24) — a tap already opened the name/stage
  // callout; this is the tactile half. careFor() bounces the tapped shape
  // (village-tapped, see shapes.tsx) and throws a few sparkles from its
  // spot, both self-clearing so the state stays a pure "is this happening
  // right now" flag rather than something that needs manual reset.
  const [caredId, setCaredId] = useState<string | null>(null)
  const [sparkles, setSparkles] = useState<{ id: string; x: number; y: number }[]>([])
  function careFor(id: string, x: number, y: number) {
    setCaredId(id)
    setTimeout(() => setCaredId(c => (c === id ? null : c)), 480)
    const burst = Array.from({ length: 5 }, (_, i) => ({ id: `${id}-${Date.now()}-${i}`, x, y }))
    setSparkles(prev => [...prev, ...burst])
    setTimeout(() => setSparkles(prev => prev.filter(s => !burst.some(b => b.id === s.id))), 650)
  }

  const selectPlant = (id: string, x: number, y: number) => () => {
    // arranging guard added round 33 (2026-08-27, "can move them around once
    // planted") — plants are draggable now (see the render block below), and
    // without this a drag-arrange tap would also fire the click-to-care
    // sparkle/callout, same reasoning nav()'s own guard already documents.
    if (arranging) return
    if (locked) { onLockedNavigate?.('Growth Forest'); return }
    setSelected(s => (s?.type === 'plant' && s.id === id ? null : { type: 'plant', id }))
    careFor(id, x, y)
  }
  const selectBuilding = (id: string, x: number, y: number) => () => {
    if (locked) { onLockedNavigate?.('Projects'); return }
    setSelected(s => (s?.type === 'building' && s.id === id ? null : { type: 'building', id }))
    careFor(id, x, y)
  }
  const selectedPlant = selected?.type === 'plant' ? plantSlots.find(p => p.plant.id === selected.id) : null
  const selectedBuilding = selected?.type === 'building' ? buildingSlots.find(b => b.building.id === selected.id) : null
  // Zoom is a viewBox computation, not a transform on the content — every
  // coordinate in this file stays exactly as authored, at a fixed 800:440
  // pixel aspect no matter what's on screen (no stretching). Centered on
  // the scene's true geometric middle (400, 220) — round 4's first pass
  // centered lower (260) to favor the ground over the empty sky, which
  // sounded right but wasn't: the canvas is exactly 440 tall, so at zoom 1
  // that shifted viewBox (40..480) cropped 40 units off the TOP of the sky
  // and revealed 40 units of nothing below y=440 (the canvas has no
  // content past its own edge) — the "cream bar" reported live.
  //
  // A DIFFERENT, safe way to bias toward the ground without that bug
  // (round 21, 2026-08-27, "limit the view window so the world is a bit
  // smaller") — shrink the DEFAULT window itself (BASE_VB_H, below 440)
  // rather than re-centering a same-size window past the canvas edge.
  // Because the window is smaller than the canvas on every axis, it can
  // sit anywhere inside [0,440] without ever exposing empty space past the
  // real content — no "cream bar" possible by construction. (Round 19's
  // attempt at this used a non-uniform CSS transform on the wrapper
  // instead — scale(1.08, 1.22) — which stretched every sprite's aspect
  // ratio ("everything looks squished"); this replaces that with an actual
  // recrop of the coordinate system, so nothing gets distorted.) zoom
  // still multiplies on top of this base, clamped to [1, 2] in
  // Village.tsx, so "Reset" still means "the curated default view," not
  // literally the full 800×440 canvas.
  // Shrunk again (round 23, 2026-08-27, "make the playable window of the
  // village smaller") — same safe recrop technique as round 21's own fix
  // (a smaller coordinate window, not a CSS transform), just a further ~10%
  // tighter on both axes. Still comfortably wider than the two farthest
  // props (the gate at x=58, the Trips signpost at x=770), so nothing real
  // falls off-canvas.
  // Tightened again round 40 (2026-08-28, "zoom in but make sure everything
  // is still in frame") — width stays 720 (real habit-plants can land as
  // far left as forestSlots' own FOREST.x0=40 in lib/village/layout.ts,
  // and clipping someone's actual habit is worse than clipping decor, so
  // this axis keeps its round 29 safety margin). Height drops instead —
  // vertical content is far more tightly bounded (everything real lives
  // within GROUND_Y-90..+70), so this is where an actual tighter crop is
  // safe. GROVE_TREES/DECOR_DEFAULTS.signpost were still nudged inward a
  // touch for a little extra breathing room on this same axis.
  // BASE_VB_CY dropped 232 → 180 (round 42, 2026-08-28, "make moon and sun
  // seen") — round 40's height cut left the top edge at y=82, but
  // Celestial's own real y range (lib/village/sky.ts) runs 60..120, so the
  // sun/moon disc was landing entirely above the visible window at its
  // highest point in the sky — a real regression the screenshot caught,
  // not a rare edge case. Recentering higher trades a little more
  // foreground crop (already partial by design, see FOREGROUND's own
  // comment) for the sky actually being able to show what's in it.
  // Eased back out a little (round 43, "zoom a little out now"), then out
  // again (round 44, 2026-08-28, "zoom out again") — back to the full
  // 800-wide canvas and close to round 21's original 380-tall crop. H
  // capped at 350, not 380, so BASE_VB_CY (180) - H/2 stays ≥ 5 — going
  // negative here would expose real blank canvas above y=0 (the exact
  // "cream bar" class of bug flagged earlier this project), not more sky.
  const BASE_VB_W = 800
  const BASE_VB_H = 350
  const BASE_VB_CX = 400
  const BASE_VB_CY = 180
  const vbW = BASE_VB_W / zoom
  const vbH = BASE_VB_H / zoom
  // Pan, clamped so the viewBox can never leave the DEFAULT window's own
  // bounds — at zoom 1, vbW/vbH already equal that window, so this clamp
  // collapses to (0, 0) automatically and dragging does nothing, matching
  // the zoom floor's own "nothing past the edge to reveal" rule.
  const maxPanX = Math.max(0, (BASE_VB_W - vbW) / 2)
  const maxPanY = Math.max(0, (BASE_VB_H - vbH) / 2)
  const panX = Math.min(maxPanX, Math.max(-maxPanX, pan.x))
  const panY = Math.min(maxPanY, Math.max(-maxPanY, pan.y))
  const viewBox = `${BASE_VB_CX - vbW / 2 - panX} ${BASE_VB_CY - vbH / 2 - panY} ${vbW} ${vbH}`
  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      role="img"
      aria-label="Your village — a view of your habits, projects and history"
      style={{
        width: '100%', height: 'auto', display: 'block',
        touchAction: arranging || zoom > 1 ? 'none' : undefined,
        cursor: !arranging && zoom > 1 ? (panDragRef.current?.moved ? 'grabbing' : 'grab') : undefined,
      }}
      onClick={() => setSelected(null)}
      onClickCapture={onSceneClickCapture}
      onPointerDown={onScenePointerDown}
      onPointerMove={onScenePointerMove}
      onPointerUp={onScenePointerUp}
      onPointerLeave={onScenePointerUp}
      onPointerCancel={onScenePointerUp}
    >
      <defs>
        <radialGradient id="vvignette" cx="50%" cy="45%" r="75%">
          {/* Switched from var(--bg) to a fixed neutral black (2026-08-21) —
              a vignette is conventionally a darkening at the edges, not a
              wash of the theme's own background color, and using --bg meant
              this covered the ENTIRE 800×440 canvas (drawn last, on top of
              literally everything including the sky) with up to 35% of
              whatever --bg happens to be. On a theme whose --bg reads as a
              strong, saturated color rather than a deep neutral, that's not
              a subtle edge darkening, it's a second full-canvas color wash
              stacked on top of the sky gradient — enough to shift a genuinely
              blue sky toward whatever hue --bg carries. Pure black at low
              opacity can only ever darken, never re-hue, so this is no
              longer a variable that can fight the sky's own colors regardless
              of which theme or custom palette is active.
              Also: reach eased in from 75% (see the r attribute above is
              unchanged, but the stop offsets below now cover less of the
              canvas — 68% is where darkening starts instead of 55%. */}
          <stop offset="68%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
        </radialGradient>
        {/* Depth pass (2026-08-21) — the ground and every rounded shape were
            flat single-color fills, which is what read as sparse/flat rather
            than "not enough is drawn". vground gives the field a top-to-
            bottom gradient instead of one flat tone; vsheen is a soft
            highlight overlaid on canopies/roofs/hills so a plain circle
            reads as lit from above rather than as a paper cutout.
            objectBoundingBox (the SVG default) means every shape that
            references vsheen gets its own correctly-scaled highlight from
            this one definition — no per-shape gradient needed. */}
        {/* Real green field, not the theme's cream/beige surface tones
            (2026-08-24) — pulled directly from BloomScan's own ground
            gradient (src/art/GardenGround.tsx's `-field` gradient:
            #CBD9BB -> #BCCFAA -> #A9C096), the actual reference for "grass
            should be green, matching BloomScan's garden feel". Fixed hex,
            not var()-driven, for the same reason Sky.tsx's zenith blue is
            fixed: grass reading as green is a baseline fact about grass,
            not something a theme should be able to override into cream. */}
        <linearGradient id="vground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#CBD9BB" />
          <stop offset="55%" stopColor="#BCCFAA" />
          <stop offset="100%" stopColor="#A9C096" />
        </linearGradient>
        <radialGradient id="vsheen" cx="32%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.30" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        {/* Atmosphere pass (2026-08-27, round 8) — "push SVG further," per the
            user's own direction after seeing painted-game reference art: this
            scene can't become painted illustration, but flat single-color
            fills read as clip-art next to ANYTHING with real light in it.
            Three cheap, reusable defs close some of that gap without a
            rendering rewrite:
            vwall/vroof — a top-to-bottom gradient instead of one flat hex, so
            a wall or roof reads as a lit surface rather than a paper cutout.
            objectBoundingBox (unspecified gradientUnits, same as vsheen
            above) means every shape using these gets its own correctly-
            scaled gradient regardless of size — one def, reused on Home's
            big house and the Places kiosk alike. */}
        <linearGradient id="vwall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={WALL} />
          <stop offset="100%" stopColor={WALL_SHADOW} />
        </linearGradient>
        <linearGradient id="vroof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={ROOF_LIGHT} />
          <stop offset="100%" stopColor={ROOF} />
        </linearGradient>
        {/* vglow — a real Gaussian blur instead of the flat concentric-circle
            "glow" trick used everywhere so far (sun/moon in Celestial.tsx,
            lamp heads in LampShape). Concentric flat-opacity rings have a
            visible banded edge up close; an actual blur is what a soft light
            source looks like. feMerge layers the blurred copy behind the
            crisp original so the source shape stays sharp at its center. */}
        {/* stdDeviation bumped 3.2 → 5.5 (round 17, 2026-08-27, "make all
            light sources more ambient") — every glow in the scene (sun,
            moon, lamps, lanterns, the house/workshop/greenhouse/shop window
            accents) shares this one filter, so widening the blur here softens
            all of them at once instead of hand-tuning each source separately. */}
        <filter id="vglow" x="-250%" y="-250%" width="600%" height="600%">
          {/* stdDeviation bumped 5.5 → 7.5 (round 40, 2026-08-28, "add glow
              and ambience to light sources and ambience") — every light
              source in the scene shares this one filter (sun, moon, lamps,
              lanterns, window accents, district-symbol glows), so widening
              it here softens/enlarges all of them at once. */}
          <feGaussianBlur stdDeviation="7.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* vgrain — a faint monochrome noise field, used purely as an alpha
            mask (feColorMatrix zeroes the RGB channels and reads the noise
            into the alpha channel instead) so it can sit over the whole
            scene as a low-opacity multiply without tinting any color. This
            single texture pass is what separates "illustrated" from "clip
            art" more than any individual shape does — the reference art's
            hand-painted surfaces all carry this kind of grain; flat vector
            fills have none by construction. */}
        <filter id="vgrain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.5 0.5 0.5 0 0" />
        </filter>
      </defs>

      <Sky timeOfDay={v.timeOfDay} live={live} palette={palette} celestial={celestial} />
      {live && <Clouds timeOfDay={v.timeOfDay} />}

      {/* Ground-plane scenery, dimmed after dark (2026-08-24 fix) — the
          field/tree/grass/stone colors just below are fixed hex on purpose
          (grass reading as green is a baseline fact, not a themeable one —
          see vground's own comment), which means they never varied with
          time of day OR the active theme. That was fine in daylight, but at
          night — exactly when a dark theme is most likely in use — a
          still-bright pastel field under a genuinely dark night sky (Sky.tsx
          DOES correctly darken) read as washed out, and light-on-dark theme
          colors like Obsidian's near-white --gold lost contrast against it.
          A CSS filter here is simpler and more complete than re-deriving
          every hex by hand — it dims and slightly desaturates the whole
          ground plane at once, the way moonlight actually would, without
          touching the district icons/labels drawn on top (those already
          use theme vars tuned for dark surfaces and don't need this). */}
      <g style={dark ? { filter: 'brightness(0.55) saturate(0.82)' } : undefined}>
        {/* Background hills (2026-08-25) — a third depth layer behind the
            treeline, per the "diorama, not a flat plane" direction: distant
            silhouettes, soft and low-opacity so they read as far away
            without competing with anything in front of them. Two gentle,
            overlapping humps rather than jagged peaks — this is a small
            village's own backdrop, not a mountain range. Fixed shapes, no
            data behind them, same "pure atmosphere" rule as DISTANT_TREES. */}
        <g opacity={0.28}>
          <path d={`M -20 ${GROUND_Y - 18} Q 140 ${GROUND_Y - 62} 320 ${GROUND_Y - 30} Q 480 ${GROUND_Y - 58} 640 ${GROUND_Y - 24} Q 740 ${GROUND_Y - 40} 820 ${GROUND_Y - 20} L 820 ${GROUND_Y + 4} L -20 ${GROUND_Y + 4} Z`} fill="#9FB08A" />
        </g>
        <g opacity={0.38}>
          <path d={`M -20 ${GROUND_Y - 8} Q 220 ${GROUND_Y - 34} 420 ${GROUND_Y - 14} Q 600 ${GROUND_Y - 32} 820 ${GROUND_Y - 10} L 820 ${GROUND_Y + 6} L -20 ${GROUND_Y + 6} Z`} fill="#8FA57E" />
        </g>
        {/* Distant treeline (2026-08-24) — the gap between the sky and the
            ground line used to be empty air, which is a lot of the reason the
            scene read flat/empty. Sits right at the horizon, behind the
            ground, two overlapping rows so it has some depth of its own. */}
        <g opacity={0.55}>
          {DISTANT_TREES.map(t => (
            <path key={t.id} d={`M ${t.x} ${GROUND_Y - 22} l ${-t.h * 0.6} ${t.h} h ${t.h * 1.2} Z`} fill="#8FA582" />
          ))}
        </g>
        <g opacity={0.7}>
          {DISTANT_TREES.map(t => (
            <path key={t.id} d={`M ${t.x + 9} ${GROUND_Y - 14} l ${-t.h * 0.55} ${t.h * 0.85} h ${t.h * 1.1} Z`} fill="#7E9673" />
          ))}
        </g>

        {/* Rolling ground — a top-to-bottom gradient now, not one flat tone */}
        <path d={`M 0 ${GROUND_Y} Q 200 ${GROUND_Y - 26} 400 ${GROUND_Y - 8} T 800 ${GROUND_Y - 18} L 800 440 L 0 440 Z`}
          fill="url(#vground)" opacity={0.95} />
        {/* The season, laid over the ground rather than replacing it: the land
            keeps its shape, it just goes gold or goes cold. Same opacity bug
            as Sky.tsx's skyWash, same fix: real target opacity on a static
            outer <g>, animation only on the inner path, so the animation's
            own opacity:1 end-state can't override the intended low wash. */}
        {live && palette.ground && (
          <g opacity={palette.groundOpacity}>
            <path d={`M 0 ${GROUND_Y} Q 200 ${GROUND_Y - 26} 400 ${GROUND_Y - 8} T 800 ${GROUND_Y - 18} L 800 440 L 0 440 Z`}
              fill={palette.ground} className="village-fade" />
          </g>
        )}
      </g>

      {/* Behind the ground line and above the sky: places you've both been.
          Drawn before the ground stroke so the hills sit properly behind it. */}
      <Horizon places={horizon} groundY={GROUND_Y} />

      <path d={`M 0 ${GROUND_Y} Q 200 ${GROUND_Y - 26} 400 ${GROUND_Y - 8} T 800 ${GROUND_Y - 18}`}
        fill="none" stroke="var(--border)" strokeWidth="1.5" />

      {/* Tap the open ground to send Sylvia & Harry over there for an
          interaction (round 53). Sits under every prop/figure/district in
          paint order, so those keep their own clicks; only a bare-ground
          tap reaches here. Off in arrange/quiet. */}
      {!arranging && !quiet && (
        <rect x={0} y={GROUND_Y - 6} width={800} height={440 - (GROUND_Y - 6)} fill="transparent"
          style={{ pointerEvents: 'all', cursor: 'pointer' }}
          onClick={e => { const pt = toSvgPoint(e.clientX, e.clientY); if (pt) life.walkTo(pt.x, pt.y) }} />
      )}

      {/* The path — see PATH_D/PATH_PAVERS above. Fixed warm earth tones,
          not theme vars (round 4, 2026-08-27) — same reasoning WALL/ROOF/
          TRIM in shapes.tsx already established for buildings: a path's
          color isn't themeable.
          Rebuilt again (round 26, 2026-08-27, "make the path look more
          like a path... fit the style and theme more") — round 25's smooth
          gradient-stroke band was a real improvement over round 4's plain
          line, but it's still a vector-illustration technique (blurred
          soft edges, a gradient shoulder) sitting next to flat, blocky
          pixel-art sprites everywhere else in the scene; it read as a
          painted road, not this village's own stepping-stone dirt trail.
          Now a soft low-opacity dirt-tone connector (just enough to read as
          "these stones are on the same trail," not a road surface) under a
          scatter of small rounded pavers in the same TRIM-family palette
          the buildings use, each with its own tiny hashPos-seeded jitter/
          rotation/tone so they read as hand-laid stones, not a repeating
          tile. */}
      {/* Real path-tile.png (round 39) turned out wrong for this — 32
          overlapping rectangular stone-bordered tiles in a row along the
          path read as a continuous rail/fence line, not a path (round 40
          fix, "use the cobblestone paths"). path-stone.png instead —
          individual rounded cobblestones from the same source sheet,
          scattered (not tiled edge-to-edge) with the same per-stone
          hashPos jitter/rotation as before, which is what actually reads
          as a cobblestone path rather than a repeating strip. Bigger,
          denser, and fully opaque round 42 ("use the cobblestone path"
          repeated — round 40's version still read too faint/sparse to
          register as a path at a glance) — see PATH_PAVERS' own comment. */}
      <path d={PATH_D} fill="none" stroke="#B08659" strokeWidth={6} strokeLinecap="round" opacity={0.22} />
      {PATH_PAVERS.map(p => {
        const tw = p.size * 1.7, th = tw * (41 / 56)
        return (
          <image key={p.id} href="/village-assets/path-stone.png" x={-tw / 2} y={-th / 2} width={tw} height={th}
            opacity={1} style={{ imageRendering: 'pixelated' }}
            transform={`translate(${p.x} ${p.y}) rotate(${p.rot})`} />
        )
      })}

      {/* Grass and stones — same dark-mode dimming as the ground-plane
          group above, kept as a second filtered group rather than merged
          into it so the walkway/Horizon still render between the field and
          this top texture layer, same as before the fix (2026-08-24). */}
      <g style={dark ? { filter: 'brightness(0.55) saturate(0.82)' } : undefined}>
        {/* Grass — texture along the ground line, see GRASS_TUFTS above.
            Fixed BloomScan grass greens (#8CA57C/#94AD84, same two tones its
            own tufts alternate between) instead of the theme's --emerald
            (2026-08-24) — grass reading as green is a baseline expectation
            independent of season or theme, and the field gradient above is
            the bigger fix, but the tufts should match the same reference
            rather than clash with it. */}
        <g opacity={0.9}>
          {GRASS_TUFTS.map((t, i) => (
            <path key={t.id}
              d={`M ${t.x - 2} ${GROUND_Y + 6} Q ${t.x} ${GROUND_Y + 6 - t.h} ${t.x + 2} ${GROUND_Y + 6}`}
              fill="none" stroke={i % 2 === 0 ? '#8CA57C' : '#94AD84'} strokeWidth={1.2} strokeLinecap="round" />
          ))}
        </g>

        {/* Stones, another layer of ground texture (2026-08-24), see STONES
            above. */}
        <g opacity={0.5}>
          {STONES.map(st => (
            <ellipse key={st.id} cx={st.x} cy={GROUND_Y + 10 + (st.r * 1.5)} rx={st.r} ry={st.r * 0.62} fill="#C9C6B2" />
          ))}
        </g>

        {/* Mid-ground bushes (2026-08-27, round 6) — see MIDGROUND_BUSHES'
            own comment. Volume between the flat grass-stroke texture above
            and the district row below, instead of a hard jump from
            "hairline" straight to "building." Real bush-mound.png sprite
            since round 12, same reasoning as FOREGROUND's own swap below. */}
        <g opacity={0.8}>
          {MIDGROUND_BUSHES.map(b => {
            const w = 12 * b.scale, h = 7 * b.scale
            return (
              <image key={b.id} href="/village-assets/bush-mound.png" x={b.x - w / 2} y={b.y - h} width={w} height={h}
                style={{ imageRendering: 'pixelated' }} />
            )
          })}
        </g>

        {/* EXTRA_TREES — see its own comment above. Static (the badge's own
            trees already sway; four more doing the same would drift past
            the ambient-motion budget Ambient.tsx documents). */}
        <g>
          {EXTRA_TREES.map((t, i) => {
            // Seasonal since round 51 (2026-08-28) — the background tree line
            // now turns with v.season (blossom / green / orange / bare)
            // instead of holding summer year-round.
            const spr = seasonTree(t.kind, v.season)
            const w = t.h * spr.aspect
            return (
              <g key={i} opacity={t.opacity ?? 0.9}>
                <ellipse cx={t.x} cy={t.y + 1.5} rx={w * 0.42} ry={2.2} fill="var(--text)" opacity={0.14} />
                <image href={spr.src} x={t.x - w / 2} y={t.y - t.h} width={w} height={t.h}
                  style={{ imageRendering: 'pixelated' }} />
              </g>
            )
          })}
          {/* One more seasonal tree in the path-side band (round 51's small
              swaying lollipop tree was dropped round 57 — its source sheet,
              tree-flower-sway-animation, is no longer in the folder). */}
          {(() => { const spr = seasonTree('round', v.season); const h = 24, w = h * spr.aspect; return (
            <g opacity={0.9}>
              <ellipse cx={625} cy={GROUND_Y + 31} rx={w * 0.4} ry={2} fill="var(--text)" opacity={0.14} />
              <image href={spr.src} x={625 - w / 2} y={GROUND_Y + 29 - h} width={w} height={h} style={{ imageRendering: 'pixelated' }} />
            </g>
          ) })()}
        </g>
      </g>

      {/* Small props along the path — see PROPS above. */}
      {/* Every prop below is now draggable (round 27, "make everything
          moveable") — Draggable wraps each shape at its decorPos() position
          instead of PROPS' own fixed one, same pattern as the generic
          item-prop loop further down. */}
      {(() => { const p = decorPos('pond'); return (
        <Draggable x={p.x} y={p.y} id="pond" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('pond')} r={22}>
          <PondShape x={0} y={0} scale={1.15} onClick={!arranging ? () => life.walkTo(p.x, p.y + 8) : undefined} />
        </Draggable>
      ) })()}
      {PROPS.benches.map((_, i) => { const id = `bench-${i}`; const p = decorPos(id); return (
        <Draggable key={id} x={p.x} y={p.y} id={id} arranging={arranging} draggingId={draggingId} onPointerDown={startDrag(id)} r={10}>
          <BenchShape x={0} y={0} scale={1.15} />
        </Draggable>
      ) })}
      {PROPS.flowerBeds.map((f, i) => { const id = `flowerBed-${i}`; const p = decorPos(id); return (
        <Draggable key={id} x={p.x} y={p.y} id={id} arranging={arranging} draggingId={draggingId} onPointerDown={startDrag(id)} r={14}>
          <FlowerBedShape x={0} y={0} scale={1.15} hue={f.hue} onClick={!arranging ? () => life.walkTo(p.x, p.y + 6) : undefined} />
        </Draggable>
      ) })}
      {/* The fence is back (round 39, 2026-08-27, "sync all new elements
          and animations") — real solid-panel art now (see FenceShape's own
          comment on why this crop is different from the lattice-gate one
          removed round 34/35). */}
      {PROPS.fences.map((f, i) => { const id = `fence-${i}`; const p = decorPos(id); return (
        <Draggable key={id} x={p.x} y={p.y} id={id} arranging={arranging} draggingId={draggingId} onPointerDown={startDrag(id)} r={16}>
          <FenceShape x={0} y={0} length={f.length} scale={1.1} />
        </Draggable>
      ) })}
      {PROPS.lamps.map((_, i) => { const id = `lamp-${i}`; const p = decorPos(id); return (
        <Draggable key={id} x={p.x} y={p.y} id={id} arranging={arranging} draggingId={draggingId} onPointerDown={startDrag(id)} r={10}>
          <LampShape x={0} y={0} dark={dark} scale={1.1} />
        </Draggable>
      ) })}
      {(() => { const p = decorPos('clockTower'); return (
        <Draggable x={p.x} y={p.y} id="clockTower" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('clockTower')} r={16}>
          <ClockTowerShape x={0} y={0} timeOfDay={v.timeOfDay} dark={dark} scale={itemScale('clockTower')} />
        </Draggable>
      ) })()}
      {(() => { const p = decorPos('wishingWell'); return (
        <Draggable x={p.x} y={p.y} id="wishingWell" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('wishingWell')} r={13}>
          <WishingWellShape x={0} y={0} glow={wellGlow} onClick={!arranging ? submitGratitude : undefined} />
        </Draggable>
      ) })()}

      {/* Ten more real sprites, rounds 11–12 (2026-08-27, the user's own
          village-matching-expansion-pack, v2 with real alpha) — a gate
          marking the village's own entrance, a car and a bus stop for two
          more districts to lean on, and four ground-cover accents (bush/
          flowering bush/tall grass/rock) for variety beyond the procedural
          FOREGROUND layer's own three shapes. All draggable in arrange
          mode now (round 12) — see decorPos/DECOR_DEFAULTS. */}
      {[
        // gate/car/busStop re-sourced round 23, 2026-08-27 ("update only
        // using these elements") from the master-visual-assets folder's own
        // structures-clean.png — dims recomputed from their real crop aspect
        // ratios, not carried over from the old custom-pack sprites. Sized
        // up again round 24 ("make sure things are scaled properly but so
        // we can also see them") — the round 23 sizes read a little small
        // next to the buildings they stand beside.
        // The gate is gone (round 35, 2026-08-27) — same "fence with white
        // in the middle" complaint as the actual fence, still standing
        // after that one was removed: gate.png is genuinely an open
        // wooden-lattice gate (real transparent gaps by design, not a
        // crop bug), and it reads exactly like a fence for the same
        // reason. Removed rather than patched, same call as the fence.
        // The standalone car near Home is gone (round 31, 2026-08-27,
        // "delete second car") — Places' own district badge became the
        // car (round 30), and having a second one parked by the house too
        // read as a duplicate rather than two different things.
        // Sized up again round 35 (2026-08-27, "things like bus stop still
        // too small") — 18 units tall still read small at full-scene zoom.
        { id: 'busStop', title: 'A bus stop', href: 'bus-stop.png', w: 41.2, h: 26 },
        // Curated scenery (round 56, trimmed round 57 to sprites whose
        // master-folder source still exists).
        { id: 'gazebo', title: 'A gazebo', href: 'gazebo.png', w: 31 * (249 / 259), h: 31 },
        { id: 'footBridgeScene', title: 'A little bridge', href: 'foot-bridge.png', w: 15 * (256 / 155), h: 15 },
        { id: 'firewoodScene', title: 'Firewood', href: 'firewood.png', w: 8 * (255 / 160), h: 8 },
        { id: 'wildflowerScene', title: 'Wildflowers', href: 'wildflower-strip.png', w: 15 * (512 / 341), h: 15 },
        { id: 'waterPumpScene', title: 'A water pump', href: 'water-pump.png', w: 15 * (207 / 253), h: 15 },
        // Sized up round 29 ("fix the sizing of everything, try to scale
        // but do not make anything too tiny") — these four read noticeably
        // smaller than everything else in the scene.
        { id: 'bushMound', title: 'A bush', href: 'bush-mound.png', w: 20.4, h: 12 },
        { id: 'floweringBush', title: 'A flowering bush', href: 'flowering-bush.png', w: 17.2, h: 13 },
        { id: 'tallGrass', title: 'Tall grass', href: 'tall-grass.png', w: 13.8, h: 13 },
        { id: 'rockCluster', title: 'A few rocks', href: 'rock-cluster.png', w: 18.3, h: 12.5 },
        // Round 27's seven community-props items are gone (round 32,
        // 2026-08-27, "delete any elements that are not from my folder and
        // currently not in my folder right now") — see DECOR_DEFAULTS' own
        // comment above on why (their source sheet is no longer in the
        // folder).
      ].map(p => {
        const p0 = decorPos(p.id)
        // Resizable in arrange (round 48, 2026-08-28) — itemScale(id)
        // multiplies both dimensions uniformly so nothing stretches.
        const s = itemScale(p.id)
        const pw = p.w * s, ph = p.h * s
        return (
          <g key={p.id} transform={`translate(${p0.x} ${p0.y})`} opacity={1}
            onPointerDown={startDrag(p.id)} style={{ cursor: arranging ? (draggingId === p.id ? 'grabbing' : 'grab') : undefined }}>
            <title>{p.title}</title>
            <ellipse cx={0} cy={ph * 0.28} rx={pw * 0.48} ry={2} fill="var(--text)" opacity={0.14} />
            <image href={`/village-assets/${p.href}`} x={-pw / 2} y={-ph} width={pw} height={ph}
              style={{ imageRendering: 'pixelated' }} />
            {arranging && (
              <rect x={-pw / 2 - 2} y={-ph - 2} width={pw + 4} height={ph + 6} rx={4}
                fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
                opacity={draggingId === p.id ? 0.9 : 0.4} />
            )}
            <ResizeControls id={p.id} storeX={p0.x} storeY={p0.y} renderX={0} renderY={-ph - 4} />
          </g>
        )
      })}

      {/* Custom-placed inventory items (round 31, 2026-08-27, "make a
          inventory tab in arrange where we can place anything from asset
          library") — any `custom:<assetKey>:<uid>` key in `layout` (see
          lib/village/assetLibrary.ts) is one of these; Village.tsx's own
          Inventory picker is what actually creates them. Same drag
          mechanism as every other item-prop above, plus a small delete
          button that only appears while arranging — these are the one
          kind of prop a user can remove entirely, not just move. */}
      {Object.keys(layout).filter(id => id.startsWith('custom:')).map(id => {
        const assetKey = parseCustomItemId(id)
        const asset = assetKey ? findAsset(assetKey) : undefined
        const p = layout[id]
        if (!asset || !p) return null
        const s = itemScale(id)
        const h = asset.h * s, w = h * asset.aspect
        return (
          <g key={id} transform={`translate(${p.x} ${p.y})`}
            onPointerDown={startDrag(id)} style={{ cursor: arranging ? (draggingId === id ? 'grabbing' : 'grab') : undefined }}>
            <title>{asset.label}</title>
            <ellipse cx={0} cy={h * 0.28} rx={w * 0.48} ry={2} fill="var(--text)" opacity={0.14} />
            <image href={`/village-assets/${asset.href}`} x={-w / 2} y={-h} width={w} height={h}
              style={{ imageRendering: 'pixelated' }} />
            {arranging && (
              <>
                <rect x={-w / 2 - 2} y={-h - 2} width={w + 4} height={h + 6} rx={4}
                  fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
                  opacity={draggingId === id ? 0.9 : 0.4} />
                {onRemoveItem && (
                  <g transform={`translate(${w / 2 + 3} ${-h - 3})`}
                    onPointerDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); onRemoveItem(id) }}
                    style={{ cursor: 'pointer' }}>
                    <circle r={6} fill="var(--rose)" stroke="var(--surface)" strokeWidth={1.2} />
                    <text y={0.5} textAnchor="middle" dominantBaseline="central" fontSize={8} fill="#fff" fontWeight={700}>×</text>
                  </g>
                )}
              </>
            )}
            {/* Above the remove button, not overlapping it. */}
            <ResizeControls id={id} storeX={p.x} storeY={p.y} renderX={0} renderY={-h - 14} />
          </g>
        )
      })}

      {/* The hanging paper lantern that lights up after dark — draggable via
          the same decorPos/DECOR_DEFAULTS mechanism, rendered separately
          since it swaps by `dark`. (The swaying flower cluster that used to
          live here was dropped round 57 — its source sheet,
          tree-flower-sway-animation, is no longer in the master folder.) */}
      {(() => {
        const p0 = decorPos('paperLantern')
        const w = 5.7, h = 14 // 141×345 source, same aspect ratio
        // A real post now (round 14 fix, 2026-08-27, "make sure all
        // elements are on the ground") — the sprite itself is a HANGING
        // lantern (its own art includes a mounting bracket at top), and
        // rendering just that, floating at head height with only a ground
        // shadow under it, read as unsupported. A short post planted at
        // y=0 (the anchor's own ground level, unlike round 13's
        // GROUND_Y-20 default) carries the bracket up to where the sprite
        // takes over — the same "post holds the fixture up" logic
        // LampShape already uses for the stone lantern.
        const postH = 10
        return (
          <g transform={`translate(${p0.x} ${p0.y})`} opacity={0.95}
            onPointerDown={startDrag('paperLantern')} style={{ cursor: arranging ? (draggingId === 'paperLantern' ? 'grabbing' : 'grab') : undefined }}>
            <title>A paper lantern</title>
            <ellipse cx={0} cy={1.5} rx={4} ry={1.2} fill="var(--text)" opacity={0.12} />
            <rect x={-0.7} y={-postH} width={1.4} height={postH} fill={TRIM} opacity={0.8} />
            {dark && <circle cy={-postH - h / 2} r={9} fill="var(--amber)" opacity={0.28} filter="url(#vglow)" />}
            <image href={`/village-assets/paper-lantern-${dark ? 'lit' : 'unlit'}.png`} x={-w / 2} y={-postH - h} width={w} height={h}
              style={{ imageRendering: 'pixelated' }} className={dark ? 'village-glow' : undefined} />
            {arranging && (
              <rect x={-w / 2 - 2} y={-postH - h - 2} width={w + 4} height={postH + h + 4} rx={4}
                fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
                opacity={draggingId === 'paperLantern' ? 0.9 : 0.4} />
            )}
          </g>
        )
      })()}

      {/* Memory map (2026-08-24) — one small marker per date-idea area,
          scattered near the path via the same hashPos-by-id determinism
          everything else in the scene uses, so a given area always lands in
          the same spot rather than reshuffling. Quieter than a district on
          purpose — see MemoryMarker's own header comment. */}
      {dateIdeaAreas.map(({ area, count }) => (
        <MemoryMarker key={area}
          x={70 + hashPos(area) * 660}
          y={GROUND_Y - 36 + hashPos(area + 'y') * 24}
          label={area} count={count}
          onClick={nav(area, () => goToHousehold('reference'), false)} />
      ))}

      {/* Pollen motes — pure atmosphere, see POLLEN above. */}
      <g opacity={0.3}>
        {POLLEN.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2 + (i % 2)} fill="var(--amber)" />
        ))}
      </g>


      {/* Growth Forest — plants are draggable in arrange mode (round 33,
          2026-08-27, "we can only grow them using habits and can move them
          around once planted") — same startDrag/onMoveLandmark mechanism
          every other prop uses, keyed by the plant's own real id (see
          Village.tsx's plantSlots useMemo for where the saved override
          actually gets read back in). A plant can never be ADDED this
          way — only ever moved once it exists from real habit data. */}
      {plantSlots.map(({ plant, x, y, scale, back }) => (
        <g key={plant.id} opacity={back ? 0.55 : 1}
          onPointerDown={startDrag(plant.id)}
          style={{ cursor: arranging ? (draggingId === plant.id ? 'grabbing' : 'grab') : undefined }}>
          <PlantShape plant={plant} x={x} y={y} scale={scale}
            foliage={live ? palette.foliage : undefined}
            changed={grew.has(plant.id) || planted.has(plant.id)}
            selected={selected?.type === 'plant' && selected.id === plant.id}
            cared={caredId === plant.id}
            onClick={selectPlant(plant.id, x, y)} />
          {arranging && (
            <circle cx={x} cy={y - 12} r={22} fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
              opacity={draggingId === plant.id ? 0.9 : 0.4} />
          )}
        </g>
      ))}
      {/* A zero-habit account leaves this whole band of ground bare — the
          same "quiet setup note, never an alarm" treatment the rest of the
          app gives an empty state, drawn small enough not to compete with a
          real plant once one exists. */}
      {plantSlots.length === 0 && (
        <g transform={`translate(200 ${GROUND_Y - 2})`} opacity={0.35}>
          <circle r={3} fill="none" stroke="var(--emerald)" strokeWidth={1} strokeDasharray="2 2" />
        </g>
      )}
      {/* The vegetable crate (round 10) is gone (round 23, 2026-08-27,
          "update only using these elements") — veg-crate.png has no
          equivalent in the master-visual-assets folder. */}
      {/* A leaf, literally next to a real plant (2026-08-24, was a fixed
          spot in the forest band) — anchored to the first plant slot's
          actual (x, y) so the icon marks something real growing there, not
          an arbitrary decorative position. Falls back near the empty-state
          dashed circle when there are no plants yet. */}
      <FeatureIcon kind="leaf" x={(plantSlots[0]?.x ?? 200) - 16} y={(plantSlots[0]?.y ?? GROUND_Y - 2) - 4} scale={0.75} opacity={0.55} />

      {/* Home — the anchor of the village (2026-08-25 enlarge), so it reads
          as the center rather than a district the same size as the rest.
          Body/roof scaled up from the old 60×44 to 84×58, plus a porch
          (roofed overhang + two posts + a step) since a door alone read as
          flat. Windows/chimney logic unchanged, just repositioned for the
          bigger frame. */}
      <g transform={`translate(400 ${GROUND_Y - 4})`}>
        <title>Home — Smart Home</title>
        {/* Grounding shadow — same BloomScan-style reasoning as PlantShape/
            BuildingShape's own (2026-08-24). */}
        <ellipse cx={0} cy={1.5} rx={44} ry={3.6} fill="var(--text)" opacity={0.12} />
        {/* Swapped to the master-visual-assets folder's own house-lighting-
            states sheet (round 23, 2026-08-27, "update only using these
            elements. delete all old ones") — this is the real
            house-smart-home-states.png content flagged as "genuinely
            missing" back in round 16b, finally found: four real lit/unlit
            crops of the same house, not a synthetic glow ellipse layered
            over a single fixed sprite. cottage-lit.png (windows + door
            warmly lit) swaps in for cottage-dark.png on the same real Smart
            Home occupancy signal that used to just toggle an ellipse.
            313×262 source, ~1.19 aspect. */}
        <image href={`/village-assets/cottage-${(homeOccupied ?? dark) ? 'lit' : 'dark'}.png`}
          x={-53.5} y={-89.6} width={107} height={89.6}
          style={{ imageRendering: 'pixelated' }} />
        {(homeOccupied ?? dark) && <circle cx={-3} cy={-62} r={11} fill="var(--amber)" opacity={0.45} filter="url(#vglow)" />}
        {v.buildings.length + v.plants.length > 6 && (
          <path d="M 28 -80 L 28 -94 L 35 -94 L 35 -80" fill="none" stroke="var(--border)" strokeWidth={2} />
        )}
      </g>

      {/* Mailbox, beside Home (2026-08-24) — see MailboxShape's own comment:
          Rest Lake used to be where "jot something down" lived; this is its
          new, smaller home. Draggable too now (round 27) — nav()'s own
          `arranging` guard already no-ops the click while dragging is live,
          so layering Draggable's onPointerDown underneath is safe. */}
      {(() => { const p = decorPos('mailbox'); return (
        <Draggable x={p.x} y={p.y} id="mailbox" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('mailbox')} r={14}>
          <MailboxShape x={0} y={0} onClick={nav('Capture', () => {
            goToSection('brief')
            setTimeout(() => window.dispatchEvent(new CustomEvent('app:focus-capture')), 80)
          })} />
        </Draggable>
      ) })()}

      {/* Home's own personal objects — the bike, flower pot, laundry basket,
          and bread basket (rounds 9-10) are gone (round 23, 2026-08-27,
          "update only using these elements. delete all old ones") — none of
          those custom-pack sprites have an equivalent in the master-visual-
          assets folder, and leaving mismatched old art in Home's yard
          didn't fit the same standard applied everywhere else this round. */}

      {/* Project District */}
      {buildingSlots.map(({ building, x, y, scale, back }) => (
        <g key={building.id} opacity={back ? 0.55 : 1}>
          <BuildingShape building={building} x={x} y={y} scale={scale}
            changed={landmarked.has(building.id)}
            selected={selected?.type === 'building' && selected.id === building.id}
            cared={caredId === building.id}
            onClick={selectBuilding(building.id, x, y)}
            dark={dark} />
        </g>
      ))}
      {buildingSlots.length === 0 && (
        <g transform={`translate(600 ${GROUND_Y - 2})`} opacity={0.35}>
          <rect x={-3} y={-6} width={6} height={6} fill="none" stroke="var(--slate)" strokeWidth={1} strokeDasharray="2 2" />
        </g>
      )}
      {/* A building marker, literally next to a real building (2026-08-24,
          was a fixed spot in the district band) — anchored to the first
          building slot's actual (x, y), same reasoning as the forest's leaf
          above. Falls back near the empty-state dashed square when there
          are no buildings yet. */}
      <FeatureIcon kind="building" x={(buildingSlots[0]?.x ?? 600) - 16} y={(buildingSlots[0]?.y ?? GROUND_Y - 2) - 4} scale={0.75} opacity={0.55} />

      {/* The hand-drawn crane and blueprint sheet (2026-08-25) that used to
          stand in for Projects' identity are gone (round 14, 2026-08-27,
          "remove all old out of style elements") — redundant now that the
          district has a real workshop.png building (round 11) a few units
          away; keeping both was two different art styles competing for the
          same "this is a workshop" job. */}

      {/* People identity (2026-08-25) — a second bench angled toward the
          one already scattered near this district (see PROPS.benches
          above), so People reads as a social corner rather than the same
          tile language as everywhere else. The hand-drawn "letter" prop
          that used to sit beside it is gone (round 14) — real tea-set/
          picnic-blanket sprites already cover this corner's identity. */}
      <g transform={`translate(${decorPos('peopleCorner').x} ${decorPos('peopleCorner').y})`} opacity={0.75}
        onPointerDown={startDrag('peopleCorner')} style={{ cursor: arranging ? (draggingId === 'peopleCorner' ? 'grabbing' : 'grab') : undefined }}>
        <title>A quiet corner to sit and talk</title>
        <BenchShape x={0} y={0} />
      </g>

      {/* The tea set and porch swing (round 10) are gone (round 23,
          2026-08-27, "update only using these elements") — tea-set.png and
          swing.png have no equivalent in the master-visual-assets folder;
          People's own bench (BenchShape above) still carries the gathering-
          spot identity on its own. */}

      {/* The hand-drawn luggage stack (2026-08-25) is gone (round 14,
          2026-08-27) — Places now has a real shop.png building (round 11)
          and a real bus-stop.png (round 12); a hand-drawn suitcase next to
          both read as a leftover from before either existed. The blank
          signpost (round 10) is gone too (round 23) — blank-sign.png has no
          equivalent in the master folder either. */}

      {/* Archive Grove — the Life Tree. Rings are the yearly milestone; the
          canopy is the continuum underneath, so the tree visibly thickens
          across your first months instead of standing still until month 12. */}
      <g transform={`translate(725 ${GROUND_Y + 2})`}>
        <title>{
          v.treeRings > 0
            ? `Archive Grove, Life Tree, ${v.treeRings} year${v.treeRings === 1 ? '' : 's'}`
            : `Archive Grove, Life Tree in its first year, ${v.accountMonths} month${v.accountMonths === 1 ? '' : 's'} of growth`
        }</title>
        {/* Real sprite now (round 45, 2026-08-28, "update the village with
            these elements") — life-tree.png, a real civic tree-with-bench
            from village-civic-landmarks-alpha.png, replacing the hand-drawn
            trunk+canopy circles (2026-08-21 — no tree art existed yet at
            the time). Canopy growth is now a uniform scale on the whole
            sprite instead of three separately-sized circles — same
            (0.7 + canopy*0.3) growth curve, just applied to real art. The
            ring-milestone circles stay, overlaid near the canopy's center,
            same reasoning as before: real years-of-account data, not
            decoration, so removing them would lose something the old
            version actually showed. */}
        {(() => {
          const scale = 0.7 + v.canopy * 0.3
          const h = 46 * scale, w = h * (413 / 442)
          return (
            <image href="/village-assets/life-tree.png" x={-w / 2} y={-h} width={w} height={h}
              style={{ imageRendering: 'pixelated' }} />
          )
        })()}
        {[...Array(Math.min(v.treeRings, 5))].map((_, i) => (
          <circle key={i} cx={0} cy={-30} r={7 + i * 4.5} fill="none" stroke="var(--gold)" strokeWidth={0.7} opacity={0.35} />
        ))}
        {/* The book stack and garden lantern (round 10) are gone (round 23,
            2026-08-27, "update only using these elements") — neither
            book-stack.png nor garden-lantern.png has an equivalent in the
            master-visual-assets folder; the library.png badge nearby
            (DistrictArt's 'book' case) still carries Archive's identity. */}
      </g>

      {/* Bloom Garden — waiting on BloomScan */}
      <g transform={`translate(300 418)`} opacity={v.flowers.length ? 1 : 0.35}>
        <title>Bloom Garden — flowers you find in BloomScan appear here</title>
        {[0, 1, 2].map(i => (
          <g key={i} transform={`translate(${i * 22 - 22} 0)`}>
            <rect x={-0.8} y={-10} width={1.6} height={10} fill="var(--emerald)" opacity={0.6} />
            <circle cy={-12} r={3.4} fill="var(--blush)" opacity={v.flowers.length ? 0.9 : 0.5} />
          </g>
        ))}
      </g>

      {/* The things that move. Above the scenery so smoke reads as being in
          front of the house, below the labels so it never fights the text. */}
      {live && <Ambient village={v} palette={palette} groundY={GROUND_Y} weatherCondition={weather?.condition} />}

      {/* Click-to-care sparkles — see careFor() above. Self-removing via its
          own setTimeout, so this array is only ever non-empty for ~650ms. */}
      {sparkles.map((s, i) => {
        const angle = (i / 5) * Math.PI * 2 + (i * 0.7)
        const dist = 18 + (i % 3) * 6
        return (
          <circle key={s.id} cx={s.x} cy={s.y} r={2} fill="var(--gold)" className="village-sparkle"
            style={{ '--sx': `${Math.cos(angle) * dist}px`, '--sy': `${Math.sin(angle) * dist - 10}px` } as React.CSSProperties}
            pointerEvents="none" />
        )
      })}

      {/* District labels — the actual navigation. Icons are real silhouettes
          of what's actually in each district (a leaf for the forest, a
          building for projects, a book for the archive next to its own tree
          — see shapes.tsx's DistrictIcon) rather than the app's abstract
          nav glyph set (HomeBar), which shares no visual logic with the
          scene around it. Positions come from pos(id) — layout[id] if it's been
          dragged, otherwise the same defaults as always.

          Rest Lake removed 2026-08-24 (was here through 2026-08-24 morning:
          the lake ellipse/reflection/fish, and a "Rest Lake" district
          opening the Brief + focusing the capture box). stillness/
          reflectionDays stay computed in lib/village/state.ts — nothing else
          in the data model depended on the lake being drawn — in case a
          future district wants that number again. */}
      {/* A worn patch of ground under whichever landmark you actually visit
          most (2026-08-24) — see wornPath above. Drawn before the labels so
          it reads as ground, not as a badge on the tile. */}
      {wornPath && (
        <ellipse cx={pos(wornPath as LandmarkId).x} cy={pos(wornPath as LandmarkId).y + 34} rx={24} ry={6}
          fill="var(--gold)" opacity={0.1} pointerEvents="none" />
      )}

      {/* District captions read as words now, not counters (2026-08-25) —
          "kill the numbers first" per the Village vision doc's own success
          test ("if all labels and numbers disappeared, would I still
          understand this place?"). No raw digit ever leads these strings
          any more, which also quietly disables DistrictLabel's red
          notification-badge circle (it only triggers on a leading digit) —
          removing the badge and rewording the caption were the same fix. */}
      <DistrictLabel {...pos('forest')} icon="leaf" label="Growth Forest" onClick={openOrToggle('forest', 'Growth Forest')} dark={dark} scale={1.12}
        count={v.plants.length === 0 ? 'waiting to be planted' : growingCount === 0 ? 'resting' : restingCount > 0 ? 'growing and resting' : 'growing quietly'}
        draggable={arranging} dragging={draggingId === 'forest'} onPointerDown={startDrag('forest')} selected={openPanel === 'forest'} />
      {/* "Living painting" sunset beat (round 50, 2026-08-28, "shadows
          stretch") — a real animated stretch would need shadow geometry this
          scene doesn't have; this is the confirmed cheap version instead, a
          fixed longer shadow shown only during dusk, drawn under Home before
          its own badge so it reads as ground, not a UI element. */}
      {v.timeOfDay === 'dusk' && (
        <ellipse cx={pos('home').x + 10} cy={pos('home').y + 4} rx={38} ry={5} fill="var(--text)" opacity={0.1} />
      )}
      {/* Home was 1.25x the rest (2026-08-27, "this is where you live");
          round 49 brought it to the standard 1x ("make house smaller"), and
          this round (50, "make all items a bit bigger and house smaller...
          make scaling make sense but nothing too big or small") goes a step
          further in both directions at once — Home down to 0.85x, the other
          five districts up to 1.12x — so Home reads clearly smaller than its
          neighbors rather than merely equal to them, without either extreme
          shrinking to illegible or ballooning back into dominating the
          scene. */}
      <DistrictLabel {...pos('home')} icon="home" label="Home" onClick={openOrToggle('home', 'Home')} count="today" dark={dark} scale={0.85}
        draggable={arranging} dragging={draggingId === 'home'} onPointerDown={startDrag('home')} selected={openPanel === 'home'} />
      <DistrictLabel {...pos('projects')} icon="building" label="Projects" onClick={openOrToggle('projects', 'Projects')} dark={dark} scale={1.12}
        count={v.buildings.length === 0 ? 'quiet for now' : underwayCount === 0 ? 'all standing' : 'under construction'}
        draggable={arranging} dragging={draggingId === 'projects'} onPointerDown={startDrag('projects')} selected={openPanel === 'projects'} />
      <DistrictLabel {...pos('archive')} icon="book" label="Archive" onClick={navLandmark('archive', 'Archive', () => window.dispatchEvent(new CustomEvent('app:open-archive')))} dark={dark} scale={1.12}
        count={v.treeRings > 0 ? `${spellCount(v.treeRings)} year${v.treeRings === 1 ? '' : 's'} kept` : 'its first year'}
        draggable={arranging} dragging={draggingId === 'archive'} onPointerDown={startDrag('archive')} />
      {/* Places and People (2026-08-24) — the same real-district mechanism
          as the five above, extended to the two other things 4S already
          tracks that had no presence in the village at all: your saved pins
          and the people in your life. Counts come straight from
          usePlaces()/usePeople() in Village.tsx, no new data model. */}
      <DistrictLabel {...pos('places')} icon="places" label="Places" onClick={openOrToggle('places', 'Places')} dark={dark} scale={1.12}
        count={placesCount === 0 ? 'no pins yet' : 'the map is growing'}
        draggable={arranging} dragging={draggingId === 'places'} onPointerDown={startDrag('places')} selected={openPanel === 'places'} />
      <DistrictLabel {...pos('people')} icon="people" label="People" onClick={openOrToggle('people', 'People')} dark={dark} scale={1.12}
        count={soonestBirthdayDays != null ? (soonestBirthdayDays === 0 ? 'birthday today' : `birthday in ${spellCount(soonestBirthdayDays)} day${soonestBirthdayDays === 1 ? '' : 's'}`) : peopleCount === 0 ? 'no one yet' : 'your people'}
        draggable={arranging} dragging={draggingId === 'people'} onPointerDown={startDrag('people')} selected={openPanel === 'people'} />
      {/* Birthday bunting (2026-08-24) — only on the actual day, over the
          People district's current position. */}
      {soonestBirthdayDays === 0 && <BuntingShape x={pos('people').x} y={pos('people').y} />}

      {/* The cast (2026-08-25) — replaces the old per-contact PersonMarker
          dots with the three actual, always-present characters, standing in
          Home's yard. See VillagerShape/CatShape's own header comment for
          why this is a deliberate exception to the district icons' "objects,
          not figures" rule. A slow, staggered idle bob (village-bob, see
          globals.css) is the one bit of "tiny people walking" life this
          scene gets — full movement/pathing is out of scope for now.
          Drawn AFTER every district label now too (2026-08-27 fix, was only
          after plants/buildings) — Sylvia (372, GROUND_Y+8) and Harry (428,
          GROUND_Y+8) both genuinely overlap the Home tile's own 44×56
          invisible hit-rect (pos('home') = 400, 250) in a real corner
          region, and Home was painted AFTER the cast, so it silently won
          that overlap — a tap meant for Sylvia or Harry could land on the
          Home tile instead ("glitchy, hard to select the figures"), same
          root cause the plants/buildings fix above already solved for a
          different pair of neighbors. Being last in the whole scene now
          means the cast always wins any future overlap too, not just this
          one measured case. */}
      {/* scale dropped from 1.7 to 1 (round 9, 2026-08-27) — that 1.7x was
          tuned for the old hand-drawn figures' much smaller ~12×21 base
          size; VillagerShape's new sprite-based rendering already targets a
          sensible height (30 units) on its own, so the old multiplier would
          now make the cast nearly as tall as the house. The idle bob
          (village-bob) is gone (round 24, 2026-08-27, "do not make
          anything bob") — the cast stands still now. Draggable too, as of
          round 27 ("make everything moveable") — the click handlers below
          only fire outside arrange mode (openFigureOrToggle/openSomi both
          bail on `arranging`), so wrapping in Draggable is safe. */}
      {/* Sylvia/Harry live their day here (round 53, 2026-08-28) — useCoupleLife
          drives an absolute target position + pose + facing for each. The
          inner <g> glides there with a CSS transition sized to the walk
          distance; the walk sprite plays while it moves. During a meeting
          `coupleTogether` swaps both individuals out for the one interaction
          pose (a different one each time), placed where they actually met.
          Still off entirely during arrange (Draggable wants a static target)
          and quiet/night (the bench / sleepwear block below takes over). */}
      <g>
        {!arranging && !quiet && (
          <g style={{ visibility: coupleTogether ? undefined : 'hidden' }}>
            <CoupleInteraction x={life.interactAt.x} y={life.interactAt.y} poseIndex={interactPose} />
          </g>
        )}
        <g style={{ visibility: coupleTogether ? 'hidden' : undefined }}>
        {(() => { const p = decorPos('sylvia'); const active = !arranging && !quiet; return (
          <Draggable x={p.x} y={p.y} id="sylvia" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('sylvia')} r={17}>
            {!(quiet && !arranging) && (
              <g style={active ? { transform: `translate(${life.sylvia.x - p.x}px, ${life.sylvia.y - p.y}px)`, transition: `transform ${life.sylvia.dur}ms ease-in-out` } : undefined}>
                <VillagerShape x={0} y={0} name="Sylvia" onClick={locked ? openFigureOrToggle('sylvia') : undefined}
                  wander={active} pose={life.sylvia.pose} face={life.sylvia.face} scale={itemScale('sylvia')} />
              </g>
            )}
            <ResizeControls id="sylvia" storeX={p.x} storeY={p.y} renderX={0} renderY={-32} />
          </Draggable>
        ) })()}
        {(() => { const p = decorPos('harry'); const active = !arranging && !quiet; return (
          <Draggable x={p.x} y={p.y} id="harry" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('harry')} r={17}>
            {!(quiet && !arranging) && (
              <g style={active ? { transform: `translate(${life.harry.x - p.x}px, ${life.harry.y - p.y}px)`, transition: `transform ${life.harry.dur}ms ease-in-out` } : undefined}>
                <VillagerShape x={0} y={0} name="Harry" onClick={locked ? openFigureOrToggle('harry') : undefined}
                  wander={active} pose={life.harry.pose} face={life.harry.face} scale={itemScale('harry')} />
              </g>
            )}
            <ResizeControls id="harry" storeX={p.x} storeY={p.y} renderX={0} renderY={-32} />
          </Draggable>
        ) })()}
        </g>
      </g>
      {/* quiet/bench mode: the couple-cycle subtree above is empty (both its
          conditions are false), and this renders instead — an outright
          swap, not an opacity gate, so there's no shared-timeline risk to
          manage here at all. */}
      {!arranging && quiet && (() => {
        const sp = decorPos('sylvia'), hp = decorPos('harry')
        if (night) return (
          <>
            <SleepwearFigure src="/village-assets/sylvia-pajama.png" aspect={247 / 509} x={sp.x} y={sp.y} />
            <SleepwearFigure src="/village-assets/harry-pajama.png" aspect={242 / 529} x={hp.x} y={hp.y} />
          </>
        )
        const midX = (sp.x + hp.x) / 2, midY = (sp.y + hp.y) / 2
        return <CoupleBenchShape x={midX} y={midY} />
      })()}
      {/* Moved next to Sylvia and shrunk (round 26, 2026-08-27, "put somi
          next to sylvia and make smaller") — was at (480, GROUND_Y+30,
          scale 1), clear of the Mailbox/Harry per the 2026-08-25 fix noted
          above but off on her own past Harry rather than with the family.
          x=345 sits ~27 units left of Sylvia (372) — clear of Sylvia's own
          hit-circle (r≈19) and Somi's own (r≈14 at this smaller scale)
          combined (~33 with a small margin). y dropped to GROUND_Y+20, well
          below PROPS.fences' first run (x 336-364, y GROUND_Y+1..+6) at the
          same x — Somi reads as standing in front of it, not through it. */}
      {(() => { const p = decorPos('somi'); return (
        <Draggable x={p.x} y={p.y} id="somi" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('somi')} r={13}>
          <CatShape x={0} y={0} scale={0.75 * itemScale('somi')} name="Somi" onClick={openSomi} wander={!arranging && !quiet} sleeping={night && !arranging} />
          <ResizeControls id="somi" storeX={p.x} storeY={p.y} renderX={0} renderY={-22} />
        </Draggable>
      ) })()}

      {/* Signpost toward Trips (2026-08-24) — Places' own Trips sub-tab has
          no district of its own; this points off-canvas at the village
          edge instead of inventing an eighth district. Draggable too now
          (round 27), same reasoning as the Mailbox above. */}
      {tripCount > 0 && (() => { const p = decorPos('signpost'); return (
        <Draggable x={p.x} y={p.y} id="signpost" arranging={arranging} draggingId={draggingId} onPointerDown={startDrag('signpost')} r={16}>
          <SignpostShape x={0} y={0} label={`${tripCount} upcoming trip${tripCount === 1 ? '' : 's'}`}
            onClick={nav('Trips', () => goToSection('places'), false)} />
        </Draggable>
      ) })()}

      {/* The near foreground (2026-08-27, round 6) — see FOREGROUND's own
          comment: everything above lives in one thin band (y 170..250ish),
          leaving the bottom ~43% of the canvas bare gradient ("too much
          empty space," a complaint that survived four rounds of adding
          detail because every round added it to that same band). Drawn
          LAST — after the districts and cast, so nearer scenery correctly
          overlaps the middle distance the way a real foreground would —
          and sorted back-to-front by its own depth so a far, small bush
          never paints over a near, large one out of order. Same night
          dimming filter as the rest of the ground layers, for the same
          reason: unfiltered, it would sit brighter than everything behind
          it after dark, the opposite of "nearer, in shadow." */}
      {/* Real sprites, round 12 (2026-08-27) — BushShape/WildflowerShape/
          GrassClumpShape (flat hand-drawn SVG) replaced with the user's
          own bush-mound/flowering-bush/tall-grass art, the same "remove
          old elements that don't fit anymore" direction applied to the
          scattered ground layer, not just the named props. Depth still
          drives size (f.scale, unchanged) and now opacity too, standing in
          for the old per-tone darkening (a fixed-color sprite can't be
          retinted the way a fill color could) — nearer items stay fuller,
          farther ones fade slightly toward the ground plane. Not made
          individually draggable (see DECOR_DEFAULTS' own comment) — 62
          procedurally-scattered items is texture, not something anyone
          wants to hand-place one at a time. */}
      <g pointerEvents="none" style={dark ? { filter: 'brightness(0.55) saturate(0.82)' } : undefined}>
        {FOREGROUND.map(f => {
          const spec = f.kind === 'bush' ? { href: 'bush-mound.png', w: 13.6, h: 8 }
            : f.kind === 'flower' ? { href: 'flowering-bush.png', w: 10.6, h: 8 }
            : { href: 'tall-grass.png', w: 8.5, h: 8 }
          const w = spec.w * f.scale, h = spec.h * f.scale
          return (
            <image key={f.id} href={`/village-assets/${spec.href}`} x={f.x - w / 2} y={f.y - h} width={w} height={h}
              opacity={0.5 + f.depth * 0.45} style={{ imageRendering: 'pixelated' }} />
          )
        })}
      </g>

      {/* The hover-board itself — see openOrToggle above. A transparent
          full-canvas rect behind the card closes it on any outside click;
          the card stops that click from reaching the rect so tapping
          inside never dismisses it. */}
      {openPanel && (() => {
        const p = pos(openPanel)
        const info = panelContent[openPanel]
        const width = 150
        const height = 34 + info.lines.length * 13 + 22
        const cx = Math.min(800 - width / 2 - 10, Math.max(width / 2 + 10, p.x))
        const top = Math.max(10, p.y - 40 - height)
        return (
          <g className="village-fade">
            <rect x={0} y={0} width={800} height={440} fill="transparent" style={{ pointerEvents: 'all' }} onClick={() => setOpenPanel(null)} />
            <g transform={`translate(${cx - width / 2} ${top})`} onClick={e => e.stopPropagation()}>
              <rect width={width} height={height} rx={10} fill="var(--text)" opacity={0.12} transform="translate(0 2)" />
              <rect width={width} height={height} rx={10} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} style={{ pointerEvents: 'all' }} />
              <text x={width / 2} y={17} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--text)" fontFamily="var(--font-body)">{info.title}</text>
              {info.lines.map((line, i) => (
                <text key={i} x={width / 2} y={31 + i * 13} textAnchor="middle" fontSize={7.5} fill="var(--muted)" fontFamily="var(--font-body)">{line}</text>
              ))}
              <g transform={`translate(${width / 2} ${height - 15})`} onClick={() => { info.go(); setOpenPanel(null) }}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}>
                <rect x={-48} y={-9} width={96} height={18} rx={9} fill="color-mix(in srgb, var(--gold) 14%, transparent)" stroke="var(--gold)" strokeWidth={0.8} />
                <text x={0} y={0.5} dominantBaseline="central" textAnchor="middle" fontSize={7.5} fill="var(--gold)" fontFamily="var(--font-body)">{info.actionLabel} →</text>
              </g>
            </g>
          </g>
        )
      })()}

      {/* Figure hover-card — same shape as the district hover-board above,
          positioned over Sylvia/Harry's own fixed spot rather than pos(id)
          since figures aren't landmarks. */}
      {openFigure && (() => {
        const figPos = decorPos(openFigure)
        const figX = figPos.x
        const figY = figPos.y
        const info = figureContent[openFigure]
        const width = 150
        const height = 34 + info.lines.length * 13 + 22
        const cx = Math.min(800 - width / 2 - 10, Math.max(width / 2 + 10, figX))
        const top = Math.max(10, figY - 40 - height)
        return (
          <g className="village-fade">
            <rect x={0} y={0} width={800} height={440} fill="transparent" style={{ pointerEvents: 'all' }} onClick={() => setOpenFigure(null)} />
            <g transform={`translate(${cx - width / 2} ${top})`} onClick={e => e.stopPropagation()}>
              <rect width={width} height={height} rx={10} fill="var(--text)" opacity={0.12} transform="translate(0 2)" />
              <rect width={width} height={height} rx={10} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} style={{ pointerEvents: 'all' }} />
              <text x={width / 2} y={17} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--text)" fontFamily="var(--font-body)">{info.title}</text>
              {info.lines.map((line, i) => (
                <text key={i} x={width / 2} y={31 + i * 13} textAnchor="middle" fontSize={7.5} fill="var(--muted)" fontFamily="var(--font-body)">{line}</text>
              ))}
              <g transform={`translate(${width / 2} ${height - 15})`} onClick={() => { onLockedNavigate?.(info.title); setOpenFigure(null) }}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}>
                <rect x={-48} y={-9} width={96} height={18} rx={9} fill="color-mix(in srgb, var(--gold) 14%, transparent)" stroke="var(--gold)" strokeWidth={0.8} />
                <text x={0} y={0.5} dominantBaseline="central" textAnchor="middle" fontSize={7.5} fill="var(--gold)" fontFamily="var(--font-body)">Unlock →</text>
              </g>
            </g>
          </g>
        )
      })()}

      {/* Somi's own hover-card — same shape again, positioned over her fixed
          spot, no PIN gate (her card just navigates, never calls
          onLockedNavigate). */}
      {openSomiCard && (() => {
        const somiPos = decorPos('somi')
        const somiX = somiPos.x
        const somiY = somiPos.y
        const width = 150
        const height = 34 + somiInfo.lines.length * 13 + 22
        const cx = Math.min(800 - width / 2 - 10, Math.max(width / 2 + 10, somiX))
        const top = Math.max(10, somiY - 40 - height)
        return (
          <g className="village-fade">
            <rect x={0} y={0} width={800} height={440} fill="transparent" style={{ pointerEvents: 'all' }} onClick={() => setOpenSomiCard(false)} />
            <g transform={`translate(${cx - width / 2} ${top})`} onClick={e => e.stopPropagation()}>
              <rect width={width} height={height} rx={10} fill="var(--text)" opacity={0.12} transform="translate(0 2)" />
              <rect width={width} height={height} rx={10} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} style={{ pointerEvents: 'all' }} />
              <text x={width / 2} y={17} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--text)" fontFamily="var(--font-body)">{somiInfo.title}</text>
              {somiInfo.lines.map((line, i) => (
                <text key={i} x={width / 2} y={31 + i * 13} textAnchor="middle" fontSize={7.5} fill="var(--muted)" fontFamily="var(--font-body)">{line}</text>
              ))}
              <g transform={`translate(${width / 2} ${height - 15})`} onClick={() => { goToHousehold('reference'); setOpenSomiCard(false) }}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}>
                <rect x={-48} y={-9} width={96} height={18} rx={9} fill="color-mix(in srgb, var(--gold) 14%, transparent)" stroke="var(--gold)" strokeWidth={0.8} />
                <text x={0} y={0.5} dominantBaseline="central" textAnchor="middle" fontSize={7.5} fill="var(--gold)" fontFamily="var(--font-body)">Open →</text>
              </g>
            </g>
          </g>
        )
      })()}

      {/* Styled callout for whichever plant/building is selected — see the
          selection state and locked-mode guard set up above. */}
      {selectedPlant && (
        <EntityCallout x={selectedPlant.x} y={selectedPlant.y}
          title={selectedPlant.plant.name}
          subtitle={`${selectedPlant.plant.stage}${selectedPlant.plant.dormant ? ' · resting' : ''}`} />
      )}
      {selectedBuilding && (
        <EntityCallout x={selectedBuilding.x} y={selectedBuilding.y}
          title={selectedBuilding.building.title}
          subtitle={selectedBuilding.building.phase} />
      )}

      {/* Time/season/weather readout (2026-08-24) — small, top-left, purely
          informational: what the sky/palette are already reacting to, put
          into words. Real values only (see the props' own comments); never
          shown if the caller has nothing real to say yet. */}
      {(timeLabel || weather) && (
        <g transform="translate(16 24)" pointerEvents="none">
          {/* Pinned-card treatment (2026-08-27) — was a plain rounded plate,
              which read as a conventional dashboard widget sitting ON the
              scene rather than a little card pinned INTO it. A drop shadow +
              a small sun/moon/cloud glyph (hand-drawn, same construction as
              everything else in this file — no external icon set) plus a
              slightly taller card to fit the glyph without crowding. */}
          <rect x={-8} y={-17} width={160} height={38} rx={10} fill="var(--text)" opacity={0.1} transform="translate(0 2)" />
          <rect x={-8} y={-17} width={160} height={38} rx={10} fill="var(--surface)" opacity={0.6} />
          {/* Glyph: moon (crescent) at night, sun (rayed circle) by day, a
              plain cloud puff when it's actually cloudy/rainy regardless of
              hour — reuses weatherMeta's own condition string, no new data. */}
          <g transform="translate(4 -1)">
            {weather && weather.condition !== 'clear' ? (
              <g fill="var(--text)" opacity={0.55}>
                <circle cx={-2} cy={0} r={3.2} /><circle cx={2} cy={-1.5} r={3.8} /><circle cx={5.5} cy={0.5} r={2.6} />
              </g>
            ) : v.timeOfDay === 'night' || v.timeOfDay === 'dusk' ? (
              <path d="M 4 -4 A 5 5 0 1 0 4 6 A 4 4 0 0 1 4 -4 Z" fill="var(--text)" opacity={0.6} />
            ) : (
              <>
                <circle cx={2} cy={1} r={3.4} fill="var(--amber)" opacity={0.75} />
                <g stroke="var(--amber)" strokeWidth={1} strokeLinecap="round" opacity={0.6}>
                  <line x1={2} y1={-4.5} x2={2} y2={-2.8} /><line x1={2} y1={4.8} x2={2} y2={6.5} />
                  <line x1={-3.5} y1={1} x2={-1.8} y2={1} /><line x1={5.8} y1={1} x2={7.5} y2={1} />
                </g>
              </>
            )}
          </g>
          {/* Two lines now (round 3, 2026-08-27) — was three lines building
              from a short phrase down to the most literal data (exact time,
              exact date); condensed toward the brief's own "Still tonight /
              61° · Full moon" example, which drops the literal clock time
              and date entirely (both already shown elsewhere — Header's own
              date line) in favor of reading as a place, not a readout. */}
          <text x={18} fontSize={12} fill="var(--text)" fontFamily="var(--font-body)" fontWeight={500} fontStyle="italic">
            {shortPostcard(v.timeOfDay, weather?.condition)}
          </text>
          <text x={18} y={15} fontSize={9.5} fill="var(--text)" opacity={0.75} fontFamily="var(--font-body)">
            {[weather ? `${weather.tempF}°` : null, weather ? weatherMeta(weather.condition).label : null, moonLabel]
              .filter(Boolean).join(' · ')}
          </text>
        </g>
      )}

      {/* World cast (round 19, 2026-08-27, "make everything look apart of
          the same world so if there is a cast there should be a cast over
          everything (like rain, sunset, gloomy)") — before this, only
          Sky.tsx's own gradient knew what time or weather it was; a warm
          dusk sky sat directly above a ground/buildings layer with no
          matching warmth at all, so the two halves of the picture read as
          two different lighting conditions glued together. These two
          rects tint literally everything below them — sky, ground,
          buildings, cast, props — with the SAME light: one for time of
          day, one for weather, so either (or both together, a rainy dusk)
          reads as one real condition the whole village is sitting in, not
          just a colored sky backdrop. Low opacity, normal blend (not
          multiply) so it warms/cools without crushing contrast the way a
          multiply wash would. */}
      {live && (() => {
        const timeCast: Record<VillageState['timeOfDay'], [string, number]> = {
          dawn: ['#F5B88A', 0.07],
          day: ['#FFFFFF', 0],
          dusk: ['#E67A4A', 0.1],
          night: ['#2A3B6B', 0.1],
        }
        const weatherCast: Record<WeatherCondition, [string, number]> = {
          clear: ['#FFFFFF', 0],
          cloudy: ['#8B93A0', 0.06],
          fog: ['#C7CCD1', 0.14],
          rain: ['#5C7290', 0.1],
          snow: ['#DCE6F0', 0.08],
          storm: ['#3E4A5C', 0.16],
        }
        const [tColor, tOp] = timeCast[v.timeOfDay]
        const [wColor, wOp] = weatherCast[weather?.condition ?? 'clear']
        return (
          <>
            {tOp > 0 && <rect width="800" height="440" fill={tColor} opacity={tOp} pointerEvents="none" />}
            {wOp > 0 && <rect width="800" height="440" fill={wColor} opacity={wOp} pointerEvents="none" />}
          </>
        )
      })()}
      {/* Vignette — pulls the eye to the middle of the scene. Drawn in
          SVG rather than as a CSS overlay so it can't intercept the
          clicks on the district labels underneath it. */}
      <rect width="800" height="440" fill="url(#vvignette)" pointerEvents="none" />
      {/* Grain (round 8 atmosphere pass, 2026-08-27) — see vgrain's own
          def comment. Drawn last, over everything, at a low enough opacity
          it reads as texture rather than noise; multiply blend so it can
          only darken, never wash the scene out or shift its hue. */}
      <rect width="800" height="440" filter="url(#vgrain)" opacity={0.05} pointerEvents="none" style={{ mixBlendMode: 'multiply' }} />
    </svg>
  )
}
