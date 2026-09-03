import { differenceInCalendarDays, differenceInCalendarMonths, parseISO } from 'date-fns'
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
  /** All-time completions (waterings) — drives the tap callout. */
  waterings: number
  /** Waterings until the next stage, or null once fully grown. */
  toNextStage: number | null
}

export interface Building {
  id: string
  title: string
  phase: 'blueprint' | 'foundation' | 'construction' | 'complete' | 'landmark'
  dueDate: string | null
}

export interface VillageState {
  plants: Plant[]
  buildings: Building[]
  /** Flowers brought in from BloomScan. Empty until that's connected. */
  flowers: { id: string; name: string }[]
  /** Rings on the Life Tree — one per year of use. */
  treeRings: number
  /** Whole months since the account was made. Drives canopy. */
  accountMonths: number
  /**
   * Life Tree canopy fullness 0..1, from account age in months.
   *
   * treeRings only ticks once a YEAR, so without this a new user watches the
   * Archive Grove do nothing at all for twelve months and reasonably concludes
   * it's broken. Rings stay the milestone; canopy is the continuum underneath
   * it, moving about a pixel of radius a month — invisible day to day, obvious
   * across a season. Floored so day one is a small tree rather than a stick.
   */
  canopy: number
  /** Calm-water score 0..1 for Rest Lake: recent reflection/rest activity. */
  stillness: number
  /** The raw count behind `stillness`, carried through so the text equivalent
   *  can state it plainly rather than reverse-engineering it from a ratio. */
  reflectionDays: number
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

// Count needed to reach the NEXT stage, or null once a plant is fully grown.
// Forward-looking on purpose — this is the only direction a hint is allowed
// to point. A hint about what's about to happen ("2 more and it's a tree") is
// encouragement; the same fact phrased backward ("you're 2 short of a tree")
// is a countdown, and a countdown is a lapse warning wearing a costume.
const STAGE_THRESHOLDS = [1, 4, 12, 30]
export function completionsToNextStage(completions: string[]): number | null {
  const next = STAGE_THRESHOLDS.find(t => t > completions.length)
  return next === undefined ? null : next - completions.length
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
    // A never-watered habit is a seed waiting to start, NOT a dormant one.
    // Without the completions check, daysSince is Infinity for a brand-new
    // habit and every one of them rendered as "resting" the moment it was
    // created — telling someone they've let something lapse on the day they
    // committed to it. Dormancy has to be earned: you can only go quiet on
    // something you actually started.
    dormant: habit.paused || (completions.length > 0 && daysSince > 14),
    category: habit.category,
    waterings: completions.length,
    toNextStage: completionsToNextStage(completions),
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
    .map(i => ({ id: i.id, title: i.title, phase: phaseFor(i), dueDate: i.due_date ?? null }))

  const years = input.accountCreated
    ? Math.max(0, Math.floor(differenceInCalendarDays(now, input.accountCreated) / 365))
    : 0
  const months = input.accountCreated
    ? Math.max(0, differenceInCalendarMonths(now, input.accountCreated))
    : 0

  return {
    plants,
    buildings,
    flowers: [],
    treeRings: years,
    accountMonths: months,
    canopy: Math.max(0.35, Math.min(1, months / 18)),
    // Rest is productive: the lake gets clearer the more you actually rest,
    // capped so it's never a metric to max out.
    stillness: Math.min(1, input.reflectionDays / 7),
    reflectionDays: input.reflectionDays,
    season: seasonOf(now),
    timeOfDay: timeOfDayOf(now),
    isEmpty: plants.length === 0 && buildings.length === 0,
  }
}

export const STAGE_INDEX = (s: PlantStage) => STAGE_ORDER.indexOf(s)

export interface VillageChanges {
  grownPlantIds: string[]
  newPlantIds: string[]
  newLandmarkIds: string[]
  finishedCount: number
  seasonTurned: boolean
  /** One quiet sentence, or null when there's nothing worth saying. */
  caption: string | null
}

const EMPTY_CHANGES: VillageChanges = {
  grownPlantIds: [], newPlantIds: [], newLandmarkIds: [],
  finishedCount: 0, seasonTurned: false, caption: null,
}

/**
 * What's different since you last looked.
 *
 * No stored snapshot, and none needed. Stage is a pure function of how many
 * completions a habit has, and a completion is an immutable dated fact, so
 * filtering the completions to the ones that existed at `since` reconstructs
 * exactly what the village showed you last time. That also means it self-heals
 * if you backfill a completion later, and it can't invent a change that didn't
 * happen.
 *
 * It structurally cannot report a shrink either: a filtered list is a subset,
 * stageFor only increases with count, so `then` is always <= `now`. The
 * anti-guilt rule the whole village is built on survives the diff for free
 * rather than needing to be re-enforced here.
 */
export function villageChangesSince(input: {
  habits: Habit[]
  completions: Record<string, string[]>
  workItems: WorkItem[]
  now?: Date
}, since: Date | null): VillageChanges {
  if (!since) return EMPTY_CHANGES
  const now = input.now ?? new Date()
  // Compared as a local calendar day. A completion carries a bare date with no
  // time, so same-day is genuinely ambiguous, and this errs toward showing:
  // something you did after opening the village today still counts as growth on
  // your next visit. The opposite error swallows real growth silently, which is
  // the worse one.
  const sinceDay = formatDay(since)

  const grownPlantIds: string[] = []
  const newPlantIds: string[] = []
  for (const habit of input.habits) {
    const all = input.completions[habit.id] ?? []
    if (habit.created_at && formatDay(parseISO(habit.created_at)) >= sinceDay) {
      newPlantIds.push(habit.id)
      continue
    }
    const before = all.filter(d => d < sinceDay)
    if (STAGE_INDEX(stageFor(all.length)) > STAGE_INDEX(stageFor(before.length))) {
      grownPlantIds.push(habit.id)
    }
  }

  const newLandmarkIds: string[] = []
  let finishedCount = 0
  for (const item of input.workItems) {
    if (item.status !== 'done' || !item.completed_at) continue
    if (formatDay(parseISO(item.completed_at)) < sinceDay) continue
    if (taskStage(item) === 'landmark') newLandmarkIds.push(item.id)
    else finishedCount++
  }

  const changes: VillageChanges = {
    grownPlantIds, newPlantIds, newLandmarkIds, finishedCount,
    seasonTurned: seasonOf(since) !== seasonOf(now),
    caption: null,
  }
  changes.caption = captionFor(changes, input.habits)
  return changes
}

function formatDay(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

const COUNT_WORD = ['no', 'one', 'two', 'three']
const countWord = (n: number) => COUNT_WORD[n] ?? 'a few'

// Written here rather than in the component so there's exactly one place that
// controls the tone. Deliberately never says how long you were away, never
// gives a total, and never congratulates: it reports what happened, the way you
// would notice it walking back into a room.
function captionFor(c: VillageChanges, habits: Habit[]): string | null {
  const parts: string[] = []

  if (c.grownPlantIds.length === 1) {
    const name = habits.find(h => h.id === c.grownPlantIds[0])?.name
    parts.push(name ? `${name.toLowerCase()} grew` : 'something grew')
  } else if (c.grownPlantIds.length > 1) {
    parts.push(`${countWord(c.grownPlantIds.length)} plants grew`)
  }

  if (c.newPlantIds.length === 1) parts.push('something new was planted')
  else if (c.newPlantIds.length > 1) parts.push(`${countWord(c.newPlantIds.length)} things were planted`)

  if (c.newLandmarkIds.length === 1) parts.push('a landmark went up')
  else if (c.newLandmarkIds.length > 1) parts.push(`${countWord(c.newLandmarkIds.length)} landmarks went up`)

  if (!parts.length && c.finishedCount > 0) {
    parts.push(c.finishedCount === 1 ? 'something got finished' : `${countWord(c.finishedCount)} things got finished`)
  }

  if (c.seasonTurned) parts.push('the season turned')

  if (!parts.length) return null
  if (parts.length === 1) return `Since you were last here, ${parts[0]}.`
  return `Since you were last here, ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.`
}

// Deterministic pseudo-random from an id, so a given habit/project always
// sits in the same spot. Stable placement is what makes it feel like a
// place you know rather than a chart that reshuffles on every load.
export function hashPos(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h % 1000) / 1000
}
