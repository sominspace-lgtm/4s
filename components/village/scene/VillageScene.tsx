'use client'

import { useRef, useState } from 'react'
import type { VillageState } from '@/lib/village/state'
import type { Slot } from '@/lib/village/layout'
import type { SeasonPalette } from '@/lib/village/palette'
import type { Celestial as CelestialData } from '@/lib/village/sky'
import { goToSection, goToPersonal } from '@/lib/utils/navigate'
import { PlantShape, BuildingShape, DistrictLabel, EntityCallout, FeatureIcon } from './shapes'
import Sky from './Sky'
import Clouds from './Clouds'
import Ambient from './Ambient'
import Horizon from './Horizon'
import type { HorizonPlace } from '@/lib/hooks/useSharedHorizon'
import type { VillageChanges } from '@/lib/village/state'
import { hashPos } from '@/lib/village/state'
import type { VillageLayout, LandmarkId } from '@/lib/village/layout'

export const GROUND_Y = 372

// A fixed scatter of grass tufts along the ground line (2026-08-21) — one
// of the concrete things making the scene read as sparse rather than calm:
// a wide gap of bare ground between the tree line and the district row with
// nothing in it. hashPos() keyed by a fixed per-tuft string keeps every
// tuft's position and height stable across renders — same "pure function of
// an id" rule the rest of the village runs under, just with a literal index
// standing in for a real entity id since these aren't tied to any data.
const GRASS_TUFTS = Array.from({ length: 34 }, (_, i) => {
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
const STONES = Array.from({ length: 16 }, (_, i) => {
  const seed = `stone-${i}`
  const x = 15 + hashPos(seed) * 770
  const r = 1.4 + hashPos(seed + 'r') * 2.2
  return { x, r, id: seed }
})

// Distant treeline silhouette, behind the grass, in front of the sky — the
// empty gap between horizon and ground that made the scene read as flat.
// A little more here than one flat band: two overlapping rows at slightly
// different heights, same trick BloomScan's own treeline uses.
const DISTANT_TREES = Array.from({ length: 13 }, (_, i) => {
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
  lake: { x: 150, y: 130 },
  forest: { x: 175, y: 250 },
  home: { x: 400, y: 250 },
  projects: { x: 620, y: 250 },
  archive: { x: 725, y: 190 },
}

export default function VillageScene({
  village: v, live, palette, celestial, plantSlots, buildingSlots,
  horizon = [], changes, locked = false, onLockedNavigate,
  layout = {}, arranging = false, onMoveLandmark,
}: {
  village: VillageState
  live: boolean
  palette: SeasonPalette
  celestial: CelestialData | null
  plantSlots: (Slot & { plant: VillageState['plants'][number] })[]
  buildingSlots: (Slot & { building: VillageState['buildings'][number] })[]
  horizon?: HorizonPlace[]
  changes?: VillageChanges
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
        <radialGradient id="vlake">
          <stop offset="0%" stopColor="var(--slate)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--slate)" stopOpacity="0.15" />
        </radialGradient>
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
        <clipPath id="vlakeClip">
          <ellipse cx={150} cy={410} rx={110} ry={22} />
        </clipPath>
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
      {/* Behind the ground line and above the sky: places you've both been.
          Drawn before the ground stroke so the hills sit properly behind it. */}
      <Horizon places={horizon} groundY={GROUND_Y} />

      <path d={`M 0 ${GROUND_Y} Q 200 ${GROUND_Y - 26} 400 ${GROUND_Y - 8} T 800 ${GROUND_Y - 18}`}
        fill="none" stroke="var(--border)" strokeWidth="1.5" />

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

      {/* Pollen motes — pure atmosphere, see POLLEN above. */}
      <g opacity={0.3}>
        {POLLEN.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2 + (i % 2)} fill="var(--amber)" />
        ))}
      </g>

      {/* Rest Lake — clarity reflects actual rest taken */}
      <ellipse cx={150} cy={410} rx={110} ry={22} fill="url(#vlake)" opacity={0.4 + v.stillness * 0.6} />
      {/* The sky's own celestial body, mirrored onto the water. Its x maps
          the sun/moon's full arc across the sky (roughly 70-730) onto the
          lake's own width, so the reflection glides smoothly from one bank
          to the other over the course of a real day rather than only
          appearing when the sun happens to be directly overhead the pond —
          a village pond earns a little license there. Clipped to the lake's
          own ellipse so it never floats off the water's edge. */}
      {live && celestial && (
        <g clipPath="url(#vlakeClip)">
          <ellipse
            cx={60 + Math.max(0, Math.min(1, (celestial.x - 70) / 660)) * 180}
            cy={405} rx={celestial.body === 'sun' ? 16 : 11} ry={5}
            fill={celestial.body === 'sun' ? 'var(--amber)' : 'var(--text)'}
            opacity={celestial.body === 'sun' ? 0.3 : 0.22}
            className="village-drift"
          />
        </g>
      )}
      <ellipse cx={150} cy={410} rx={110} ry={22} fill="none" stroke="var(--slate)" strokeWidth={0.8} opacity={0.4} />
      <g className="village-drift">
        <ellipse cx={120} cy={406} rx={26} ry={3} fill="var(--text)" opacity={0.07} />
        <ellipse cx={186} cy={414} rx={18} ry={2.4} fill="var(--text)" opacity={0.05} />
      </g>
      {/* A fish, literally in the lake (2026-08-22) — the district's nav
          badge carries the same silhouette, but that badge floats free and
          can be dragged anywhere in arrange mode; this one is fixed to the
          water itself so "this is what's here" survives regardless. */}
      <FeatureIcon kind="fish" x={195} y={402} scale={0.85} opacity={0.55} />

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
        <rect x={-22} y={-34} width={10} height={10} rx={2.5} fill="var(--amber)" opacity={0.75} className="village-glow" />
        <rect x={12} y={-34} width={10} height={10} rx={2.5} fill="var(--amber)" opacity={0.55} />
        {v.buildings.length + v.plants.length > 6 && (
          <path d="M 18 -68 L 18 -80 L 25 -80 L 25 -68" fill="none" stroke="var(--border)" strokeWidth={2} />
        )}
      </g>

      {/* Project District */}
      {buildingSlots.map(({ building, x, y, scale, back }) => (
        <g key={building.id} opacity={back ? 0.55 : 1}>
          <BuildingShape building={building} x={x} y={y} scale={scale}
            changed={landmarked.has(building.id)}
            selected={selected?.type === 'building' && selected.id === building.id}
            cared={caredId === building.id}
            onClick={selectBuilding(building.id, x, y)} />
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
        <rect x={-4} y={-40} width={8} height={40 * (0.75 + v.canopy * 0.25)} rx={2} fill="var(--slate)" opacity={0.7}
          transform={`translate(0 ${40 - 40 * (0.75 + v.canopy * 0.25)})`} />
        <circle cx={0} cy={-52} r={18 + v.canopy * 8} fill={live ? palette.foliage : 'var(--emerald)'} opacity={0.35} />
        <circle cx={-14} cy={-44} r={11 + v.canopy * 5} fill={live ? palette.foliage : 'var(--emerald)'} opacity={0.28} />
        <circle cx={14} cy={-45} r={10 + v.canopy * 5} fill={live ? palette.foliage : 'var(--emerald)'} opacity={0.3} />
        {[...Array(Math.min(v.treeRings, 5))].map((_, i) => (
          <circle key={i} cx={0} cy={-52} r={7 + i * 4.5} fill="none" stroke="var(--gold)" strokeWidth={0.7} opacity={0.35} />
        ))}
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
      {live && <Ambient village={v} palette={palette} groundY={GROUND_Y} />}

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
          of what's actually in each district (a fish for the lake, a leaf
          for the forest, a building for projects, a book for the archive
          next to its own tree — see shapes.tsx's DistrictIcon) rather than
          the app's abstract SectionNav glyph set, which shared no visual
          logic with the scene around it. Positions come from pos(id) —
          layout[id] if it's been dragged, otherwise the same defaults as
          always.

          Rest Lake, Home, and Archive all landed on goToSection('brief')
          until 2026-08-24 — three visually distinct districts that did the
          exact same thing on click, which is exactly the "confusing
          navigation" this fixed: Rest Lake now opens the Brief AND focuses
          the capture box (stillness is literally "days you paused to write
          something down", see useReflectionDays), and Archive opens the
          real Archive panel ("everything you've completed") instead of
          just landing on the Brief a second time. Home stays on the Brief —
          that one was always correct. */}
      <DistrictLabel {...pos('lake')} icon="fish" label="Rest Lake" onClick={nav('Rest Lake', () => {
        goToSection('brief')
        setTimeout(() => window.dispatchEvent(new CustomEvent('app:focus-capture')), 80)
      })}
        count={v.stillness > 0.5 ? 'still' : 'ready when you are'}
        draggable={arranging} dragging={draggingId === 'lake'} onPointerDown={startDrag('lake')} />
      <DistrictLabel {...pos('forest')} icon="leaf" label="Growth Forest" onClick={nav('Growth Forest', () => goToPersonal('habits'))}
        count={`${v.plants.length} growing`}
        draggable={arranging} dragging={draggingId === 'forest'} onPointerDown={startDrag('forest')} />
      <DistrictLabel {...pos('home')} icon="home" label="Home" onClick={nav('Home', () => goToSection('brief'))} count="today"
        draggable={arranging} dragging={draggingId === 'home'} onPointerDown={startDrag('home')} />
      <DistrictLabel {...pos('projects')} icon="building" label="Projects" onClick={nav('Projects', () => goToPersonal('tasks'))}
        count={`${v.buildings.length} standing`}
        draggable={arranging} dragging={draggingId === 'projects'} onPointerDown={startDrag('projects')} />
      <DistrictLabel {...pos('archive')} icon="book" label="Archive" onClick={nav('Archive', () => window.dispatchEvent(new CustomEvent('app:open-archive')))}
        count={v.treeRings > 0 ? `${v.treeRings}y` : `${v.accountMonths}mo`}
        draggable={arranging} dragging={draggingId === 'archive'} onPointerDown={startDrag('archive')} />

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

      {/* Vignette — pulls the eye to the middle of the scene. Drawn in
          SVG rather than as a CSS overlay so it can't intercept the
          clicks on the district labels underneath it. */}
      <rect width="800" height="440" fill="url(#vvignette)" pointerEvents="none" />
    </svg>
  )
}
