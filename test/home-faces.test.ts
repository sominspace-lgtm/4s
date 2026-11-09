import { describe, expect, it } from 'vitest'
import { binLineFor, partOfDayOf } from '@/lib/home/faces'

// Sunday 2026-11-08; trash goes out Monday (1).
const at = (day: number, hour: number) => new Date(2026, 10, 8 + day, hour, 0)

describe('home screen lines', () => {
  it('splits the day the same way the village does', () => {
    expect(partOfDayOf(at(0, 3))).toBe('night')
    expect(partOfDayOf(at(0, 8))).toBe('morning')
    expect(partOfDayOf(at(0, 14))).toBe('day')
    expect(partOfDayOf(at(0, 19))).toBe('evening')
    expect(partOfDayOf(null)).toBe('day')
  })

  it('says bins out the evening before and the morning of', () => {
    expect(binLineFor({ trash: 1 }, at(0, 19))).toBe('Bins out tonight')
    expect(binLineFor({ trash: 1 }, at(1, 8))).toBe('Bins out this morning')
    expect(binLineFor({ trash: 1 }, at(0, 14))).toBeNull()
    expect(binLineFor({}, at(0, 19))).toBeNull()
    expect(binLineFor({ trash: 1 }, null)).toBeNull()
  })
})
