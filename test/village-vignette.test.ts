import { describe, it, expect } from 'vitest'
import { dateKeyOf, vignetteVariant } from '@/lib/village/vignette'

describe('dateKeyOf', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(dateKeyOf(new Date(2026, 7, 28))).toBe('2026-08-28') // month is 0-indexed
  })
  it('pads single-digit month/day', () => {
    expect(dateKeyOf(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('vignetteVariant', () => {
  it('is deterministic for the same date/bucket/slot', () => {
    const a = vignetteVariant('2026-08-28', 'dawn', 'home-x')
    const b = vignetteVariant('2026-08-28', 'dawn', 'home-x')
    expect(a).toBe(b)
  })
  it('is in [0, 1)', () => {
    const v = vignetteVariant('2026-08-28', 'dusk', 'shadow-len')
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  })
  it('varies across different days for the same slot', () => {
    const days = Array.from({ length: 30 }, (_, i) => vignetteVariant(`2026-08-${String(i + 1).padStart(2, '0')}`, 'dawn', 'home-x'))
    const distinct = new Set(days)
    // Not every day identical — real day-to-day spread.
    expect(distinct.size).toBeGreaterThan(5)
  })
  it('varies across different slots for the same day', () => {
    const a = vignetteVariant('2026-08-28', 'dawn', 'home-x')
    const b = vignetteVariant('2026-08-28', 'dawn', 'home-y')
    expect(a).not.toBe(b)
  })
})
