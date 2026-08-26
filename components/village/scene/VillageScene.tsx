'use client'

import { useEffect, useRef, useState } from 'react'
import type { VillageState } from '@/lib/village/state'
import type { Slot } from '@/lib/village/layout'
import type { SeasonPalette } from '@/lib/village/palette'
import type { Celestial as CelestialData } from '@/lib/village/sky'
import { weatherMeta, type WeatherCondition } from '@/lib/village/weather'
import { goToSection, goToPersonal, goToHousehold, openSmartHome } from '@/lib/utils/navigate'
import { PlantShape, BuildingShape, DistrictLabel, EntityCallout, FeatureIcon, PondShape, BenchShape, FlowerBedShape, FenceShape, LampShape, MemoryMarker, VillagerShape, CatShape, MailboxShape, SignpostShape, BuntingShape } from './shapes'
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

// A path through the ground, and a few small props along it (2026-08-24) —
// "less empty, more composed": a dirt path implies the districts are places
// you actually walk between, rather than icons floating over bare ground. It
// deliberately does NOT try to touch every district label's exact
// coordinate — those float freely as draggable UI badges (see arrange mode
// above) and a path wired to their literal position would tear the moment
// someone rearranges one. This is scenery, not wiring: one gentle curve
// through the ground band, fixed regardless of layout.
const PATH_D = `M 40 ${GROUND_Y - 24} Q 130 ${GROUND_Y - 40} 220 ${GROUND_Y - 30} T 400 ${GROUND_Y - 22} T 580 ${GROUND_Y - 32} T 760 ${GROUND_Y - 20}`

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
  lamps: [
    { x: 240, y: GROUND_Y - 32 },
    { x: 500, y: GROUND_Y - 36 },
    { x: 690, y: GROUND_Y - 24 },
  ],
}

export type { Slot } from '@/lib/village/layout'

