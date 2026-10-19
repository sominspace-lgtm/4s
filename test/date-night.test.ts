import { describe, it, expect } from 'vitest'
import { pickable } from '@/components/household/DateNightPicker'
import type { DateIdea } from '@/lib/hooks/useDateIdeas'

const idea = (id: string, f: Partial<DateIdea>): DateIdea => ({
  id, space_id: null, title: id, status: 'idea', energy: null, place_id: null, tags: [], notes: null,
  area: null, price_range: null, indoor_outdoor: null, category: null, photo_path: null, created_at: '', updated_at: '', ...f,
} as DateIdea)

const ideas = [
  idea('picnic', { price_range: '$', energy: 'light' }),
  idea('omakase', { price_range: '$$$$', energy: 'medium' }),
  idea('hike', { energy: 'deep' }),
  idea('old', { status: 'done', price_range: '$' }),
]

describe('pickable', () => {
  it('never offers what you have done', () => expect(pickable(ideas, 'any', 'any').map(d => d.id)).toEqual(['picnic', 'omakase', 'hike']))
  it('low energy keeps the easy ones', () => expect(pickable(ideas, 'any', 'light').map(d => d.id)).toEqual(['picnic']))
  it('a treat is the pricey ones', () => expect(pickable(ideas, 'treat', 'any').map(d => d.id)).toEqual(['omakase']))
  it('free or cheap includes ideas with no price', () => expect(pickable(ideas, 'free', 'any').map(d => d.id)).toEqual(['picnic', 'hike']))
})
