import { describe, it, expect } from 'vitest'
import { villageChangesSince, STAGE_INDEX, plantFor } from '@/lib/village/state'
import type { Habit } from '@/lib/hooks/useHabits'
import type { WorkItem } from '@/lib/hooks/useWorkItems'

const habit = (id: string, created = '2020-01-01T00:00:00Z'): Habit => ({
  id, name: `Habit ${id}`, category: null, schedule_type: 'daily',
  interval_days: null, days_of_week: null, paused: false, created_at: created,
})

const done = (id: string, completedAt: string, createdAt = '2026-01-01T00:00:00Z', landmark = false): WorkItem => ({
  id, title: `Task ${id}`, notes: null, due_date: null, energy: null, domain: null,
  status: 'done', recur_days: null, shared: false,
  created_at: createdAt, completed_at: completedAt, landmark, board_column: null,
})

// A day count that puts stageFor over a threshold. Thresholds: 1, 4, 12, 30.
const days = (n: number, from = '2026-01-01') => {
  const out: string[] = []
  const start = new Date(from)
  for (let i = 0; i < n; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

describe('villageChangesSince', () => {
  const since = new Date('2026-02-01T09:00:00')
  // Pinned, and in the same season as `since`. Without this the tests read the
  // real clock, so they'd quietly start asserting "the season turned" a few
  // months after they were written.
  const now = new Date('2026-02-20T12:00:00')

  it('reports nothing on a first-ever visit', () => {
    const c = villageChangesSince({ habits: [habit('a')], completions: { a: days(10) }, workItems: [], now }, null)
    expect(c.caption).toBeNull()
    expect(c.grownPlantIds).toEqual([])
  })

  it('reports a plant that crossed a stage threshold while you were away', () => {
    // 3 completions before Feb 1 (sprout), 2 more after -> 5 total (plant).
    const completions = { a: [...days(3, '2026-01-01'), ...days(2, '2026-02-05')] }
    const c = villageChangesSince({ habits: [habit('a')], completions, workItems: [], now }, since)
    expect(c.grownPlantIds).toEqual(['a'])
    expect(c.caption).toContain('grew')
  })

  it('ignores a plant that gained completions without changing stage', () => {
    // 5 before, 6 total: both are 'plant' (threshold is 4, next is 12).
    const completions = { a: [...days(5, '2026-01-01'), ...days(1, '2026-02-05')] }
    const c = villageChangesSince({ habits: [habit('a')], completions, workItems: [], now }, since)
    expect(c.grownPlantIds).toEqual([])
    expect(c.caption).toBeNull()
  })

  it('counts a habit created after the last visit as newly planted, not grown', () => {
    const completions = { a: days(2, '2026-02-05') }
    const c = villageChangesSince(
      { habits: [habit('a', '2026-02-10T00:00:00Z')], completions, workItems: [], now }, since,
    )
    expect(c.newPlantIds).toEqual(['a'])
    expect(c.grownPlantIds).toEqual([])
  })

  it('separates landmarks from ordinary completions', () => {
    const items = [
      done('L', '2026-02-10T00:00:00Z', '2026-01-01T00:00:00Z'), // 40 days: landmark by duration
      done('x', '2026-02-10T00:00:00Z', '2026-02-09T00:00:00Z'), // 1 day: ordinary
      done('old', '2026-01-15T00:00:00Z', '2026-01-14T00:00:00Z'), // before `since`
    ]
    const c = villageChangesSince({ habits: [], completions: {}, workItems: items, now }, since)
    expect(c.newLandmarkIds).toEqual(['L'])
    expect(c.finishedCount).toBe(1)
  })

  it('notices the season turning', () => {
    const c = villageChangesSince(
      { habits: [], completions: {}, workItems: [], now: new Date('2026-05-01T12:00:00') },
      new Date('2026-02-01T12:00:00'),
    )
    expect(c.seasonTurned).toBe(true)
    expect(c.caption).toContain('season')
  })

  it('never says how long you were away, or congratulates', () => {
    const completions = { a: [...days(3, '2026-01-01'), ...days(2, '2026-02-05')] }
    const c = villageChangesSince({ habits: [habit('a')], completions, workItems: [], now }, since)
    expect(c.caption).not.toMatch(/\d+\s*(day|week|month)/i)
    expect(c.caption).not.toMatch(/well done|great|nice|keep it up|streak/i)
  })

  // The rule the whole product rests on: a plant can never shrink. The diff
  // reconstructs the past from a SUBSET of completions, so if stageFor were
  // ever non-monotonic the arrival line could claim something went backwards.
  it('can never report a stage going backwards, for any split of completions', () => {
    for (let total = 0; total <= 40; total++) {
      for (const cut of [0, 1, 3, 7, 11, 15, 29, total]) {
        const all = days(total)
        const before = all.slice(0, Math.min(cut, total))
        const nowStage = STAGE_INDEX(plantFor(habit('a'), all).stage)
        const thenStage = STAGE_INDEX(plantFor(habit('a'), before).stage)
        expect(nowStage).toBeGreaterThanOrEqual(thenStage)
      }
    }
  })
})
