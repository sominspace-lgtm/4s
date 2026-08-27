'use client'

import { useEffect, useRef, useState } from 'react'
import type { VillageState } from '@/lib/village/state'
import type { Slot } from '@/lib/village/layout'
import type { SeasonPalette } from '@/lib/village/palette'
import type { Celestial as CelestialData } from '@/lib/village/sky'
import { weatherMeta, type WeatherCondition } from '@/lib/village/weather'
import { goToSection, goToPersonal, goToHousehold, openSmartHome } from '@/lib/utils/navigate'
import { PlantShape, BuildingShape, DistrictLabel, EntityCallout, FeatureIcon, PondShape, BenchShape, FlowerBedShape, FenceShape, LampShape, MemoryMarker, VillagerShape, CatShape, MailboxShape, SignpostShape, BuntingShape, SpriteCycle, WALL, WALL_SHADOW, ROOF, ROOF_LIGHT, TRIM } from './shapes'

// The 2-frame flower-cluster sway (round 13, 2026-08-27,
// village-animations-complete.zip) — same idiom as shapes.tsx's own
// TREE_SWAY_FRAMES, module-level so it's one shared array reference.
const FLOWER_SWAY_FRAMES = [
  { src: '/village-assets/flower-cluster-1.png', aspect: 249 / 200 },
  { src: '/village-assets/flower-cluster-2.png', aspect: 272 / 201 },
]
import Sky from './Sky'
import Clouds from './Clouds'
import Ambient from './Ambient'
import Horizon from './Horizon'
import type { HorizonPlace } from '@/lib/hooks/useSharedHorizon'
import type { VillageChanges } from '@/lib/village/state'
import { hashPos } from '@/lib/village/state'
import { LANDMARK_IDS, type VillageLayout, type LandmarkId } from '@/lib/village/layout'

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
const PATH_D = `M 40 ${GROUND_Y + 24} Q 130 ${GROUND_Y + 40} 220 ${GROUND_Y + 30} T 400 ${GROUND_Y + 22} T 580 ${GROUND_Y + 32} T 760 ${GROUND_Y + 20}`

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
  // Fences and lamps (2026-08-25) — the rest of "denser, more lived-in
  // ground" from PROPS above. A short fence run near Home reads as a real
  // yard boundary rather than an open field; lamps mark the path itself so
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
const DEFAULT_LANDMARK_POS: Record<LandmarkId, { x: number; y: number }> = {
  forest: { x: 175, y: 250 },
  home: { x: 400, y: 250 },
  projects: { x: 620, y: 250 },
  archive: { x: 725, y: 205 },
  people: { x: 265, y: 180 },
  places: { x: 505, y: 180 },
}

// Default positions for every purely-decorative prop (round 12, 2026-08-27,
// "make it so we are able to customize the placement of these") — the six
// district labels above have been draggable in arrange mode since round
// 2026-08-21; this extends the exact same mechanism (decorPos/startDrag/
// onMoveLandmark, all now string-keyed) to individual scenery instead of
// just the six landmarks. Deliberately NOT extended to the two functional
// nav props (MailboxShape, the Trips SignpostShape — different call
// pattern, own onClick) or to FOREGROUND/MIDGROUND_BUSHES (62 procedurally
// scattered, individually-meaningless texture items — dragging one at a
// time there would be tedium, not customization). Coordinates below are
// each prop's own original fixed spot, unchanged — this only adds an
// override path, nothing moves until a user actually drags something.
const DECOR_DEFAULTS: Record<string, { x: number; y: number }> = {
  gate: { x: 58, y: GROUND_Y + 20 },
  car: { x: 500, y: GROUND_Y + 14 },
  busStop: { x: 568, y: GROUND_Y + 10 },
  vegCrate: { x: 122, y: GROUND_Y + 8 },
  bike: { x: 358, y: GROUND_Y + 2 },
  flowerPot: { x: 340, y: GROUND_Y + 8 },
  laundryBasket: { x: 448, y: GROUND_Y + 6 },
  breadBasket: { x: 478, y: GROUND_Y + 8 },
  peopleCorner: { x: 225, y: GROUND_Y + 2 },
  teaSet: { x: 220, y: GROUND_Y - 5 },
  picnicBlanket: { x: 255, y: GROUND_Y + 16 },
  swing: { x: 180, y: GROUND_Y + 6 },
  blankSign: { x: 540, y: GROUND_Y - 2 },
  bushMound: { x: 78, y: GROUND_Y - 2 },
  floweringBush: { x: 611, y: GROUND_Y + 27 },
  tallGrass: { x: 305, y: GROUND_Y + 31 },
  rockCluster: { x: 693, y: GROUND_Y + 29 },
  // Round 13 (2026-08-27) additions.
  flowerCluster: { x: 240, y: GROUND_Y + 33 },
  paperLantern: { x: 565, y: GROUND_Y + 10 },
}

