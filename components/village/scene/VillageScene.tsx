'use client'

import { useEffect, useRef, useState } from 'react'
import type { VillageState } from '@/lib/village/state'
import type { Slot } from '@/lib/village/layout'
import type { SeasonPalette } from '@/lib/village/palette'
import type { Celestial as CelestialData } from '@/lib/village/sky'
import { weatherMeta, type WeatherCondition } from '@/lib/village/weather'
import { goToSection, goToPersonal, goToHousehold } from '@/lib/utils/navigate'
import { PlantShape, BuildingShape, DistrictLabel, EntityCallout, FeatureIcon, PondShape, BenchShape, FlowerBedShape, MemoryMarker, PersonMarker, MailboxShape, SignpostShape, BuntingShape } from './shapes'
import Sky from './Sky'
import Clouds from './Clouds'
import Ambient from './Ambient'
import Horizon from './Horizon'
import type { HorizonPlace } from '@/lib/hooks/useSharedHorizon'
import type { VillageChanges } from '@/lib/village/state'
import { hashPos } from '@/lib/village/state'
import { LANDMARK_IDS, type VillageLayout, type LandmarkId } from '@/lib/village/layout'

export const GROUND_Y = 372

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
}

export type { Slot } from '@/lib/village/layout'

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
  archive: { x: 725, y: 190 },
  people: { x: 265, y: 165 },
  places: { x: 505, y: 165 },
}

