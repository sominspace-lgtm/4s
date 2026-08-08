import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { Habit } from '@/lib/hooks/useHabits'
import type { WorkItem } from '@/lib/hooks/useWorkItems'
import { taskStage } from '@/lib/utils/taskStage'

// The village is a PURE FUNCTION of your real data. There is no stored
// village, no placement table, nothing the user arranges by hand.
//
// That constraint is the whole product thesis, not a shortcut: the moment
// someone can decorate or rearrange, the village stops being evidence of a
// life lived and becomes a game you can win by playing the game. Every
// visible thing here got there because something happened off-screen.

export type PlantStage = 'seed' | 'sprout' | 'plant' | 'young' | 'tree'

const STAGE_ORDER: PlantStage[] = ['seed', 'sprout', 'plant', 'young', 'tree']

export interface Plant {
  id: string
  name: string
  /** Highest stage ever reached. NEVER decreases — see dormant. */
  stage: PlantStage
  /** True when untended ~14d. A filter over `stage`, not a demotion. */
  dormant: boolean
  category: string | null
}

export interface Building {
  id: string
  title: string
  phase: 'blueprint' | 'foundation' | 'construction' | 'complete' | 'landmark'
}

export interface VillageState {
  plants: Plant[]
  buildings: Building[]
  /** Flowers brought in from BloomScan. Empty until that's connected. */
  flowers: { id: string; name: string }[]
  /** Rings on the Life Tree — one per year of use. */
  treeRings: number
  /** Calm-water score 0..1 for Rest Lake: recent reflection/rest activity. */
  stillness: number
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night'
  isEmpty: boolean
}

// A plant's stage comes from how many times it's actually been watered —
// i.e. how many times you did the real thing. Thresholds are deliberately
// gentle at the start (3 completions already shows visible growth) because
// the first week is when someone decides whether this is worth keeping.
function stageFor(count: number): PlantStage {
  if (count >= 30) return 'tree'
  if (count >= 12) return 'young'
  if (count >= 4) return 'plant'
  if (count >= 1) return 'sprout'
  return 'seed'
}

export function plantFor(habit: Habit, completions: string[]): Plant {
  // Peak, not recent: stage is computed from ALL-TIME completions so a plant
  // can never shrink. A quiet fortnight desaturates it (dormant) but the
  // thing you built stays exactly as big as you built it. This is the single
  // rule that makes the product structurally incapable of producing guilt.
  const stage = stageFor(completions.length)
  const mostRecent = completions.length
    ? completions.map(d => parseISO(d)).sort((a, b) => +b - +a)[0]
    : null
  const daysSince = mostRecent ? differenceInCalendarDays(new Date(), mostRecent) : Infinity
  return {
    id: habit.id,
    name: habit.name,
    stage,
    dormant: habit.paused || daysSince > 14,
    category: habit.category,
  }
}

function phaseFor(item: WorkItem): Building['phase'] {
  const s = taskStage(item)
  if (s === 'landmark') return 'landmark'
  if (s === 'completed') return 'complete'
  if (item.status === 'in-progress') return 'construction'
  return item.due_date ? 'foundation' : 'blueprint'
}

// Only work substantial enough to be a *building* shows in the district.
// A completed errand is not a monument; if everything were a building the
// skyline would say nothing about you. Deep work, in-progress work, and
// earned landmarks qualify.
function isBuildingWorthy(item: WorkItem): boolean {
  if (taskStage(item) === 'landmark') return true
  if (item.status === 'done') return false
  return item.energy === 'deep' || item.status === 'in-progress'
}

export function seasonOf(d: Date): VillageState['season'] {
  const m = d.getMonth()
  if (m <= 1 || m === 11) return 'winter'
  if (m <= 4) return 'spring'
  if (m <= 7) return 'summer'
  return 'autumn'
}

export function timeOfDayOf(d: Date): VillageState['timeOfDay'] {
  const h = d.getHours()
  if (h < 7) return 'night'
  if (h < 10) return 'dawn'
  if (h < 17) return 'day'
  if (h < 20) return 'dusk'
  return 'night'
}

export function buildVillage(input: {
  habits: Habit[]
  completions: Record<string, string[]>
  workItems: WorkItem[]
  reflectionDays: number
  accountCreated: Date | null
  now?: Date
}): VillageState {
  const now = input.now ?? new Date()

  const plants = input.habits.map(h => plantFor(h, input.completions[h.id] ?? []))
  const buildings = input.workItems
    .filter(isBuildingWorthy)
    .map(i => ({ id: i.id, title: i.title, phase: phaseFor(i) }))

  const years = input.accountCreated
    ? Math.max(0, Math.floor(differenceInCalendarDays(now, input.accountCreated) / 365))
    : 0

  return {
    plants,
    buildings,
    flowers: [],
    treeRings: years,
    // Rest is productive: the lake gets clearer the more you actually rest,
    // capped so it's never a metric to max out.
    stillness: Math.min(1, input.reflectionDays / 7),
    season: seasonOf(now),
    timeOfDay: timeOfDayOf(now),
    isEmpty: plants.length === 0 && buildings.length === 0,
  }
}

export const STAGE_INDEX = (s: PlantStage) => STAGE_ORDER.indexOf(s)

// Deterministic pseudo-random from an id, so a given habit/project always
// sits in the same spot. Stable placement is what makes it feel like a
// place you know rather than a chart that reshuffles on every load.
export function hashPos(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h % 1000) / 1000
}
