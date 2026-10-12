'use client'

import type { ReactNode } from 'react'

// Reads a note's plain text as a tidy page (2026-10-12): headings, bullets,
// quotes, dividers, tickable checklists, **bold**, *italic*, `code`, links,
// #tags and [[links to other notes]]. Everything is built as React nodes, not
// HTML strings, so nothing a note contains can inject markup.

const INLINE = /\[\[([^\[\]\n]{1,80})\]\]|\*\*(.+?)\*\*|\*(.+?)\*|`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+)|#([A-Za-z][\w-]{1,30})/g

export interface NoteViewProps {
  body: string
  /** Titles that exist, lowercased, so a [[link]] to a missing note reads differently. */
  titles: Set<string>
  onOpenNote: (title: string) => void
  onToggle: (lineIndex: number) => void
  onTag: (tag: string) => void
}

function inline(text: string, p: NoteViewProps, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  INLINE.lastIndex = 0
  for (let m = INLINE.exec(text); m; m = INLINE.exec(text)) {
    const [all, wiki, bold, ital, code, label, href, bare, tag] = m
    // A # only starts a tag at the start of the text or after whitespace.
    if (tag !== undefined && m.index > 0 && !/\s/.test(text[m.index - 1])) continue
    if (m.index > last) out.push(text.slice(last, m.index))
    const key = `${keyBase}-${k++}`
    if (wiki !== undefined) {
      const exists = p.titles.has(wiki.trim().toLowerCase())
      out.push(
        <button key={key} onClick={() => p.onOpenNote(wiki.trim())} style={{
          background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit',
          color: exists ? 'var(--gold)' : 'var(--muted)', textDecoration: exists ? 'underline' : 'underline dotted',
        }} title={exists ? 'Open note' : 'No note with this name yet. Click to create it.'}>{wiki}</button>,
      )
    } else if (bold !== undefined) out.push(<strong key={key}>{bold}</strong>)
    else if (ital !== undefined) out.push(<em key={key}>{ital}</em>)
    else if (code !== undefined) out.push(<code key={key} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.92em', background: 'var(--surface2)', borderRadius: 4, padding: '0.05em 0.35em' }}>{code}</code>)
    else if (href !== undefined) out.push(<a key={key} href={href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>{label}</a>)
    else if (bare !== undefined) {
      const clean = bare.replace(/[.,;:!?)]+$/, '')
      out.push(<a key={key} href={clean} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>{clean}</a>)
      last = m.index + clean.length
      INLINE.lastIndex = last
      continue
    } else if (tag !== undefined) {
      out.push(
        <button key={key} onClick={() => p.onTag(tag.toLowerCase())} style={{
          background: 'color-mix(in srgb, var(--gold) 10%, transparent)', border: 'none', borderRadius: 999, padding: '0.05em 0.55em',
          cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.92em', color: 'var(--gold)',
        }}>#{tag}</button>,
      )
    }
    last = m.index + all.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

const CHECK = /^(\s*)[-*]\s+\[( |x|X)\]\s?(.*)$/
const BULLET = /^(\s*)[-*]\s+(.*)$/
const NUMBERED = /^(\s*)(\d+)[.)]\s+(.*)$/

export default function NoteView(p: NoteViewProps) {
  const lines = p.body.split('\n')
  return (
    <div style={{ fontSize: '0.88rem', lineHeight: 1.65, color: 'var(--text)', wordBreak: 'break-word' }}>
      {lines.map((line, i) => {
        const key = `l${i}`
        if (!line.trim()) return <div key={key} style={{ height: '0.6rem' }} />
        let m: RegExpMatchArray | null
        if ((m = line.match(CHECK))) {
          const done = m[2] !== ' '
          return (
            <div key={key} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', paddingLeft: `${m[1].length * 0.6}rem` }}>
              <input type="checkbox" checked={done} onChange={() => p.onToggle(i)} style={{ marginTop: '0.35rem', cursor: 'pointer' }} />
              <span style={{ textDecoration: done ? 'line-through' : 'none', opacity: done ? 0.55 : 1 }}>{inline(m[3], p, key)}</span>
            </div>
          )
        }
        if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
          const size = m[1].length === 1 ? '1.25rem' : m[1].length === 2 ? '1.05rem' : '0.92rem'
          return <div key={key} style={{ fontFamily: 'var(--font-display)', fontSize: size, fontWeight: 500, margin: '0.6rem 0 0.15rem' }}>{inline(m[2], p, key)}</div>
        }
        if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) return <hr key={key} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.7rem 0' }} />
        if ((m = line.match(/^>\s?(.*)$/))) {
          return <div key={key} style={{ borderLeft: '3px solid var(--border)', paddingLeft: '0.7rem', color: 'var(--muted)', fontStyle: 'italic' }}>{inline(m[1], p, key)}</div>
        }
        if ((m = line.match(BULLET))) {
          return (
            <div key={key} style={{ display: 'flex', gap: '0.5rem', paddingLeft: `${m[1].length * 0.6}rem` }}>
              <span style={{ color: 'var(--muted)' }}>•</span><span>{inline(m[2], p, key)}</span>
            </div>
          )
        }
        if ((m = line.match(NUMBERED))) {
          return (
            <div key={key} style={{ display: 'flex', gap: '0.5rem', paddingLeft: `${m[1].length * 0.6}rem` }}>
              <span style={{ color: 'var(--muted)', minWidth: '1.1rem' }}>{m[2]}.</span><span>{inline(m[3], p, key)}</span>
            </div>
          )
        }
        return <div key={key}>{inline(line, p, key)}</div>
      })}
    </div>
  )
}
