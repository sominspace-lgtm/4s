import { describe, it, expect } from 'vitest'
import { mergeCareTasks, careDue, type CareTaskRow } from '@/lib/utils/careTypes'

describe('mergeCareTasks', () => {
  it('shows built-ins when nothing is saved', () => {
    const t = mergeCareTasks('somi', [], [])
    expect(t[0]).toMatchObject({ kind: 'litter', id: null, builtin: true })
  })
  it('a saved row renames and reorders, and is not listed twice', () => {
    const rows: CareTaskRow[] = [{ id: 'r1', subject: 'somi', kind: 'nails', label: 'Nails', detail: null, every_days: 14, position: 0, hidden: false }]
    const t = mergeCareTasks('somi', rows, [])
    expect(t[0]).toMatchObject({ kind: 'nails', label: 'Nails', every_days: 14 })
    expect(t.filter(x => x.kind === 'nails')).toHaveLength(1)
  })
  it('keeps hand-logged kinds', () => {
    expect(mergeCareTasks('somi', [], ['Brushed teeth']).some(x => x.kind === 'Brushed teeth')).toBe(true)
  })
})

describe('careDue', () => {
  const now = new Date(2026, 9, 16, 12)
  it('no rhythm, no due date', () => expect(careDue(null, '2026-10-01T10:00:00Z', now)).toBeNull())
  it('never done is due now', () => expect(careDue(7, null, now)).toBe(0))
  it('counts down and goes overdue', () => {
    expect(careDue(7, new Date(2026, 9, 14, 9).toISOString(), now)).toBe(5)
    expect(careDue(2, new Date(2026, 9, 10, 9).toISOString(), now)).toBe(-4)
  })
})