export default function VillageScene({
  village: v, live, palette, celestial, plantSlots, buildingSlots,
  horizon = [], changes, locked = false, onLockedNavigate,
  layout = {}, arranging = false, onMoveLandmark,
  placesCount = 0, peopleCount = 0, soonestBirthdayDays = null, dateIdeaAreas = [], weather = null,
  timeLabel = null, dateLabel = null, moonLabel = null, tripCount = 0, people = [],
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
  /** Per-person map markers (2026-08-25) — one dot per contact from
   *  usePeople(), status pre-formatted by the caller (this component stays
   *  hookless/dateless, see the file's own header comment) from
   *  daysUntilBirthday/daysSinceContact. */
  people?: { id: string; name: string; status: string | null }[]
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
  // One wrapper so every district gets the same treatment — a locked click
  // never silently no-ops, it always explains itself via the unlock prompt.
  // Also the arranging guard: a click shouldn't navigate away mid-drag-mode.
  const nav = (label: string, go: () => void) => () => {
    if (arranging) return
    if (locked) onLockedNavigate?.(label)
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
    if (locked) onLockedNavigate?.(label)
    else go()
  }

  // A small hover-board instead of leaving straight away (2026-08-25) —
  // same idea as Archive already opening its own panel rather than
  // navigating off the Village on the first click. Forest/Home/Projects/
  // Places/People now open a compact summary card near the icon; a second
  // click on its own button is what actually leaves the Village. Archive
  // is untouched — it already IS this pattern, via the real ArchivePanel.
  const [openPanel, setOpenPanel] = useState<Exclude<LandmarkId, 'archive'> | null>(null)
  // Same hover-board idea as openPanel above, for the per-person markers
  // (2026-08-25) — a separate id space since a person isn't a LandmarkId.
  const [openPersonId, setOpenPersonId] = useState<string | null>(null)
  const openOrToggle = (id: Exclude<LandmarkId, 'archive'>, label: string) => () => {
    if (arranging) return
    recordVisit(id)
    if (locked) { onLockedNavigate?.(label); return }
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
      ],
      actionLabel: 'Open Habits', go: () => goToPersonal('habits'),
    },
    home: {
      title: 'Home',
      lines: ["Today's Brief"],
      actionLabel: 'Open Today', go: () => goToSection('brief'),
    },
    projects: {
      title: 'Projects',
      lines: [
        `${v.buildings.length} project${v.buildings.length === 1 ? '' : 's'}`,
        v.buildings.length ? `${standingCount} standing · ${underwayCount} underway` : 'Nothing underway yet',
      ],
      actionLabel: 'Open Tasks', go: () => goToPersonal('tasks'),
    },
    places: {
      title: 'Places',
      lines: [`${placesCount} saved place${placesCount === 1 ? '' : 's'}`],
      actionLabel: 'Open Places', go: () => goToSection('places'),
    },
    people: {
      title: 'People',
      lines: [
        `${peopleCount} close`,
        ...(soonestBirthdayDays != null ? [soonestBirthdayDays === 0 ? 'Birthday today 🎉' : `Birthday in ${soonestBirthdayDays}d`] : []),
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
          onClick={nav(area, () => goToHousehold('reference'))} />
      ))}

      {/* Per-person markers (2026-08-25) — see PersonMarker/people prop
          comments. Scattered on the opposite side of the path from the
          memory map (a different hash seed + y band) so the two don't
          collide, same "pure function of an id" determinism as everything
          else scattered in the scene. */}
      {people.map(p => (
        <PersonMarker key={p.id}
          x={40 + hashPos(p.id) * 720}
          y={GROUND_Y + 44 + hashPos(p.id + 'y') * 30}
          name={p.name}
          onClick={() => {
            if (arranging) return
            if (locked) { onLockedNavigate?.(p.name); return }
            setOpenPersonId(prev => (prev === p.id ? null : p.id))
          }} />
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

      {/* Home — always present, grows detail with activity */}
      <g transform={`translate(400 ${GROUND_Y - 4})`}>
        <title>Home — your Brief and today</title>
        {/* Grounding shadow — same BloomScan-style reasoning as PlantShape/
            BuildingShape's own (2026-08-24). */}
        <ellipse cx={0} cy={1.5} rx={34} ry={3} fill="var(--text)" opacity={0.12} />
        <rect x={-30} y={-44} width={60} height={44} rx={6} fill="var(--surface2)" stroke="var(--border)" strokeWidth={1.2} />
        <rect x={-30} y={-44} width={60} height={44} rx={6} fill="url(#vsheen)" />
        <path d="M -36 -44 Q 0 -70 36 -44 Z" fill="var(--gold)" fillOpacity={0.55} stroke="var(--gold)" strokeWidth={1} strokeOpacity={0.7} />
        <rect x={-8} y={-24} width={16} height={24} rx={3} fill="var(--gold)" opacity={0.35} />
        {/* Windows glow after dark, same reasoning as BuildingShape's own
            (2026-08-24, were unconditionally lit before). */}
        <rect x={-22} y={-34} width={10} height={10} rx={2.5} fill={dark ? 'var(--amber)' : 'var(--surface2)'} opacity={dark ? 0.75 : 0.5} className={dark ? 'village-glow' : undefined} />
        <rect x={12} y={-34} width={10} height={10} rx={2.5} fill={dark ? 'var(--amber)' : 'var(--surface2)'} opacity={dark ? 0.55 : 0.4} />
        {v.buildings.length + v.plants.length > 6 && (
          <path d="M 18 -68 L 18 -80 L 25 -80 L 25 -68" fill="none" stroke="var(--border)" strokeWidth={2} />
        )}
      </g>

      {/* Mailbox, beside Home (2026-08-24) — see MailboxShape's own comment:
          Rest Lake used to be where "jot something down" lived; this is its
          new, smaller home. */}
      <MailboxShape x={444} y={GROUND_Y - 4} onClick={nav('Capture', () => {
        goToSection('brief')
        setTimeout(() => window.dispatchEvent(new CustomEvent('app:focus-capture')), 80)
      })} />

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
          SectionNav glyph set, which shared no visual logic with the scene
          around it. Positions come from pos(id) — layout[id] if it's been
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

      <DistrictLabel {...pos('forest')} icon="leaf" label="Growth Forest" onClick={openOrToggle('forest', 'Growth Forest')}
        count={`${v.plants.length} growing`}
        draggable={arranging} dragging={draggingId === 'forest'} onPointerDown={startDrag('forest')} />
      <DistrictLabel {...pos('home')} icon="home" label="Home" onClick={openOrToggle('home', 'Home')} count="today"
        draggable={arranging} dragging={draggingId === 'home'} onPointerDown={startDrag('home')} />
      <DistrictLabel {...pos('projects')} icon="building" label="Projects" onClick={openOrToggle('projects', 'Projects')}
        count={`${v.buildings.length} standing`}
        draggable={arranging} dragging={draggingId === 'projects'} onPointerDown={startDrag('projects')} />
      <DistrictLabel {...pos('archive')} icon="book" label="Archive" onClick={navLandmark('archive', 'Archive', () => window.dispatchEvent(new CustomEvent('app:open-archive')))}
        count={v.treeRings > 0 ? `${v.treeRings}y` : `${v.accountMonths}mo`}
        draggable={arranging} dragging={draggingId === 'archive'} onPointerDown={startDrag('archive')} />
      {/* Places and People (2026-08-24) — the same real-district mechanism
          as the five above, extended to the two other things 4S already
          tracks that had no presence in the village at all: your saved pins
          and the people in your life. Counts come straight from
          usePlaces()/usePeople() in Village.tsx, no new data model. */}
      <DistrictLabel {...pos('places')} icon="places" label="Places" onClick={openOrToggle('places', 'Places')}
        count={`${placesCount} saved`}
        draggable={arranging} dragging={draggingId === 'places'} onPointerDown={startDrag('places')} />
      <DistrictLabel {...pos('people')} icon="people" label="People" onClick={openOrToggle('people', 'People')}
        count={soonestBirthdayDays != null ? (soonestBirthdayDays === 0 ? 'birthday today' : `birthday in ${soonestBirthdayDays}d`) : `${peopleCount} close`}
        draggable={arranging} dragging={draggingId === 'people'} onPointerDown={startDrag('people')} />
      {/* Birthday bunting (2026-08-24) — only on the actual day, over the
          People district's current position. */}
      {soonestBirthdayDays === 0 && <BuntingShape x={pos('people').x} y={pos('people').y} />}

      {/* Signpost toward Trips (2026-08-24) — Places' own Trips sub-tab has
          no district of its own; this points off-canvas at the village
          edge instead of inventing an eighth district. */}
      {tripCount > 0 && (
        <SignpostShape x={770} y={GROUND_Y + 30} label={`${tripCount} upcoming trip${tripCount === 1 ? '' : 's'}`}
          onClick={nav('Trips', () => goToSection('places'))} />
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

      {/* Hover-board for the selected person marker — same shape as
          openPanel's above, kept separate since a person isn't a
          LandmarkId. */}
      {openPersonId && (() => {
        const person = people.find(p => p.id === openPersonId)
        if (!person) return null
        const x = 40 + hashPos(person.id) * 720
        const y = GROUND_Y + 44 + hashPos(person.id + 'y') * 30
        const lines = person.status ? [person.status] : ['Nothing to flag']
        const width = 150
        const height = 34 + lines.length * 13 + 22
        const cx = Math.min(800 - width / 2 - 10, Math.max(width / 2 + 10, x))
        const top = Math.max(10, y - 30 - height)
        return (
          <g className="village-fade">
            <rect x={0} y={0} width={800} height={440} fill="transparent" style={{ pointerEvents: 'all' }} onClick={() => setOpenPersonId(null)} />
            <g transform={`translate(${cx - width / 2} ${top})`} onClick={e => e.stopPropagation()}>
              <rect width={width} height={height} rx={10} fill="var(--text)" opacity={0.12} transform="translate(0 2)" />
              <rect width={width} height={height} rx={10} fill="var(--surface)" stroke="var(--border)" strokeWidth={1} style={{ pointerEvents: 'all' }} />
              <text x={width / 2} y={17} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--text)" fontFamily="var(--font-body)">{person.name}</text>
              {lines.map((line, i) => (
                <text key={i} x={width / 2} y={31 + i * 13} textAnchor="middle" fontSize={7.5} fill="var(--muted)" fontFamily="var(--font-body)">{line}</text>
              ))}
              <g transform={`translate(${width / 2} ${height - 15})`} onClick={() => { goToPersonal('people'); setOpenPersonId(null) }}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}>
                <rect x={-48} y={-9} width={96} height={18} rx={9} fill="color-mix(in srgb, var(--gold) 14%, transparent)" stroke="var(--gold)" strokeWidth={0.8} />
                <text x={0} y={0.5} dominantBaseline="central" textAnchor="middle" fontSize={7.5} fill="var(--gold)" fontFamily="var(--font-body)">Open People →</text>
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
          <rect x={-8} y={-15} width={168} height={30} rx={8} fill="var(--surface)" opacity={0.55} />
          <text fontSize={12} fill="var(--text)" fontFamily="var(--font-body)" fontWeight={500}>
            {[timeLabel, weather ? `${weatherMeta(weather.condition).emoji} ${weather.tempF}°` : null]
              .filter(Boolean).join('   ')}
          </text>
          <text y={13} fontSize={9.5} fill="var(--text)" opacity={0.8} fontFamily="var(--font-body)">
            {[dateLabel, weather ? weatherMeta(weather.condition).label : null, moonLabel]
              .filter(Boolean).join(' · ')}
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
