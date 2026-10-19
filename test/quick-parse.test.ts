import { describe, it, expect } from 'vitest'
import { parseQuick } from '@/lib/quick/parse'

describe('parseQuick', () => {
  it('shopping by default', () => {
    expect(parseQuick('add oat milk')).toEqual({ kind: 'shopping', items: ['Oat milk'] })
    expect(parseQuick('Add oat milk to the shopping list.')).toEqual({ kind: 'shopping', items: ['Oat milk'] })
    expect(parseQuick('eggs, bananas, mac and cheese')).toEqual({ kind: 'shopping', items: ['Eggs', 'Bananas', 'Mac and cheese'] })
  })
  it('tasks', () => {
    expect(parseQuick('task call the vet')).toEqual({ kind: 'task', title: 'Call the vet' })
    expect(parseQuick('Remind me to book the dentist')).toEqual({ kind: 'task', title: 'Book the dentist' })
    expect(parseQuick('add a todo: renew passport')).toEqual({ kind: 'task', title: 'Renew passport' })
  })
  it('notes', () => expect(parseQuick('note the wifi guy comes Tuesday')).toEqual({ kind: 'note', text: 'the wifi guy comes Tuesday' }))
  it('nothing', () => expect(parseQuick('  ')).toBeNull())
})
