import { describe, it, expect } from 'vitest'
import { routineStreak, withToday } from '@/lib/routines/streak'

const now = new Date(2026, 9, 19, 9) // Oct 19, morning

describe('routineStreak', () => {
  it('counts a run of days, today not done yet is fine', () => {
    expect(routineStreak(['2026-10-18', '2026-10-17', '2026-10-16'], now)).toEqual({ days: 3, paused: false })
  })
  it('a missed day pauses rather than breaks', () => {
    // Done 15, 16, 17; missed 18; today not yet.
    expect(routineStreak(['2026-10-17', '2026-10-16', '2026-10-15'], now)).toEqual({ days: 3, paused: true })
    // Done again today after missing the 18th: it carries on.
    expect(routineStreak(['2026-10-19', '2026-10-17', '2026-10-16', '2026-10-15'], now)).toEqual({ days: 4, paused: false })
  })
  it('three missed days in a row starts over', () => {
    expect(routineStreak(['2026-10-15', '2026-10-14'], now)).toEqual({ days: 0, paused: false })
    expect(routineStreak(['2026-10-19', '2026-10-14', '2026-10-13'], now)).toEqual({ days: 1, paused: false })
  })
  it('nothing done', () => expect(routineStreak([], now)).toEqual({ days: 0, paused: false }))
})

describe('withToday', () => {
  it('adds today once, newest first', () => {
    expect(withToday(['2026-10-18'], now)).toEqual(['2026-10-19', '2026-10-18'])
    expect(withToday(['2026-10-19', '2026-10-18'], now)).toEqual(['2026-10-19', '2026-10-18'])
  })
})
