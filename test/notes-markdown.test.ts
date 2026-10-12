import { describe, it, expect } from 'vitest'
import {
  extractTags, extractLinks, backlinksFor, findByTitle, toggleCheckLine, checklistProgress, NOTE_TEMPLATES,
} from '@/lib/notes/markdown'

describe('tags', () => {
  it('finds #tags but not headings or numbers', () => {
    expect(extractTags('# Heading\nplanning #trip and #Japan-2027 today #1 nope')).toEqual(['trip', 'japan-2027'])
  })
  it('dedupes case-insensitively', () => {
    expect(extractTags('#Food and #food')).toEqual(['food'])
  })
  it('ignores a # glued to a word', () => {
    expect(extractTags('issue#42 and a#b')).toEqual([])
  })
})

describe('links and backlinks', () => {
  const notes = [
    { id: '1', title: 'Japan trip', body: 'flights [[Packing list]] and [[Budget]]' },
    { id: '2', title: 'Packing list', body: '- [ ] passport' },
    { id: '3', title: 'Budget', body: 'see [[japan trip]]' },
  ]
  it('extracts links', () => { expect(extractLinks(notes[0].body)).toEqual(['Packing list', 'Budget']) })
  it('finds notes that link to a title, ignoring case and the note itself', () => {
    expect(backlinksFor('Japan trip', notes, '1').map(n => n.id)).toEqual(['3'])
    expect(backlinksFor('Packing list', notes).map(n => n.id)).toEqual(['1'])
  })
  it('looks a note up by title', () => {
    expect(findByTitle(' budget ', notes)?.id).toBe('3')
    expect(findByTitle('nope', notes)).toBeUndefined()
  })
})

describe('checklists', () => {
  const body = 'Shopping\n- [ ] milk\n- [x] eggs\n* [ ] bread\nplain line'
  it('toggles one line either way', () => {
    expect(toggleCheckLine(body, 1).split('\n')[1]).toBe('- [x] milk')
    expect(toggleCheckLine(body, 2).split('\n')[2]).toBe('- [ ] eggs')
    expect(toggleCheckLine(body, 3).split('\n')[3]).toBe('* [x] bread')
  })
  it('leaves other lines and non-checklist lines alone', () => {
    expect(toggleCheckLine(body, 0)).toBe(body)
    expect(toggleCheckLine(body, 4)).toBe(body)
    expect(toggleCheckLine(body, 99)).toBe(body)
  })
  it('counts progress', () => {
    expect(checklistProgress(body)).toEqual({ done: 1, total: 3 })
    expect(checklistProgress('nothing here')).toBeNull()
  })
})

describe('templates', () => {
  it('has unique ids and a blank first', () => {
    const ids = NOTE_TEMPLATES.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids[0]).toBe('blank')
  })
})
