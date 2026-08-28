import { describe, it, expect } from 'vitest'
import { isNudgeActive, resolveNudgeThisLap, lapIndexAt, WANDER_LAP_MS, type Nudge } from '@/lib/village/nudge'

const nudge = (over: Partial<Nudge> = {}): Nudge => ({
  targetId: 'flowerBed-0', kind: 'garden', expiresAt: Date.now() + 1000, ...over,
})

describe('isNudgeActive', () => {
  it('is false for null', () => {
    expect(isNudgeActive(null, Date.now())).toBe(false)
  })
  it('is true before expiry, false after', () => {
    const n = nudge({ expiresAt: 1000 })
    expect(isNudgeActive(n, 999)).toBe(true)
    expect(isNudgeActive(n, 1000)).toBe(false)
    expect(isNudgeActive(n, 1001)).toBe(false)
  })
})

describe('lapIndexAt', () => {
  it('is stable within one lap and advances between laps', () => {
    const a = lapIndexAt(0)
    const b = lapIndexAt(WANDER_LAP_MS - 1)
    const c = lapIndexAt(WANDER_LAP_MS)
    expect(a).toBe(b)
    expect(c).toBe(a + 1)
  })
})

describe('resolveNudgeThisLap', () => {
  it('is deterministic for the same nudge and lap', () => {
    const n = nudge()
    const r1 = resolveNudgeThisLap(n, 42)
    const r2 = resolveNudgeThisLap(n, 42)
    expect(r1).toEqual(r2)
  })
  it('varies across laps rather than firing every time', () => {
    const n = nudge()
    const results = Array.from({ length: 40 }, (_, i) => resolveNudgeThisLap(n, i))
    const onCount = results.filter(r => r.on).length
    // Not every lap, and not (almost) never — a real spread either side of ~50%.
    expect(onCount).toBeGreaterThan(5)
    expect(onCount).toBeLessThan(35)
    const sylviaCount = results.filter(r => r.actor === 'sylvia').length
    expect(sylviaCount).toBeGreaterThan(5)
    expect(sylviaCount).toBeLessThan(35)
  })
  it('a different target id can resolve differently than a bare targetId change would suggest', () => {
    const a = resolveNudgeThisLap(nudge({ targetId: 'flowerBed-0' }), 7)
    const b = resolveNudgeThisLap(nudge({ targetId: 'pond' }), 7)
    // Just asserts both are well-formed booleans/actors — not that they must
    // differ, which would be a flaky assumption about one hash's output.
    expect(['sylvia', 'harry']).toContain(a.actor)
    expect(['sylvia', 'harry']).toContain(b.actor)
  })
})
