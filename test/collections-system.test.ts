import { describe, it, expect } from 'vitest'
import { SYSTEM_SPECS, ideaToCells, ideaPatch, watchToCells, watchPatch, isCore } from '@/lib/collections/system'
import type { DateIdea } from '@/lib/hooks/useDateIdeas'
import type { WatchlistItem } from '@/lib/hooks/useWatchlist'

const idea: DateIdea = {
  id: 'i1', space_id: 's', title: 'Sunset picnic', status: 'planned', energy: 'light', place_id: 'p9',
  tags: ['beach', 'cheap'], notes: 'bring a blanket', area: 'Monterey', price_range: '$$', indoor_outdoor: 'outdoor',
  category: 'cheap', photo_path: null, created_at: '', updated_at: '', extras: { rating: 4 },
}

describe('date idea mapping', () => {
  it('shows table columns as friendly cells and keeps your own columns', () => {
    const c = ideaToCells(idea)
    expect(c).toMatchObject({
      title: 'Sunset picnic', status: 'Planned', category: 'Cheap', energy: 'Light', price: '$$',
      setting: 'Outdoor', place: 'p9', tags: 'beach, cheap', notes: 'bring a blanket', area: 'Monterey', rating: 4,
    })
  })
  it('maps an edited cell back to the real column', () => {
    expect(ideaPatch('status', 'Done')).toEqual({ status: 'done' })
    expect(ideaPatch('category', '$$$')).toEqual({ category: 'splurge' })
    expect(ideaPatch('category', null)).toEqual({ category: null })
    expect(ideaPatch('energy', 'Deep')).toEqual({ energy: 'deep' })
    expect(ideaPatch('setting', 'Either')).toEqual({ indoor_outdoor: 'either' })
    expect(ideaPatch('tags', ' a, b ,, c')).toEqual({ tags: ['a', 'b', 'c'] })
    expect(ideaPatch('notes', '')).toEqual({ notes: null })
  })
  it('returns null for a column you added (it goes in extras)', () => {
    expect(ideaPatch('rating', 5)).toBeNull()
  })
  it('every select option round-trips', () => {
    for (const p of SYSTEM_SPECS.date_ideas.core.filter(c => c.type === 'select')) {
      for (const o of p.options ?? []) {
        const patch = ideaPatch(p.id, o)!
        expect(patch).toBeTruthy()
        const back = ideaToCells({ ...idea, ...patch } as DateIdea)[p.id]
        expect(back).toBe(o)
      }
    }
  })
})

describe('watchlist mapping', () => {
  const item: WatchlistItem = { id: 'w1', space_id: 's', domain: 'media', title: 'Severance', subtype: 'Show', status: 'watching', created_at: '', updated_at: '', extras: { where: 'Apple TV' } }
  it('maps cells both ways', () => {
    expect(watchToCells(item)).toEqual({ where: 'Apple TV', title: 'Severance', type: 'Show', status: 'In progress' })
    expect(watchPatch('status', 'Finished')).toEqual({ status: 'finished' })
    expect(watchPatch('status', 'Want to')).toEqual({ status: 'watchlist' })
    expect(watchPatch('type', '')).toEqual({ subtype: null })
    expect(watchPatch('where', 'x')).toBeNull()
  })
  it('knows which columns are built in', () => {
    expect(isCore('movies', 'status')).toBe(true)
    expect(isCore('movies', 'where')).toBe(false)
  })
})