export default function VillageScene({
  village: v, live, palette, celestial, plantSlots, buildingSlots,
  horizon = [], changes, locked = false, onLockedNavigate,
  layout = {}, arranging = false, onMoveLandmark,
  placesCount = 0, placeNames = [], peopleCount = 0, soonestBirthdayDays = null, dateIdeaAreas = [], weather = null,
  timeLabel = null, dateLabel = null, moonLabel = null, tripCount = 0, zoom = 1,
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
  /** 1 = the full 800×440 scene (default/unchanged). Below 1 shows more of
   *  the world at once; above 1 zooms in. Purely a `viewBox` computation —
   *  every coordinate inside the scene stays exactly as authored, see
   *  Village.tsx's own zoom-control comment for why this is a discrete
   *  +/- control rather than a gesture. */
  zoom?: number
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

  // Dusk/night — windows glow, otherwise they're just glass (2026-08-24).
  const dark = v.timeOfDay === 'dusk' || v.timeOfDay === 'night'

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
  const pos = (id: LandmarkId) => layout[id] ?? DEFAULT_LANDMARK_POS[id]
  // Decorative props' own position lookup (round 12, 2026-08-27) — same
  // "custom position if dragged, else a fixed default" rule as pos() above,
  // just for the open-ended prop set in DECOR_DEFAULTS instead of the six
  // districts. One shared layout blob (VillageLayout is now string-keyed),
  // so a decor id and a landmark id can never collide as long as
  // DECOR_DEFAULTS' keys don't reuse a LandmarkId — they don't.
  const decorPos = (id: string) => layout[id] ?? DECOR_DEFAULTS[id]

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
    }
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!draggingId || !onMoveLandmark) return
    const p = toSvgPoint(e.clientX, e.clientY)
    if (p) onMoveLandmark(draggingId, Math.round(p.x), Math.round(p.y))
  }
  function endDrag() { setDraggingId(null) }

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
  // coordinate in this file stays exactly as authored. Same 800:440 aspect
  // at every zoom level (no stretching). Centered on the scene's true
  // geometric middle (400, 220) — round 4's first pass centered lower
  // (260) to favor the ground over the empty sky, which sounded right but
  // wasn't: the canvas is exactly 440 tall, so at zoom 1 that shifted
  // viewBox (40..480) cropped 40 units off the TOP of the sky and revealed
  // 40 units of nothing below y=440 (the canvas has no content past its
  // own edge) — the "cream bar" reported live. True center + zoom clamped
  // to [1, 2] in Village.tsx (never below 1) means the box can never
  // exceed the canvas's own bounds in either direction, at any zoom level,
  // by construction — no clamping logic needed, the math just can't go
  // out of range.
  const vbW = 800 / zoom
  const vbH = 440 / zoom
  // Pan, clamped so the viewBox can never leave the canvas's own 800×440
  // bounds — at zoom 1, vbW/vbH already equal the full canvas, so this
  // clamp collapses to (0, 0) automatically and dragging does nothing,
  // matching the zoom floor's own "nothing past the edge to reveal" rule.
  const maxPanX = Math.max(0, (800 - vbW) / 2)
  const maxPanY = Math.max(0, (440 - vbH) / 2)
  const panX = Math.min(maxPanX, Math.max(-maxPanX, pan.x))
  const panY = Math.min(maxPanY, Math.max(-maxPanY, pan.y))
  const viewBox = `${400 - vbW / 2 - panX} ${220 - vbH / 2 - panY} ${vbW} ${vbH}`
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
        <filter id="vglow" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="3.2" result="blur" />
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

      {/* The path — see PATH_D above. Fixed warm dirt-brown now, not theme
          vars (round 4, 2026-08-27) — same reasoning WALL/ROOF/TRIM in
          shapes.tsx already established for buildings: a dirt path's color
          isn't themeable, and var(--surface2)/var(--border) (translucent
          cream/brown under Bloom) read too close to the ridge line's own
          var(--border) to tell apart at a glance. */}
      <path d={PATH_D} fill="none" stroke="#C9A876" strokeWidth={7} strokeLinecap="round" opacity={0.55} />
      <path d={PATH_D} fill="none" stroke="#8A6B47" strokeWidth={7} strokeDasharray="1 7" strokeLinecap="round" opacity={0.7} />

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
      </g>

      {/* Small props along the path — see PROPS above. */}
      <PondShape x={PROPS.pond.x} y={PROPS.pond.y} />
      {PROPS.benches.map((b, i) => <BenchShape key={i} x={b.x} y={b.y} />)}
      {PROPS.flowerBeds.map((f, i) => <FlowerBedShape key={i} x={f.x} y={f.y} hue={f.hue} />)}
      {PROPS.fences.map((f, i) => <FenceShape key={i} x={f.x} y={f.y} length={f.length} />)}
      {PROPS.lamps.map((l, i) => <LampShape key={i} x={l.x} y={l.y} dark={dark} />)}

      {/* Ten more real sprites, rounds 11–12 (2026-08-27, the user's own
          village-matching-expansion-pack, v2 with real alpha) — a gate
          marking the village's own entrance, a car and a bus stop for two
          more districts to lean on, and four ground-cover accents (bush/
          flowering bush/tall grass/rock) for variety beyond the procedural
          FOREGROUND layer's own three shapes. All draggable in arrange
          mode now (round 12) — see decorPos/DECOR_DEFAULTS. */}
      {[
        { id: 'gate', title: 'The way into the village', href: 'gate.png', w: 26.7, h: 16 },
        { id: 'car', title: 'Parked by the house', href: 'car.png', w: 25.8, h: 12 },
        { id: 'busStop', title: 'A bus stop', href: 'bus-stop.png', w: 21, h: 15.5 },
        { id: 'bushMound', title: 'A bush', href: 'bush-mound.png', w: 13.6, h: 8 },
        { id: 'floweringBush', title: 'A flowering bush', href: 'flowering-bush.png', w: 11.9, h: 9 },
        { id: 'tallGrass', title: 'Tall grass', href: 'tall-grass.png', w: 10.1, h: 9.5 },
        { id: 'rockCluster', title: 'A few rocks', href: 'rock-cluster.png', w: 13.2, h: 9 },
      ].map(p => {
        const p0 = decorPos(p.id)
        return (
          <g key={p.id} transform={`translate(${p0.x} ${p0.y})`} opacity={0.9}
            onPointerDown={startDrag(p.id)} style={{ cursor: arranging ? (draggingId === p.id ? 'grabbing' : 'grab') : undefined }}>
            <title>{p.title}</title>
            <ellipse cx={0} cy={p.h * 0.28} rx={p.w * 0.48} ry={2} fill="var(--text)" opacity={0.14} />
            <image href={`/village-assets/${p.href}`} x={-p.w / 2} y={-p.h} width={p.w} height={p.h}
              style={{ imageRendering: 'pixelated' }} />
            {arranging && (
              <rect x={-p.w / 2 - 2} y={-p.h - 2} width={p.w + 4} height={p.h + 6} rx={4}
                fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
                opacity={draggingId === p.id ? 0.9 : 0.4} />
            )}
          </g>
        )
      })}

      {/* Two more real sprites, round 13 (2026-08-27,
          village-animations-complete.zip) — a swaying flower cluster and a
          hanging paper lantern that actually lights up after dark. Both
          draggable via the same decorPos/DECOR_DEFAULTS mechanism as the
          block above, just rendered separately since neither fits the
          generic static-<image> loop (one animates, one swaps by `dark`). */}
      {(() => {
        const p0 = decorPos('flowerCluster')
        return (
          <g transform={`translate(${p0.x} ${p0.y})`} opacity={0.9}
            onPointerDown={startDrag('flowerCluster')} style={{ cursor: arranging ? (draggingId === 'flowerCluster' ? 'grabbing' : 'grab') : undefined }}>
            <title>Flowers by the path</title>
            <ellipse cx={0} cy={2.4} rx={6} ry={1.4} fill="var(--text)" opacity={0.14} />
            <SpriteCycle frames={FLOWER_SWAY_FRAMES} x={0} y={2} height={9.6} periodSec={4.5} />
            {arranging && (
              <rect x={-6} y={-11.6} width={12} height={15.6} rx={4}
                fill="none" stroke="var(--gold)" strokeWidth={1} strokeDasharray="3 3"
                opacity={draggingId === 'flowerCluster' ? 0.9 : 0.4} />
            )}
          </g>
        )
      })()}
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
            {dark && <circle cy={-postH - h / 2} r={7} fill="var(--amber)" opacity={0.2} filter="url(#vglow)" />}
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


      {/* Growth Forest */}
      {plantSlots.map(({ plant, x, y, scale, back }) => (
        <g key={plant.id} opacity={back ? 0.55 : 1}>
          <PlantShape plant={plant} x={x} y={y} scale={scale}
            foliage={live ? palette.foliage : undefined}
            changed={grew.has(plant.id) || planted.has(plant.id)}
            selected={selected?.type === 'plant' && selected.id === plant.id}
            cared={caredId === plant.id}
            onClick={selectPlant(plant.id, x, y)} />
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
      {/* Real sprite, round 10 (2026-08-27) — a vegetable crate at the edge
          of the growing band, "use all of the custom sprites." */}
      <g transform={`translate(${decorPos('vegCrate').x} ${decorPos('vegCrate').y})`} opacity={0.9}
        onPointerDown={startDrag('vegCrate')} style={{ cursor: arranging ? (draggingId === 'vegCrate' ? 'grabbing' : 'grab') : undefined }}>
        <title>Whatever's ready to pick</title>
        <ellipse cx={0} cy={2} rx={7} ry={1.4} fill="var(--text)" opacity={0.12} />
        <image href="/village-assets/veg-crate.png" x={-7} y={-8} width={14.1} height={8}
          style={{ imageRendering: 'pixelated' }} />
      </g>
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
        {/* Upgraded to the user's own custom sprite pack (round 9, 2026-08-27,
            simple-cozy-village-sprite-pack.zip — see public/village-assets/
            cottage.png, cropped from village-core-sprites.png) — the same
            pack that supplies Sylvia/Harry/Somi below, so Home and the cast
            now share one consistent art style instead of two different
            sources (round 8's free-tier farm-pack house next to hand-drawn
            figures). Self-made by the user; no licensing question. 432×354
            source, kept at that ~1.22 aspect ratio here. */}
        <image href="/village-assets/cottage.png" x={-55} y={-98} width={110} height={90}
          style={{ imageRendering: 'pixelated' }} />
        {/* Window glow after dark — the sprite has no baked-in light state,
            so this is a soft blurred amber ellipse roughly over the small
            square window, same vglow filter as the sun/moon/lamps.
            Repositioned for the new cottage sprite's own window location
            (round 9, 2026-08-27). */}
        {dark && <ellipse cx={-3} cy={-70} rx={8} ry={7} fill="var(--amber)" opacity={0.4} filter="url(#vglow)" />}
        {v.buildings.length + v.plants.length > 6 && (
          <path d="M 28 -88 L 28 -102 L 35 -102 L 35 -88" fill="none" stroke="var(--border)" strokeWidth={2} />
        )}
      </g>

      {/* Mailbox, beside Home (2026-08-24) — see MailboxShape's own comment:
          Rest Lake used to be where "jot something down" lived; this is its
          new, smaller home. */}
      <MailboxShape x={462} y={GROUND_Y - 4} onClick={nav('Capture', () => {
        goToSection('brief')
        setTimeout(() => window.dispatchEvent(new CustomEvent('app:focus-capture')), 80)
      })} />

      {/* Home's own personal objects (2026-08-25) — "make Home feel like MY
          home," not another building. Purely decorative, no onClick, same
          as the benches/flower beds scattered elsewhere.
          The hand-drawn bird feeder is gone (round 14, 2026-08-27, "remove
          all old out of style elements") — no matching sprite exists for
          it, and it was the one remaining raw SVG shape standing right next
          to the bike's real sprite. */}
      {/* Real sprite, round 9 (2026-08-27) — same pack as the cottage/cast. */}
      <g transform={`translate(${decorPos('bike').x} ${decorPos('bike').y})`} opacity={0.9}
        onPointerDown={startDrag('bike')} style={{ cursor: arranging ? (draggingId === 'bike' ? 'grabbing' : 'grab') : undefined }}>
        <title>A bike, leaning by the door</title>
        <ellipse cx={0} cy={7.5} rx={11} ry={1.6} fill="var(--text)" opacity={0.12} />
        <image href="/village-assets/bicycle.png" x={-13} y={-1} width={26} height={16.5}
          style={{ imageRendering: 'pixelated' }} />
      </g>

      {/* Three more real sprites from the same custom pack, filling out
          Home's yard (round 10, 2026-08-27, "use all of the custom
          sprites"). Same purely-decorative idiom as the bike/bird-feeder
          above — a title for hover-free accessibility, no onClick. */}
      <g transform={`translate(${decorPos('flowerPot').x} ${decorPos('flowerPot').y})`} opacity={0.92}
        onPointerDown={startDrag('flowerPot')} style={{ cursor: arranging ? (draggingId === 'flowerPot' ? 'grabbing' : 'grab') : undefined }}>
        <title>A flower pot by the porch</title>
        <ellipse cx={0} cy={2} rx={5} ry={1.2} fill="var(--text)" opacity={0.12} />
        <image href="/village-assets/flower-pot.png" x={-4.4} y={-10} width={8.7} height={10}
          style={{ imageRendering: 'pixelated' }} />
      </g>
      <g transform={`translate(${decorPos('laundryBasket').x} ${decorPos('laundryBasket').y})`} opacity={0.92}
        onPointerDown={startDrag('laundryBasket')} style={{ cursor: arranging ? (draggingId === 'laundryBasket' ? 'grabbing' : 'grab') : undefined }}>
        <title>Laundry, out to dry</title>
        <ellipse cx={0} cy={2} rx={5} ry={1.2} fill="var(--text)" opacity={0.12} />
        <image href="/village-assets/laundry-basket.png" x={-4.8} y={-8} width={9.6} height={8}
          style={{ imageRendering: 'pixelated' }} />
      </g>
      <g transform={`translate(${decorPos('breadBasket').x} ${decorPos('breadBasket').y})`} opacity={0.92}
        onPointerDown={startDrag('breadBasket')} style={{ cursor: arranging ? (draggingId === 'breadBasket' ? 'grabbing' : 'grab') : undefined }}>
        <title>Fresh bread, cooling</title>
        <ellipse cx={0} cy={2} rx={4.8} ry={1.1} fill="var(--text)" opacity={0.12} />
        <image href="/village-assets/bread-basket.png" x={-4.7} y={-8} width={9.5} height={8}
          style={{ imageRendering: 'pixelated' }} />
      </g>

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

      {/* Two more real sprites, round 10 (2026-08-27) — a tea set on the
          bench and a picnic blanket spread nearby, so People reads as an
          actual gathering spot, plus a swing a little further off. */}
      <g transform={`translate(${decorPos('teaSet').x} ${decorPos('teaSet').y})`} opacity={0.92}
        onPointerDown={startDrag('teaSet')} style={{ cursor: arranging ? (draggingId === 'teaSet' ? 'grabbing' : 'grab') : undefined }}>
        <title>Tea, poured for whoever stops by</title>
        <image href="/village-assets/tea-set.png" x={-6.4} y={-9} width={12.8} height={9}
          style={{ imageRendering: 'pixelated' }} />
      </g>
      <g transform={`translate(${decorPos('picnicBlanket').x} ${decorPos('picnicBlanket').y})`} opacity={0.92}
        onPointerDown={startDrag('picnicBlanket')} style={{ cursor: arranging ? (draggingId === 'picnicBlanket' ? 'grabbing' : 'grab') : undefined }}>
        <title>A picnic blanket, spread out</title>
        <image href="/village-assets/picnic-blanket.png" x={-6.2} y={-8} width={12.5} height={8}
          style={{ imageRendering: 'pixelated' }} />
      </g>
      <g transform={`translate(${decorPos('swing').x} ${decorPos('swing').y})`} opacity={0.88}
        onPointerDown={startDrag('swing')} style={{ cursor: arranging ? (draggingId === 'swing' ? 'grabbing' : 'grab') : undefined }}>
        <title>A porch swing</title>
        <ellipse cx={0} cy={2} rx={13} ry={2} fill="var(--text)" opacity={0.12} />
        <image href="/village-assets/swing.png" x={-14.9} y={-20} width={29.7} height={20}
          style={{ imageRendering: 'pixelated' }} />
      </g>

      {/* The hand-drawn luggage stack (2026-08-25) is gone (round 14,
          2026-08-27) — Places now has a real shop.png building (round 11)
          and a real bus-stop.png (round 12); a hand-drawn suitcase next to
          both read as a leftover from before either existed. */}

      {/* Real sprite, round 10 (2026-08-27) — a blank signpost near the
          Places kiosk, "use all of the custom sprites." */}
      <g transform={`translate(${decorPos('blankSign').x} ${decorPos('blankSign').y})`} opacity={0.9}
        onPointerDown={startDrag('blankSign')} style={{ cursor: arranging ? (draggingId === 'blankSign' ? 'grabbing' : 'grab') : undefined }}>
        <title>A signpost, waiting to be marked</title>
        <ellipse cx={0} cy={3} rx={8} ry={1.4} fill="var(--text)" opacity={0.12} />
        <image href="/village-assets/blank-sign.png" x={-8.2} y={-11} width={16.4} height={11}
          style={{ imageRendering: 'pixelated' }} />
      </g>

      {/* Archive Grove — the Life Tree. Rings are the yearly milestone; the
          canopy is the continuum underneath, so the tree visibly thickens
          across your first months instead of standing still until month 12. */}
      <g transform={`translate(725 ${GROUND_Y + 2})`}>
        <title>{
          v.treeRings > 0
            ? `Archive Grove, Life Tree, ${v.treeRings} year${v.treeRings === 1 ? '' : 's'}`
            : `Archive Grove, Life Tree in its first year, ${v.accountMonths} month${v.accountMonths === 1 ? '' : 's'} of growth`
        }</title>
        {/* The hand-drawn "greenhouse frame" that used to stand in for
            Archive's library/greenhouse identity is gone (round 11,
            2026-08-27) — DistrictArt's 'book' case now renders the user's
            own real greenhouse.png sprite at the district badge a few units
            away, so a second, translucent greenhouse-shaped outline back
            here would just be redundant (and risked reading as another
            structure, the exact "two houses" mistake earlier rounds spent
            a long time fixing). The Life Tree itself stays — real
            years-of-account data, not decoration. */}
        <rect x={-4} y={-40} width={8} height={40 * (0.75 + v.canopy * 0.25)} rx={2} fill="var(--slate)" opacity={0.7}
          transform={`translate(0 ${40 - 40 * (0.75 + v.canopy * 0.25)})`} />
        <circle cx={0} cy={-52} r={18 + v.canopy * 8} fill={live ? palette.foliage : 'var(--emerald)'} opacity={0.35} />
        <circle cx={-14} cy={-44} r={11 + v.canopy * 5} fill={live ? palette.foliage : 'var(--emerald)'} opacity={0.28} />
        <circle cx={14} cy={-45} r={10 + v.canopy * 5} fill={live ? palette.foliage : 'var(--emerald)'} opacity={0.3} />
        {[...Array(Math.min(v.treeRings, 5))].map((_, i) => (
          <circle key={i} cx={0} cy={-52} r={7 + i * 4.5} fill="none" stroke="var(--gold)" strokeWidth={0.7} opacity={0.35} />
        ))}
        {/* Real sprites, round 10 (2026-08-27, same custom pack) — replaces
            the hand-drawn stack with the pack's own book-stack.png, and adds
            a garden lantern on the other side for the "library/greenhouse"
            mood this district has been reaching for since the 2026-08-24
            reskin. */}
        <g transform="translate(-20 2)">
          <image href="/village-assets/book-stack.png" x={-5.5} y={-7} width={11} height={7}
            style={{ imageRendering: 'pixelated' }} />
        </g>
        <g transform="translate(24 3)">
          <image href="/village-assets/garden-lantern.png" x={-6.9} y={-12} width={13.9} height={12}
            style={{ imageRendering: 'pixelated' }} />
        </g>
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
      <DistrictLabel {...pos('forest')} icon="leaf" label="Growth Forest" onClick={openOrToggle('forest', 'Growth Forest')} dark={dark}
        count={v.plants.length === 0 ? 'waiting to be planted' : growingCount === 0 ? 'resting' : restingCount > 0 ? 'growing and resting' : 'growing quietly'}
        draggable={arranging} dragging={draggingId === 'forest'} onPointerDown={startDrag('forest')} />
      {/* Home reads 1.25x the rest (2026-08-27) — "this is where you live,"
          everything else branches outward from it. */}
      <DistrictLabel {...pos('home')} icon="home" label="Home" onClick={openOrToggle('home', 'Home')} count="today" dark={dark} scale={1.25}
        draggable={arranging} dragging={draggingId === 'home'} onPointerDown={startDrag('home')} />
      <DistrictLabel {...pos('projects')} icon="building" label="Projects" onClick={openOrToggle('projects', 'Projects')} dark={dark}
        count={v.buildings.length === 0 ? 'quiet for now' : underwayCount === 0 ? 'all standing' : 'under construction'}
        draggable={arranging} dragging={draggingId === 'projects'} onPointerDown={startDrag('projects')} />
      <DistrictLabel {...pos('archive')} icon="book" label="Archive" onClick={navLandmark('archive', 'Archive', () => window.dispatchEvent(new CustomEvent('app:open-archive')))} dark={dark}
        count={v.treeRings > 0 ? `${spellCount(v.treeRings)} year${v.treeRings === 1 ? '' : 's'} kept` : 'its first year'}
        draggable={arranging} dragging={draggingId === 'archive'} onPointerDown={startDrag('archive')} />
      {/* Places and People (2026-08-24) — the same real-district mechanism
          as the five above, extended to the two other things 4S already
          tracks that had no presence in the village at all: your saved pins
          and the people in your life. Counts come straight from
          usePlaces()/usePeople() in Village.tsx, no new data model. */}
      <DistrictLabel {...pos('places')} icon="places" label="Places" onClick={openOrToggle('places', 'Places')} dark={dark}
        count={placesCount === 0 ? 'no pins yet' : 'the map is growing'}
        draggable={arranging} dragging={draggingId === 'places'} onPointerDown={startDrag('places')} />
      <DistrictLabel {...pos('people')} icon="people" label="People" onClick={openOrToggle('people', 'People')} dark={dark}
        count={soonestBirthdayDays != null ? (soonestBirthdayDays === 0 ? 'birthday today' : `birthday in ${spellCount(soonestBirthdayDays)} day${soonestBirthdayDays === 1 ? '' : 's'}`) : peopleCount === 0 ? 'no one yet' : 'your people'}
        draggable={arranging} dragging={draggingId === 'people'} onPointerDown={startDrag('people')} />
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
          now make the cast nearly as tall as the house. */}
      <g className="village-bob" style={{ animationDelay: '0s' }}>
        <VillagerShape x={372} y={GROUND_Y + 8} name="Sylvia"
          onClick={locked ? openFigureOrToggle('sylvia') : undefined} />
      </g>
      <g className="village-bob" style={{ animationDelay: '0.6s' }}>
        <VillagerShape x={428} y={GROUND_Y + 8} name="Harry"
          onClick={locked ? openFigureOrToggle('harry') : undefined} />
      </g>
      {/* Moved 452->480, y+20->+30 (2026-08-25 fix) — her old spot put her
          invisible hit-circle (r=14) and the Mailbox's (r=14, x=462) only
          ~27.9 units apart center-to-center against a combined radius of
          28 — functionally touching, so a click near the boundary could
          land on either depending on sub-pixel rounding ("glitchy, hard to
          click"). Here she's ~46 units from the Mailbox and ~60 from
          Harry, clear of both. */}
      <g className="village-bob" style={{ animationDelay: '1.2s' }}>
        {/* scale dropped from 1.5 to 1, same reasoning as VillagerShape's
            own call sites above — CatShape's new sprite base size is
            already tuned. */}
        <CatShape x={480} y={GROUND_Y + 30} name="Somi" onClick={openSomi} />
      </g>

      {/* Signpost toward Trips (2026-08-24) — Places' own Trips sub-tab has
          no district of its own; this points off-canvas at the village
          edge instead of inventing an eighth district. */}
      {tripCount > 0 && (
        <SignpostShape x={770} y={GROUND_Y + 30} label={`${tripCount} upcoming trip${tripCount === 1 ? '' : 's'}`}
          onClick={nav('Trips', () => goToSection('places'), false)} />
      )}

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
        const figX = openFigure === 'sylvia' ? 372 : 428
        const figY = GROUND_Y + 8
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
        const somiX = 480
        const somiY = GROUND_Y + 30
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