// A small postcard sentence for the readout (2026-08-25) — "10:05 AM · 63°"
// is data; "A quiet morning in your village" is the same data read as a
// place rather than a dashboard. Real time-of-day only (no invented mood),
// with rain folded in when it's actually raining — everything else about
// the weather already shows on the line above via weatherMeta's own label.
const POSTCARD_LINE: Record<VillageState['timeOfDay'], string> = {
  dawn: 'A quiet morning in your village.',
  day: 'A bright day in your village.',
  dusk: 'Evening settles over your village.',
  night: 'A still night in your village.',
}
function postcardLine(timeOfDay: VillageState['timeOfDay'], condition?: WeatherCondition | null): string {
  const base = POSTCARD_LINE[timeOfDay]
  if (condition === 'rain' || condition === 'storm') return base.replace('village.', 'village, rain on the path.')
  return base
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

export default function VillageScene({
  village: v, live, palette, celestial, plantSlots, buildingSlots,
  horizon = [], changes, locked = false, onLockedNavigate,
  layout = {}, arranging = false, onMoveLandmark,
  placesCount = 0, placeNames = [], peopleCount = 0, soonestBirthdayDays = null, dateIdeaAreas = [], weather = null,
  timeLabel = null, dateLabel = null, moonLabel = null, tripCount = 0,
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
  onMoveLandmark?: (id: LandmarkId, x: number, y: number) => void
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
  const [draggingId, setDraggingId] = useState<LandmarkId | null>(null)
  const pos = (id: LandmarkId) => layout[id] ?? DEFAULT_LANDMARK_POS[id]

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

  function startDrag(id: LandmarkId) {
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
  return (
    <svg
      ref={svgRef}
      viewBox="0 0 800 440"
      role="img"
      aria-label="Your village — a view of your habits, projects and history"
      style={{ width: '100%', height: 'auto', display: 'block', touchAction: arranging ? 'none' : undefined }}
      onClick={() => setSelected(null)}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      onPointerCancel={endDrag}
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

      {/* The path — see PATH_D above. */}
      <path d={PATH_D} fill="none" stroke="var(--surface2)" strokeWidth={5} strokeLinecap="round" opacity={0.5} />
      <path d={PATH_D} fill="none" stroke="var(--border)" strokeWidth={5} strokeDasharray="1 7" strokeLinecap="round" opacity={0.6} />

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
      </g>

      {/* Small props along the path — see PROPS above. */}
      <PondShape x={PROPS.pond.x} y={PROPS.pond.y} />
      {PROPS.benches.map((b, i) => <BenchShape key={i} x={b.x} y={b.y} />)}
      {PROPS.flowerBeds.map((f, i) => <FlowerBedShape key={i} x={f.x} y={f.y} hue={f.hue} />)}
      {PROPS.fences.map((f, i) => <FenceShape key={i} x={f.x} y={f.y} length={f.length} />)}
      {PROPS.lamps.map((l, i) => <LampShape key={i} x={l.x} y={l.y} dark={dark} />)}

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
        <rect x={-42} y={-58} width={84} height={58} rx={7} fill="var(--surface2)" stroke="var(--border)" strokeWidth={1.3} />
        <rect x={-42} y={-58} width={84} height={58} rx={7} fill="url(#vsheen)" />
        <path d="M -49 -58 Q 0 -92 49 -58 Z" fill="var(--gold)" fillOpacity={0.55} stroke="var(--gold)" strokeWidth={1.1} strokeOpacity={0.7} />
        {/* Porch — a small overhang roof on two posts, framing the door */}
        <rect x={-20} y={-36} width={40} height={2.4} rx={1} fill="var(--slate)" opacity={0.6} />
        <rect x={-19} y={-36} width={1.6} height={36} fill="var(--slate)" opacity={0.55} />
        <rect x={17.4} y={-36} width={1.6} height={36} fill="var(--slate)" opacity={0.55} />
        <rect x={-24} y={0.5} width={48} height={2} fill="var(--slate)" opacity={0.4} />
        <rect x={-10} y={-32} width={20} height={32} rx={3.5} fill="var(--gold)" opacity={0.35} />
        {/* Windows glow after dark, same reasoning as BuildingShape's own
            (2026-08-24, were unconditionally lit before). Third small
            "bedroom" window up in the gable, per the redesign brief. */}
        <rect x={-32} y={-46} width={11} height={11} rx={2.5} fill={dark ? 'var(--amber)' : 'var(--surface2)'} opacity={dark ? 0.75 : 0.5} className={dark ? 'village-glow' : undefined} />
        <rect x={21} y={-46} width={11} height={11} rx={2.5} fill={dark ? 'var(--amber)' : 'var(--surface2)'} opacity={dark ? 0.55 : 0.4} />
        <circle cy={-72} r={5} fill={dark ? 'var(--amber)' : 'var(--surface2)'} stroke="var(--border)" strokeWidth={0.8}
          opacity={dark ? 0.7 : 0.45} className={dark ? 'village-glow' : undefined} />
        {v.buildings.length + v.plants.length > 6 && (
          <path d="M 24 -84 L 24 -98 L 31 -98 L 31 -84" fill="none" stroke="var(--border)" strokeWidth={2} />
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
          home," not another building. A leaning bike and a bird feeder,
          fixed just off the porch — small, specific, lived-in details
          rather than another functional prop. Purely decorative, no
          onClick, same as the benches/flower beds scattered elsewhere. */}
      <g transform={`translate(358 ${GROUND_Y + 2})`} opacity={0.85}>
        <title>A bike, leaning by the door</title>
        <ellipse cx={0} cy={9} rx={11} ry={1.6} fill="var(--text)" opacity={0.12} />
        <circle cx={-7} cy={6} r={6} fill="none" stroke="var(--slate)" strokeWidth={1.3} />
        <circle cx={7} cy={6} r={6} fill="none" stroke="var(--slate)" strokeWidth={1.3} />
        <path d="M -7 6 L 0 -3 L 7 6 M 0 -3 L -3 -8 M -3 -8 L 3 -8 M 0 -3 L 3 -3" fill="none" stroke="var(--slate)" strokeWidth={1.3} strokeLinecap="round" />
      </g>
      <g transform={`translate(345 ${GROUND_Y - 20})`} opacity={0.85}>
        <title>A bird feeder in the yard</title>
        <line x1={0} y1={0} x2={0} y2={16} stroke="var(--slate)" strokeWidth={1.2} />
        <path d="M -6 -3 L 6 -3 L 4 3 L -4 3 Z" fill="var(--gold)" fillOpacity={0.5} stroke="var(--gold)" strokeWidth={0.8} />
        <path d="M -6 -3 Q 0 -8 6 -3" fill="none" stroke="var(--gold)" strokeWidth={0.8} opacity={0.6} />
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

      {/* Workshop identity (2026-08-25) — a small crane and a blueprint
          sheet, fixed just past the buildings themselves, so Projects reads
          as an active construction yard rather than the same tile-icon
          language as every other district. One-time scenery, not tied to
          any building count. */}
      <g transform={`translate(690 ${GROUND_Y - 2})`} opacity={0.7}>
        <title>The workshop crane</title>
        <line x1={0} y1={0} x2={0} y2={-46} stroke="var(--slate)" strokeWidth={1.6} />
        <line x1={-2} y1={-46} x2={22} y2={-46} stroke="var(--slate)" strokeWidth={1.6} />
        <line x1={-2} y1={-46} x2={-10} y2={-40} stroke="var(--slate)" strokeWidth={1.6} />
        <line x1={18} y1={-46} x2={18} y2={-30} stroke="var(--slate)" strokeWidth={1} opacity={0.8} />
      </g>
      <g transform={`translate(640 ${GROUND_Y - 1})`} opacity={0.75}>
        <title>Blueprints, rolled out on a sawhorse</title>
        <rect x={-10} y={-6} width={20} height={7} rx={0.6} fill="var(--surface)" stroke="var(--gold)" strokeWidth={0.7} />
        <line x1={-7} y1={-3.5} x2={3} y2={-3.5} stroke="var(--gold)" strokeWidth={0.5} opacity={0.6} />
        <line x1={-7} y1={-1.5} x2={6} y2={-1.5} stroke="var(--gold)" strokeWidth={0.5} opacity={0.6} />
      </g>

      {/* The cast (2026-08-25) — replaces the old per-contact PersonMarker
          dots with the three actual, always-present characters, standing in
          Home's yard. See VillagerShape/CatShape's own header comment for
          why this is a deliberate exception to the district icons' "objects,
          not figures" rule. A slow, staggered idle bob (village-bob, see
          globals.css) is the one bit of "tiny people walking" life this
          scene gets — full movement/pathing is out of scope for now.
          Drawn AFTER plants/buildings (2026-08-25 fix, was right after the
          Mailbox) — a scattered plant/building slot could otherwise land on
          top of the cast's fixed spot and steal its clicks, since SVG paints
          later elements over earlier ones ("can't click the figures"). */}
      <g className="village-bob" style={{ animationDelay: '0s' }}>
        <VillagerShape x={372} y={GROUND_Y + 8} name="Sylvia" hairColor="#8B5E3C" outfitColor="var(--blush)"
          onClick={locked ? openFigureOrToggle('sylvia') : undefined} />
      </g>
      <g className="village-bob" style={{ animationDelay: '0.6s' }}>
        <VillagerShape x={428} y={GROUND_Y + 8} name="Harry" hairColor="#4A3728" outfitColor="var(--emerald)"
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
        <CatShape x={480} y={GROUND_Y + 30} name="Somi" onClick={openSomi} />
      </g>

      {/* People identity (2026-08-25) — a second bench angled toward the
          one already scattered near this district (see PROPS.benches
          above) plus a small stack of letters, so People reads as a social
          corner rather than the same tile language as everywhere else. */}
      <g transform={`translate(225 ${GROUND_Y + 2})`} opacity={0.75}>
        <title>A quiet corner to sit and talk</title>
        <BenchShape x={0} y={0} />
        <g transform="translate(16 -2) rotate(-8)">
          <rect x={-4} y={-3} width={8} height={5.5} rx={0.5} fill="var(--surface)" stroke="var(--gold)" strokeWidth={0.6} />
          <rect x={-3} y={-1.6} width={6} height={4.5} rx={0.5} fill="var(--blush)" opacity={0.5} />
        </g>
      </g>

      {/* Places identity (2026-08-25) — a small stack of luggage, marking
          this corner as the departure point rather than another building. */}
      <g transform={`translate(505 ${GROUND_Y + 4})`} opacity={0.8}>
        <title>Luggage, ready for the next trip</title>
        <ellipse cx={0} cy={5} rx={9} ry={1.4} fill="var(--text)" opacity={0.12} />
        <rect x={-8} y={-2} width={9} height={7} rx={1} fill="var(--slate)" opacity={0.6} />
        <rect x={0} y={-6} width={7} height={11} rx={1} fill="var(--gold)" opacity={0.45} stroke="var(--gold)" strokeWidth={0.6} />
        <line x1={3.5} y1={-6} x2={3.5} y2={-8} stroke="var(--gold)" strokeWidth={0.9} strokeLinecap="round" />
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
        {/* Greenhouse frame, behind the tree (2026-08-24 reskin) — Archive
            reads as a generic tree in a plain spot without this; a small
            glass-roofed frame around it reframes the whole thing as a
            library/greenhouse for what you've finished and kept, not just
            another district. Drawn first so the tree stands inside it. */}
        <path d="M -28 4 L -28 -30 L 0 -46 L 28 -30 L 28 4"
          fill="var(--surface2)" fillOpacity={0.22} stroke="var(--border)" strokeWidth={1} />
        <path d="M -28 -30 L 0 -46 L 28 -30" fill="none" stroke="var(--gold)" strokeWidth={0.8} opacity={0.5} />
        <path d="M -14 -38 L -14 4 M 14 -38 L 14 4" stroke="var(--border)" strokeWidth={0.6} opacity={0.45} />
        <rect x={-4} y={-40} width={8} height={40 * (0.75 + v.canopy * 0.25)} rx={2} fill="var(--slate)" opacity={0.7}
          transform={`translate(0 ${40 - 40 * (0.75 + v.canopy * 0.25)})`} />
        <circle cx={0} cy={-52} r={18 + v.canopy * 8} fill={live ? palette.foliage : 'var(--emerald)'} opacity={0.35} />
        <circle cx={-14} cy={-44} r={11 + v.canopy * 5} fill={live ? palette.foliage : 'var(--emerald)'} opacity={0.28} />
        <circle cx={14} cy={-45} r={10 + v.canopy * 5} fill={live ? palette.foliage : 'var(--emerald)'} opacity={0.3} />
        {[...Array(Math.min(v.treeRings, 5))].map((_, i) => (
          <circle key={i} cx={0} cy={-52} r={7 + i * 4.5} fill="none" stroke="var(--gold)" strokeWidth={0.7} opacity={0.35} />
        ))}
        {/* A small stack of books at the base — library, not just glasshouse. */}
        <g transform="translate(-20 2)">
          <rect x={-4} y={-3} width={8} height={3} rx={0.5} fill="var(--gold)" opacity={0.55} />
          <rect x={-3.5} y={-6} width={7} height={3} rx={0.5} fill="var(--slate)" opacity={0.55} />
        </g>
        {/* A book, literally beside the Life Tree (2026-08-22) — same
            reasoning as the lake's fish, the forest's leaf, and the
            district's building above, fixed right next to the tree itself. */}
        <FeatureIcon kind="book" x={26} y={-6} scale={0.75} opacity={0.55} />
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
      <DistrictLabel {...pos('forest')} icon="leaf" label="Growth Forest" onClick={openOrToggle('forest', 'Growth Forest')}
        count={v.plants.length === 0 ? 'waiting to be planted' : growingCount === 0 ? 'resting' : restingCount > 0 ? 'growing and resting' : 'growing quietly'}
        draggable={arranging} dragging={draggingId === 'forest'} onPointerDown={startDrag('forest')} />
      <DistrictLabel {...pos('home')} icon="home" label="Home" onClick={openOrToggle('home', 'Home')} count="today"
        draggable={arranging} dragging={draggingId === 'home'} onPointerDown={startDrag('home')} />
      <DistrictLabel {...pos('projects')} icon="building" label="Projects" onClick={openOrToggle('projects', 'Projects')}
        count={v.buildings.length === 0 ? 'quiet for now' : underwayCount === 0 ? 'all standing' : 'under construction'}
        draggable={arranging} dragging={draggingId === 'projects'} onPointerDown={startDrag('projects')} />
      <DistrictLabel {...pos('archive')} icon="book" label="Archive" onClick={navLandmark('archive', 'Archive', () => window.dispatchEvent(new CustomEvent('app:open-archive')))}
        count={v.treeRings > 0 ? `${spellCount(v.treeRings)} year${v.treeRings === 1 ? '' : 's'} kept` : 'its first year'}
        draggable={arranging} dragging={draggingId === 'archive'} onPointerDown={startDrag('archive')} />
      {/* Places and People (2026-08-24) — the same real-district mechanism
          as the five above, extended to the two other things 4S already
          tracks that had no presence in the village at all: your saved pins
          and the people in your life. Counts come straight from
          usePlaces()/usePeople() in Village.tsx, no new data model. */}
      <DistrictLabel {...pos('places')} icon="places" label="Places" onClick={openOrToggle('places', 'Places')}
        count={placesCount === 0 ? 'no pins yet' : 'the map is growing'}
        draggable={arranging} dragging={draggingId === 'places'} onPointerDown={startDrag('places')} />
      <DistrictLabel {...pos('people')} icon="people" label="People" onClick={openOrToggle('people', 'People')}
        count={soonestBirthdayDays != null ? (soonestBirthdayDays === 0 ? 'birthday today' : `birthday in ${spellCount(soonestBirthdayDays)} day${soonestBirthdayDays === 1 ? '' : 's'}`) : peopleCount === 0 ? 'no one yet' : 'your people'}
        draggable={arranging} dragging={draggingId === 'people'} onPointerDown={startDrag('people')} />
      {/* Birthday bunting (2026-08-24) — only on the actual day, over the
          People district's current position. */}
      {soonestBirthdayDays === 0 && <BuntingShape x={pos('people').x} y={pos('people').y} />}

      {/* Signpost toward Trips (2026-08-24) — Places' own Trips sub-tab has
          no district of its own; this points off-canvas at the village
          edge instead of inventing an eighth district. */}
      {tripCount > 0 && (
        <SignpostShape x={770} y={GROUND_Y + 30} label={`${tripCount} upcoming trip${tripCount === 1 ? '' : 's'}`}
          onClick={nav('Trips', () => goToSection('places'), false)} />
      )}

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
          {/* A soft plate behind the text (2026-08-25 fix) — the readout was
              reported too small and too grey to read: fontSize 9/7 with the
              second line in --muted AND an extra 0.8 group-opacity stacked
              on top of muted's own alpha. Bigger type, a real background so
              contrast doesn't depend on whatever's behind it in the scene
              (sky color varies by time of day), and --text at a gentle
              opacity instead of double-dimmed --muted. */}
          <rect x={-8} y={-15} width={186} height={44} rx={8} fill="var(--surface)" opacity={0.55} />
          <text fontSize={12} fill="var(--text)" fontFamily="var(--font-body)" fontWeight={500}>
            {[timeLabel, weather ? `${weather.tempF}°` : null]
              .filter(Boolean).join('   ')}
          </text>
          <text y={13} fontSize={9.5} fill="var(--text)" opacity={0.8} fontFamily="var(--font-body)">
            {[dateLabel, weather ? weatherMeta(weather.condition).label : null, moonLabel]
              .filter(Boolean).join(' · ')}
          </text>
          {/* The postcard line — see postcardLine() above. */}
          <text y={27} fontSize={9} fill="var(--text)" opacity={0.62} fontFamily="var(--font-body)" fontStyle="italic">
            {postcardLine(v.timeOfDay, weather?.condition)}
          </text>
        </g>
      )}

      {/* Vignette — pulls the eye to the middle of the scene. Drawn in
          SVG rather than as a CSS overlay so it can't intercept the
          clicks on the district labels underneath it. */}
      <rect width="800" height="440" fill="url(#vvignette)" pointerEvents="none" />
    </svg>
  )
}
