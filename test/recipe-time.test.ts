import { describe, it, expect } from 'vitest'
import { detectTimers, clock, minutesLabel } from '@/lib/recipes/time'
import { qtyText } from '@/lib/recipes/ingredients'

describe('detectTimers', () => {
  it('finds a single time', () => {
    expect(detectTimers('Simmer for 10 minutes until thick.')).toEqual([{ label: '10 minutes', seconds: 600 }])
  })
  it('takes the longer end of a range', () => {
    expect(detectTimers('Bake 20-25 min.')[0].seconds).toBe(1500)
  })
  it('reads hours and several times in one step', () => {
    const t = detectTimers('Rest 1 hour, then fry 3 minutes per side.')
    expect(t.map(x => x.seconds)).toEqual([3600, 180])
  })
  it('ignores things that are not times', () => {
    expect(detectTimers('Add 2 cups flour and stir.')).toEqual([])
    expect(detectTimers('Cut into 10 pieces.')).toEqual([])
  })
})

describe('formatting', () => {
  it('shows a clock', () => { expect(clock(75)).toBe('1:15'); expect(clock(3725)).toBe('1:02:05') })
  it('labels minutes', () => { expect(minutesLabel(75)).toBe('1 hr 15 min'); expect(minutesLabel(20)).toBe('20 min'); expect(minutesLabel(60)).toBe('1 hr'); expect(minutesLabel(null)).toBe('') })
  it('builds a shopping qty', () => { expect(qtyText(2, 'cup')).toBe('2 cups'); expect(qtyText(1.5, 'lb')).toBe('1 1/2 lb'); expect(qtyText(3, null)).toBe('3'); expect(qtyText(null, null)).toBe('') })
})
