import { describe, it, expect } from 'vitest'
import { zoned, wallClock, freeSlots, addDaysYmd } from '@/lib/jarvis/time'

const TZ = 'America/Los_Angeles'

describe('zoned / wallClock', () => {
  it('turns Pacific wall time into the right instant, both sides of daylight saving', () => {
    expect(zoned('2026-10-20', '09:00', TZ).toISOString()).toBe('2026-10-20T16:00:00.000Z')
    expect(zoned('2026-12-01', '09:00', TZ).toISOString()).toBe('2026-12-01T17:00:00.000Z')
  })
  it('reads an instant back as Pacific wall time', () => {
    expect(wallClock(new Date('2026-10-20T16:30:00Z'), TZ)).toMatchObject({ date: '2026-10-20', time: '09:30', weekday: 'Tuesday' })
  })
  it('adds days', () => expect(addDaysYmd('2026-10-31', 1)).toBe('2026-11-01'))
})

describe('freeSlots', () => {
  const now = new Date('2026-10-18T00:00:00Z')
  it('finds the gaps around busy blocks', () => {
    const busy = [
      { start: zoned('2026-10-20', '09:00', TZ).toISOString(), end: zoned('2026-10-20', '12:00', TZ).toISOString() },
      { start: zoned('2026-10-20', '13:00', TZ).toISOString(), end: zoned('2026-10-20', '18:00', TZ).toISOString() },
    ]
    const s = freeSlots(busy, { fromDate: '2026-10-20', toDate: '2026-10-20', minutes: 60, earliest: '08:00', latest: '21:00', now, tz: TZ })
    expect(s).toEqual([
      { date: '2026-10-20', start: '08:00', end: '09:00' },
      { date: '2026-10-20', start: '12:00', end: '13:00' },
      { date: '2026-10-20', start: '18:00', end: '21:00' },
    ])
  })
  it('skips gaps that are too short and days not asked for', () => {
    const busy = [{ start: zoned('2026-10-20', '08:30', TZ).toISOString(), end: zoned('2026-10-20', '21:00', TZ).toISOString() }]
    expect(freeSlots(busy, { fromDate: '2026-10-20', toDate: '2026-10-20', minutes: 60, now, tz: TZ })).toEqual([])
    // 2026-10-24 is a Saturday (6); only Saturdays allowed.
    const sat = freeSlots([], { fromDate: '2026-10-20', toDate: '2026-10-25', minutes: 90, weekdays: [6], now, tz: TZ })
    expect(sat.map(x => x.date)).toEqual(['2026-10-24'])
  })
  it('never offers time already past', () => {
    const later = zoned('2026-10-20', '15:10', TZ)
    const s = freeSlots([], { fromDate: '2026-10-20', toDate: '2026-10-20', minutes: 60, now: later, tz: TZ })
    expect(s[0]).toEqual({ date: '2026-10-20', start: '15:15', end: '21:00' })
  })
})
