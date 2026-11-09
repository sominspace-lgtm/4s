import { describe, expect, it } from 'vitest'
import { newFinds, advance, pick, parseFinds, grownCount, hoursBetween, MAX_WAITING, FIND_INFO, GOOD_DAY } from '@/lib/village/finds'

const t0 = new Date('2026-11-05T10:00:00Z')
const later = (h: number) => new Date(t0.getTime() + h * 3_600_000)

describe('village finds', () => {
  it('puts a first find out straight away', () => {
    const s = advance(newFinds(t0), t0, 'autumn', 0)!
    expect(s.waiting).toHaveLength(1)
  })

  it('does nothing before the next find is due', () => {
    const s = advance(newFinds(t0), t0, 'autumn', 0)!
    expect(advance(s, later(1), 'autumn', 0)).toBeNull()
  })

  it('never has more than three lying around, on different spots', () => {
    const s = advance(newFinds(t0), later(100), 'autumn', 0)!
    expect(s.waiting).toHaveLength(MAX_WAITING)
    expect(new Set(s.waiting.map(w => w.spot)).size).toBe(MAX_WAITING)
    expect(new Date(s.nextAt).getTime()).toBeGreaterThan(later(100).getTime())
  })

  it('brings finds sooner on a busy day', () => {
    expect(hoursBetween(0)).toBe(6)
    expect(hoursBetween(8)).toBe(2)
    expect(hoursBetween(99)).toBe(2)
  })

  it('only turns up things that fit the season, plus the rare star', () => {
    const s = advance(newFinds(t0), later(100), 'winter', 0)!
    for (const w of s.waiting) {
      const seasons = FIND_INFO[w.kind].seasons
      expect(seasons === 'all' || (Array.isArray(seasons) && seasons.includes('winter'))).toBe(true)
    }
  })

  it('turns up a gold star only on a good day', () => {
    const kinds = (things: number) => {
      const seen = new Set<string>()
      let s = newFinds(t0)
      for (let i = 0; i < 120; i++) {
        s = advance(s, later(i * 6), 'spring', things) ?? s
        for (const w of s.waiting) { seen.add(w.kind); s = pick(s, w.id, later(i * 6))!.next }
      }
      return seen
    }
    expect(kinds(0).has('star')).toBe(false)
    expect(kinds(GOOD_DAY).has('star')).toBe(true)
  })

  it('keeps what you pick up', () => {
    const s = advance(newFinds(t0), t0, 'spring', 0)!
    const r = pick(s, s.waiting[0].id, later(1))!
    expect(r.next.waiting).toHaveLength(0)
    expect(r.next.kept).toEqual([{ kind: r.kind, at: later(1).toISOString() }])
    expect(pick(r.next, 'nope', later(1))).toBeNull()
  })

  it('grows the village every four finds', () => {
    expect(grownCount(3)).toBe(0)
    expect(grownCount(4)).toBe(1)
    expect(grownCount(9)).toBe(2)
  })

  it('starts fresh from the old donut save or junk', () => {
    expect(parseFinds({ donuts: 40, collectedAt: t0.toISOString(), levels: {} }, t0)).toEqual(newFinds(t0))
    expect(parseFinds(null, t0)).toEqual(newFinds(t0))
    const ok = parseFinds({ kept: [{ kind: 'acorn', at: 'x' }, { kind: 'bogus', at: 'x' }], waiting: [{ id: 'a', kind: 'shell', spot: 99 }], nextAt: t0.toISOString() }, t0)
    expect(ok.kept).toEqual([{ kind: 'acorn', at: 'x' }])
    expect(ok.waiting).toEqual([])
  })
})
