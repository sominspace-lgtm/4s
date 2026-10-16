import { describe, it, expect } from 'vitest'
import { parseRoutineText, itemDone, sectionsOf, countSteps } from '@/lib/routines/items'
import { MY_ROUTINES } from '@/lib/routines/presets'

describe('parseRoutineText', () => {
  it('reads Sylvia’s routines into three', () => {
    expect(MY_ROUTINES.map(r => r.name)).toEqual(['Morning routine', 'Don\'t wait to', 'Night routine'])
  })
  it('splits a section into time and title', () => {
    const first = MY_ROUTINES[0].items[0]
    expect(first).toMatchObject({ label: 'Good morning.', time: '5:30 AM', group: 'Wake up' })
    const night = MY_ROUTINES[2].items[0]
    expect(night).toMatchObject({ time: 'After dinner', group: 'Reset the kitchen', label: 'Clear the table.' })
  })
  it('keeps a section with no time', () => {
    const wind = MY_ROUTINES[2].items.find(i => i.group === 'Wind down')
    expect(wind?.time).toBeNull()
  })
  it('turns a bold label with text into a note', () => {
    const rule = MY_ROUTINES[1].items.find(i => i.note)
    expect(rule?.label).toBe('My rule: If it takes less than a minute and I can do it now, do it now.')
  })
  it('counts every step', () => {
    expect(MY_ROUTINES[0].items.length).toBe(15)
    expect(MY_ROUTINES[1].items.filter(i => !i.note).length).toBe(10)
    expect(MY_ROUTINES[2].items.length).toBe(18)
  })
  it('drops a title with nothing under it', () => {
    expect(parseRoutineText('MY DAILY ROUTINES\n\nMORNING\n- Water').map(r => r.name)).toEqual(['Morning'])
  })
})

describe('itemDone', () => {
  const today = new Date(2026, 9, 15, 9)
  it('a daily step ticked yesterday is fresh today', () => {
    expect(itemDone({ id: 'a', label: 'x', done: true, done_on: '2026-10-14' }, 1, today)).toBe(false)
    expect(itemDone({ id: 'a', label: 'x', done: true, done_on: '2026-10-15' }, 1, today)).toBe(true)
  })
  it('a weekly step stays done through the week', () => {
    expect(itemDone({ id: 'a', label: 'x', done: true, done_on: '2026-10-10' }, 7, today)).toBe(true)
  })
  it('old steps with no date keep their tick', () => {
    expect(itemDone({ id: 'a', label: 'x', done: true }, 1, today)).toBe(true)
  })
  it('notes never count', () => {
    expect(countSteps([{ id: 'n', label: 'rule', done: false, note: true }, { id: 's', label: 's', done: false }], 1).total).toBe(1)
  })
})

describe('sectionsOf', () => {
  it('groups consecutive steps', () => {
    const s = sectionsOf([
      { id: '1', label: 'a', done: false, group: 'Wake up', time: '5:30 AM' },
      { id: '2', label: 'b', done: false, group: 'Wake up', time: '5:30 AM' },
      { id: '3', label: 'c', done: false, group: 'Walk', time: '7:00 AM' },
    ])
    expect(s.map(x => [x.group, x.items.length])).toEqual([['Wake up', 2], ['Walk', 1]])
  })
})
