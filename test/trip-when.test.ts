import { describe, it, expect } from 'vitest'
import { tripWhen } from '@/lib/trips/when'

const today = new Date(2026, 9, 16, 12)

describe('tripWhen', () => {
  it('no dates', () => expect(tripWhen(null, null, today).phase).toBe('undated'))
  it('counts down', () => {
    expect(tripWhen('2026-10-17', '2026-10-20', today)).toMatchObject({ phase: 'upcoming', label: 'Tomorrow', nights: 3 })
    expect(tripWhen('2026-11-15', null, today).label).toBe('In 30 days')
    expect(tripWhen('2027-04-01', '2027-04-10', today).label).toBe('In 24 weeks')
  })
  it('knows which day of the trip it is', () => {
    expect(tripWhen('2026-10-14', '2026-10-20', today)).toMatchObject({ phase: 'now', label: 'Day 3 of 7' })
  })
  it('looks back', () => {
    expect(tripWhen('2026-10-01', '2026-10-10', today)).toMatchObject({ phase: 'past', label: '6 days ago' })
  })
  it('writes the range plainly', () => {
    expect(tripWhen('2027-04-01', '2027-04-10', today).range).toBe('Apr 1 to 10, 2027')
    expect(tripWhen('2026-12-28', '2027-01-03', today).range).toBe('Dec 28, 2026 to Jan 3, 2027')
  })
})
