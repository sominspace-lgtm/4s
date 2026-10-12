// The household's Reference lists as collections (2026-10-12). Date ideas,
// movies and shows, and games are now shown with the same table/board views
// as any collection, but their rows still live in their original tables
// (date_ideas, household_watchlist). That keeps everything built on them
// working: the pin hearts and "save as a date idea" in Places, the Village
// markers, the guest wall, and the Discord /track command.
//
// A row's built-in columns map to the table's real columns; any column you add
// yourself is stored in that row's `extras` jsonb. This file is the mapping.

import type { CollectionProp, CellValue } from '@/lib/hooks/useCollections'
import type { DateIdea, DateIdeaStatus, DateIdeaCategory, PriceRange } from '@/lib/hooks/useDateIdeas'
import type { WatchlistItem, WatchlistStatus } from '@/lib/hooks/useWatchlist'

export type SystemKey = 'date_ideas' | 'movies' | 'games'

export interface SystemSpec {
  key: SystemKey
  name: string
  blurb: string
  core: CollectionProp[]
  view: 'table' | 'board'
  boardProp: string
}

const select = (id: string, name: string, options: string[]): CollectionProp => ({ id, name, type: 'select', options })

const IDEA_STATUS: Record<DateIdeaStatus, string> = { idea: 'Idea', planned: 'Planned', done: 'Done' }
const IDEA_CATEGORY: Record<DateIdeaCategory, string> = { home: 'At home', cheap: 'Cheap', splurge: '$$$' }
const ENERGY: Record<string, string> = { light: 'Light', medium: 'Medium', deep: 'Deep' }
const SETTING: Record<string, string> = { indoor: 'Indoor', outdoor: 'Outdoor', either: 'Either' }
const WATCH_STATUS: Record<WatchlistStatus, string> = { watchlist: 'Want to', watching: 'In progress', finished: 'Finished', dropped: 'Dropped' }

const invert = <K extends string>(m: Record<K, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k])) as Record<string, K>
const IDEA_STATUS_BACK = invert(IDEA_STATUS)
const IDEA_CATEGORY_BACK = invert(IDEA_CATEGORY)
const ENERGY_BACK = invert(ENERGY)
const SETTING_BACK = invert(SETTING)
const WATCH_STATUS_BACK = invert(WATCH_STATUS)

const watchCore = (noun: string): CollectionProp[] => [
  { id: 'title', name: noun, type: 'text' },
  { id: 'type', name: 'Type', type: 'text' },
  select('status', 'Status', Object.values(WATCH_STATUS)),
]

export const SYSTEM_SPECS: Record<SystemKey, SystemSpec> = {
  date_ideas: {
    key: 'date_ideas', name: 'Date ideas', view: 'board', boardProp: 'status',
    blurb: 'Things to do together, from cheap to special.',
    core: [
      { id: 'title', name: 'Idea', type: 'text' },
      select('status', 'Status', Object.values(IDEA_STATUS)),
      select('category', 'Kind', Object.values(IDEA_CATEGORY)),
      { id: 'area', name: 'Area', type: 'text' },
      select('energy', 'Energy', Object.values(ENERGY)),
      select('price', 'Price', ['$', '$$', '$$$', '$$$$']),
      select('setting', 'Setting', Object.values(SETTING)),
      { id: 'place', name: 'Pin', type: 'place' },
      { id: 'tags', name: 'Tags', type: 'text' },
      { id: 'notes', name: 'Notes', type: 'text' },
      { id: 'photo', name: 'Photo', type: 'image' },
    ],
  },
  movies: {
    key: 'movies', name: 'Movies and shows', view: 'board', boardProp: 'status',
    blurb: 'What to watch, what you are watching, what you finished.',
    core: watchCore('Title'),
  },
  games: {
    key: 'games', name: 'Games', view: 'board', boardProp: 'status',
    blurb: 'The backlog.',
    core: watchCore('Game'),
  },
}

export const SYSTEM_KEYS: SystemKey[] = ['date_ideas', 'movies', 'games']

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const str = (v: CellValue): string => (v == null ? '' : String(v))

// --- date ideas -----------------------------------------------------------------
export function ideaToCells(i: DateIdea): Record<string, CellValue> {
  return {
    ...(i.extras ?? {}),
    title: i.title,
    status: IDEA_STATUS[i.status] ?? null,
    category: i.category ? IDEA_CATEGORY[i.category] : null,
    area: i.area,
    energy: i.energy ? ENERGY[i.energy] : null,
    price: i.price_range,
    setting: i.indoor_outdoor ? SETTING[i.indoor_outdoor] : null,
    place: i.place_id,
    tags: (i.tags ?? []).join(', ') || null,
    notes: i.notes,
    photo: i.photo_path,
  }
}

/** The table-column patch for one edited built-in cell, or null if `propId` is one of your own columns. */
export function ideaPatch(propId: string, v: CellValue): Partial<Pick<DateIdea, 'title' | 'status' | 'category' | 'area' | 'energy' | 'price_range' | 'indoor_outdoor' | 'place_id' | 'tags' | 'notes' | 'photo_path'>> | null {
  switch (propId) {
    case 'title': return { title: str(v) }
    case 'status': return { status: (v ? IDEA_STATUS_BACK[str(v)] : 'idea') ?? 'idea' }
    case 'category': return { category: v ? (IDEA_CATEGORY_BACK[str(v)] ?? null) : null }
    case 'area': return { area: text(v) }
    case 'energy': return { energy: v ? ((ENERGY_BACK[str(v)] as DateIdea['energy']) ?? null) : null }
    case 'price': return { price_range: v ? (str(v) as PriceRange) : null }
    case 'setting': return { indoor_outdoor: v ? ((SETTING_BACK[str(v)] as DateIdea['indoor_outdoor']) ?? null) : null }
    case 'place': return { place_id: text(v) }
    case 'tags': return { tags: str(v).split(',').map(t => t.trim()).filter(Boolean) }
    case 'notes': return { notes: text(v) }
    case 'photo': return { photo_path: text(v) }
    default: return null
  }
}

// --- movies and games --------------------------------------------------------------
export function watchToCells(i: WatchlistItem): Record<string, CellValue> {
  return { ...(i.extras ?? {}), title: i.title, type: i.subtype, status: WATCH_STATUS[i.status] ?? null }
}

export function watchPatch(propId: string, v: CellValue): Partial<Pick<WatchlistItem, 'title' | 'subtype' | 'status'>> | null {
  switch (propId) {
    case 'title': return { title: str(v) }
    case 'type': return { subtype: text(v) }
    case 'status': return { status: (v ? WATCH_STATUS_BACK[str(v)] : 'watchlist') ?? 'watchlist' }
    default: return null
  }
}

/** Is this one of the built-in columns of a system collection (not renamable or removable)? */
export function isCore(key: SystemKey, propId: string): boolean {
  return SYSTEM_SPECS[key].core.some(p => p.id === propId)
}
