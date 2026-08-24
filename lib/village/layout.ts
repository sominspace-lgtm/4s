import { hashPos } from './state'

// Where everything stands.
//
// Two jobs beyond the old inline maths: use the width the scene actually has,
// and keep growth visible past the point where the old caps stopped it. The
// forest used to hold 14 and the district 8, laid out across x 60-310 and
// 500-750, so more than half of an 800-wide canvas was empty sky while someone
// with 20 habits saw six of them silently dropped.
//
// Placement is still a pure function of the id for every PLANT and BUILDING
// — no stored positions there, and that's staying: those are tied to real
// habits and tasks, come and go with them, and would need re-arranging every
// time the underlying data changed if a position were ever saved for one.
// It's why the back row is derived from a hash rather than from whatever
// order the rows came back in.
//
// The fixed LANDMARKS (Growth Forest, Home, Projects, Archive, and — added
// 2026-08-24 — Places and People; Rest Lake removed the same day) are a
// different case as of 2026-08-21 — they never move on their own regardless
// of data, so a saved position is actually meaningful and stable. See
// VillageLayout below and VillageScene's arrange mode.

export const LANDMARK_IDS = ['forest', 'home', 'projects', 'archive', 'places', 'people'] as const
export type LandmarkId = typeof LANDMARK_IDS[number]
/** Custom x/y per landmark, only for the ones a user has actually dragged —
 *  anything missing falls back to its default position below. */
export type VillageLayout = Partial<Record<LandmarkId, { x: number; y: number }>>

export interface Slot {
  id: string
  x: number
  y: number
  scale: number
  /** Drawn first, smaller and higher, to read as further away. */
  back: boolean
}

interface Band {
  x0: number
  x1: number
  /** How many fit across the front before anything is pushed back. */
  front: number
  cap: number
  /** Vertical jitter range, so a row never looks like a row. */
  jitter: number
}

const FOREST: Band = { x0: 40, x1: 360, front: 10, cap: 28, jitter: 26 }
const DISTRICT: Band = { x0: 430, x1: 780, front: 6, cap: 16, jitter: 20 }
// Full-width, single band — the relationships garden isn't split into two
// districts the way habits/tasks are, so it gets the whole canvas to itself.
const GARDEN: Band = { x0: 50, x1: 750, front: 12, cap: 30, jitter: 24 }

// Past about eight of a thing, everything shrinks a little so the extra ones
// have somewhere to go. Floored, because a village of specks is worse than a
// village that admits it's full.
function densityScale(n: number): number {
  return Math.max(0.55, Math.min(1, 1 - (n - 8) * 0.03))
}

function slotsIn(band: Band, ids: string[], groundY: number): Slot[] {
  // Sorted by hash rather than by the array's own order, which is created_at.
  // With creation order, deleting the third habit shifted every plant after it
  // and the whole forest rearranged itself over one deletion. Sorting by hash
  // makes position a function of the SET of ids: adding or removing one moves
  // only its immediate neighbours.
  //
  // It can't be made perfectly stable without storing placement, which is the
  // one thing the village is not allowed to do.
  const ordered = [...ids].sort((a, b) => hashPos(a) - hashPos(b)).slice(0, band.cap)
  const width = band.x1 - band.x0
  const backCount = Math.max(0, ordered.length - band.front)

  return ordered.map((id, idx) => {
    const back = idx >= band.front
    // Scaled by how full THIS row is, not by the total. Scaling both rows by
    // the total squeezed a comfortable ten-item front row down to the floor
    // just because there was a crowd behind it.
    const scale = densityScale(back ? backCount : Math.min(ordered.length, band.front))
    // Each row spreads across the full band on its own, so the back row fills
    // the gaps rather than hiding directly behind the front one.
    const inRow = back ? idx - band.front : idx
    const rowCount = back ? Math.max(1, ordered.length - band.front) : Math.min(ordered.length, band.front)
    const spread = rowCount === 1 ? 0.5 : inRow / (rowCount - 1)
    // Hash jitters within the slot; the slot itself is evenly spaced. Purely
    // hashed x would clump, purely even x would look planted by a machine.
    const x = band.x0 + (spread * 0.82 + hashPos(id) * 0.18) * width

    return {
      id,
      x,
      y: groundY - (back ? 22 : 5) + hashPos(id + 'y') * band.jitter * (back ? 0.5 : 1),
      scale: scale * (back ? 0.62 : 1),
      back,
    }
  })
}

export function forestSlots(ids: string[], groundY: number): Slot[] {
  return slotsIn(FOREST, ids, groundY)
}

export function districtSlots(ids: string[], groundY: number): Slot[] {
  return slotsIn(DISTRICT, ids, groundY)
}

// Relationships-as-a-scene (2026-08-21) reuses this same placement math —
// same reasoning applies unchanged: deterministic by id, no stored
// positions, density scales down before anything gets dropped.
export function gardenSlots(ids: string[], groundY: number): Slot[] {
  return slotsIn(GARDEN, ids, groundY)
}

export const FOREST_CAP = FOREST.cap
export const DISTRICT_CAP = DISTRICT.cap
export const GARDEN_CAP = GARDEN.cap
