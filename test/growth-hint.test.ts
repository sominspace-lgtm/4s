import { describe, it, expect } from 'vitest'
import { completionsToNextStage } from '@/lib/village/state'

const days = (n: number) => [...Array(n)].map((_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`)

describe('completionsToNextStage', () => {
  it('counts toward each threshold', () => {
    expect(completionsToNextStage(days(0))).toBe(1)   // seed -> sprout
    expect(completionsToNextStage(days(1))).toBe(3)   // sprout -> plant (4)
    expect(completionsToNextStage(days(3))).toBe(1)
    expect(completionsToNextStage(days(4))).toBe(8)   // plant -> young (12)
    expect(completionsToNextStage(days(11))).toBe(1)
    expect(completionsToNextStage(days(12))).toBe(18) // young -> tree (30)
    expect(completionsToNextStage(days(29))).toBe(1)
  })

  it('returns null once fully grown, never a negative countdown', () => {
    expect(completionsToNextStage(days(30))).toBeNull()
    expect(completionsToNextStage(days(80))).toBeNull()
  })
})
