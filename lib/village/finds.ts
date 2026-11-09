import { hashPos } from './state'

// Little finds (2026-11-05, "do not make it an actual game, it should just
// feel like a game that is evolving slowly with us and we can interact and
// collect stuff"). Every few hours something small turns up somewhere in the
// village: a feather, an acorn, a letter. Tap it to keep it. Everything you
// keep goes into a shared collection, and as the collection grows the
// village slowly grows too. No score, no prices, nothing to lose.
//
// Doing everyday things in 4S (habits, chores, Somi's care, the check-in)
// brings the next find sooner, and a really good day can turn up a gold star.

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const FIND_KINDS = [
  'donut', 'feather', 'letter', 'pebble', 'tulip', 'clover', 'shell', 'strawberry',
  'acorn', 'leaf', 'mushroom', 'pinecone', 'mitten', 'star',
] as const
export type FindKind = typeof FIND_KINDS[number]

export const FIND_INFO: Record<FindKind, { name: string; seasons: Season[] | 'all' | 'rare' }> = {
  donut: { name: 'A donut', seasons: 'all' },
  feather: { name: 'A feather', seasons: 'all' },
  letter: { name: 'A little letter', seasons: 'all' },
  pebble: { name: 'A heart pebble', seasons: 'all' },
  tulip: { name: 'A tulip', seasons: ['spring'] },
  clover: { name: 'A four-leaf clover', seasons: ['spring', 'summer'] },
  shell: { name: 'A seashell', seasons: ['summer'] },
  strawberry: { name: 'A strawberry', seasons: ['summer'] },
  acorn: { name: 'An acorn', seasons: ['autumn'] },
  leaf: { name: 'A maple leaf', seasons: ['autumn'] },
  mushroom: { name: 'A mushroom', seasons: ['autumn'] },
  pinecone: { name: 'A pinecone', seasons: ['winter'] },
  mitten: { name: 'A lost mitten', seasons: ['winter'] },
  star: { name: 'A gold star', seasons: 'rare' },
}

export interface Find { id: string; kind: FindKind; spot: number }
export interface FindsState {
  /** Everything picked up, oldest first. */
  kept: { kind: FindKind; at: string }[]
  /** Finds lying in the village right now. */
  waiting: Find[]
  /** When the next one turns up. */
  nextAt: string
}

/** How many open-ground spots a find can sit on (VillageScene's FIND_SPOTS). */
export const SPOT_COUNT = 10
export const MAX_WAITING = 3
const BASE_HOURS = 6
/** A day with this many things done can turn up a gold star. */
export const GOOD_DAY = 4

/** Hours until the next find: 6 on a quiet day, down to 2 on a full one. */
export function hoursBetween(thingsDone: number): number {
  return BASE_HOURS / (1 + 0.25 * Math.min(Math.max(0, thingsDone), 8))
}

export function newFinds(now: Date): FindsState {
  // The first one is there straight away, as a hello.
  return { kept: [], waiting: [], nextAt: now.toISOString() }
}

function kindFor(seed: string, season: Season, thingsDone: number): FindKind {
  if (thingsDone >= GOOD_DAY && hashPos(seed + 'star') < 0.15) return 'star'
  const pool = FIND_KINDS.filter(k => {
    const s = FIND_INFO[k].seasons
    return s === 'all' || (Array.isArray(s) && s.includes(season))
  })
  return pool[Math.floor(hashPos(seed) * pool.length) % pool.length]
}

/** Lets time pass: adds any finds that are due. Returns null when nothing changed. */
export function advance(s: FindsState, now: Date, season: Season, thingsDone: number): FindsState | null {
  const stepMs = hoursBetween(thingsDone) * 3_600_000
  let next = new Date(s.nextAt).getTime()
  if (now.getTime() < next) return null
  const waiting = [...s.waiting]
  while (next <= now.getTime() && waiting.length < MAX_WAITING) {
    const seed = new Date(next).toISOString()
    const used = new Set(waiting.map(w => w.spot))
    let spot = Math.floor(hashPos(seed + 'spot') * SPOT_COUNT) % SPOT_COUNT
    while (used.has(spot)) spot = (spot + 1) % SPOT_COUNT
    waiting.push({ id: seed, kind: kindFor(seed, season, thingsDone), spot })
    next += stepMs
  }
  // A full village doesn't bank finds for later; the clock restarts once there's room.
  if (waiting.length >= MAX_WAITING && next <= now.getTime()) next = now.getTime() + stepMs
  return { ...s, waiting, nextAt: new Date(next).toISOString() }
}

export function pick(s: FindsState, id: string, now: Date): { next: FindsState; kind: FindKind } | null {
  const f = s.waiting.find(w => w.id === id)
  if (!f) return null
  return {
    next: { ...s, waiting: s.waiting.filter(w => w.id !== id), kept: [...s.kept, { kind: f.kind, at: now.toISOString() }] },
    kind: f.kind,
  }
}

/** One new thing grows in the village for every few finds kept. */
export const FINDS_PER_GROWTH = 4
export function grownCount(kept: number): number {
  return Math.floor(kept / FINDS_PER_GROWTH)
}

/** Reads a saved blob defensively; anything else (like the old donut save) starts fresh. */
export function parseFinds(raw: unknown, now: Date): FindsState {
  const r = raw as Partial<FindsState> | null
  if (!r || typeof r !== 'object' || !Array.isArray(r.kept) || typeof r.nextAt !== 'string' || Number.isNaN(Date.parse(r.nextAt))) return newFinds(now)
  const isKind = (k: unknown): k is FindKind => typeof k === 'string' && (FIND_KINDS as readonly string[]).includes(k)
  return {
    kept: r.kept.filter(k => k && isKind(k.kind) && typeof k.at === 'string').map(k => ({ kind: k.kind, at: k.at })),
    waiting: (Array.isArray(r.waiting) ? r.waiting : [])
      .filter(w => w && typeof w.id === 'string' && isKind(w.kind) && Number.isInteger(w.spot) && w.spot >= 0 && w.spot < SPOT_COUNT)
      .slice(0, MAX_WAITING),
    nextAt: r.nextAt,
  }
}
