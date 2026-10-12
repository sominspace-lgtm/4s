import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import NoteView from '@/components/notes/NoteView'

const render = (body: string, titles: string[] = []) =>
  renderToStaticMarkup(createElement(NoteView, {
    body, titles: new Set(titles.map(t => t.toLowerCase())), onOpenNote: () => {}, onToggle: () => {}, onTag: () => {},
  }))

describe('NoteView', () => {
  it('renders checklists as checkboxes with the right state', () => {
    const html = render('- [ ] milk\n- [x] eggs')
    expect(html.match(/type="checkbox"/g)).toHaveLength(2)
    expect(html).toContain('checked=""')
    expect(html).toContain('line-through')
  })

  it('renders headings, bullets and dividers', () => {
    const html = render('# Big\n- one\n---\n> quoted')
    expect(html).toContain('Big')
    expect(html).toContain('•')
    expect(html).toContain('<hr')
    expect(html).toContain('quoted')
  })

  it('makes #tags and [[links]] clickable and marks missing links', () => {
    const html = render('see [[Packing list]] and [[Nope]] about #trip', ['Packing list'])
    expect(html).toContain('#trip')
    expect(html).toContain('Packing list')
    expect(html).toContain('underline dotted') // the missing one
  })

  it('does not treat a # inside a word as a tag', () => {
    expect(render('issue#42')).not.toContain('<button')
  })

  it('never injects HTML from the note body', () => {
    const html = render('<img src=x onerror=alert(1)> <script>alert(1)</script>')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<script')
    expect(html).toContain('&lt;script&gt;')
  })

  it('links bare urls and markdown links, trimming trailing punctuation', () => {
    const html = render('go to https://example.com/a. and [site](https://example.org)')
    expect(html).toContain('href="https://example.com/a"')
    expect(html).toContain('href="https://example.org"')
  })

  it('renders bold and italic', () => {
    const html = render('**bold** and *soft*')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>soft</em>')
  })
})
