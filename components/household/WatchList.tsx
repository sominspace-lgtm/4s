'use client'

import { useMemo, useState } from 'react'
import { withUndo } from '@/lib/ui/undo'
import { useWatchlist, type WatchlistDomain, type WatchlistItem, type WatchlistStatus } from '@/lib/hooks/useWatchlist'
import { field, muted, chip, linkBtn, card } from './listStyles'

// Movies and shows, and games, as a plain list (2026-11-10). Type a title and
// press Enter. Everything sits in three groups, and one tap moves a title on
// to the next. Dropped titles fold away at the bottom. The table view is
// still there for anyone who wants columns.

const NEXT: Partial<Record<WatchlistStatus, WatchlistStatus>> = { watchlist: 'watching', watching: 'finished' }

function groupsFor(domain: WatchlistDomain): { status: WatchlistStatus; label: string; move: string }[] {
  return domain === 'game'
    ? [
        { status: 'watchlist', label: 'Want to play', move: 'Start' },
        { status: 'watching', label: 'Playing', move: 'Finished' },
        { status: 'finished', label: 'Played', move: '' },
      ]
    : [
        { status: 'watchlist', label: 'Want to watch', move: 'Start' },
        { status: 'watching', label: 'Watching', move: 'Finished' },
        { status: 'finished', label: 'Watched', move: '' },
      ]
}

/** Movie or Show, read loosely from whatever the subtype says. */
export function mediaKind(subtype: string | null): 'Movie' | 'Show' | null {
  const s = (subtype ?? '').toLowerCase()
  if (/movie|film/.test(s)) return 'Movie'
  if (/show|series|tv/.test(s)) return 'Show'
  return null
}

export default function WatchList({ spaceId, domain, onTable }: { spaceId: string; domain: WatchlistDomain; onTable: () => void }) {
  const { items, loading, addItem, update, removeItem } = useWatchlist(spaceId)
  const [text, setText] = useState('')
  const [kind, setKind] = useState<'Movie' | 'Show'>('Movie')
  const [tab, setTab] = useState<'all' | 'Movie' | 'Show'>('all')
  const [showDropped, setShowDropped] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const media = domain === 'media'

  const mine = useMemo(() => items.filter(i => i.domain === domain && (!media || tab === 'all' || mediaKind(i.subtype) === tab)), [items, domain, media, tab])
  const groups = groupsFor(domain)

  async function add() {
    const t = text.trim()
    if (!t) return
    setText('')
    setErr(await addItem(domain, t, media ? kind : undefined, { status: 'watchlist' }))
  }

  function row(i: WatchlistItem, move: string) {
    const k = media ? mediaKind(i.subtype) : null
    const next = NEXT[i.status]
    if (editing === i.id) {
      return (
        <div key={i.id} style={{ ...card, gap: '0.45rem' }}>
          <input defaultValue={i.title} autoFocus style={{ ...field, width: '100%' }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            onBlur={e => { const t = e.target.value.trim(); if (t && t !== i.title) update(i.id, { title: t }) }} />
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {media && (['Movie', 'Show'] as const).map(m => (
              <button key={m} style={chip(k === m)} onClick={() => update(i.id, { subtype: m })}>{m}</button>
            ))}
            <select value={i.status} onChange={e => update(i.id, { status: e.target.value as WatchlistStatus })} style={{ ...field, minHeight: 34, fontSize: '0.78rem' }} aria-label="Status">
              {groups.map(g => <option key={g.status} value={g.status}>{g.label}</option>)}
              <option value="dropped">Dropped</option>
            </select>
            <button style={{ ...linkBtn, color: 'var(--rose)', marginLeft: 'auto' }} onClick={() => { setEditing(null); withUndo(`Removing "${i.title}"`, () => removeItem(i.id)) }}>Remove</button>
            <button style={linkBtn} onClick={() => setEditing(null)}>Done</button>
          </div>
        </div>
      )
    }
    return (
      <div key={i.id} style={{ ...card, flexDirection: 'row', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.4rem 0.35rem 0.75rem' }}>
        <button onClick={() => setEditing(i.id)} style={{ ...linkBtn, color: 'var(--text)', fontSize: '0.9rem', flex: 1, textAlign: 'left', minHeight: 36 }}>
          {i.title}
          {k && <span style={{ ...muted, marginLeft: '0.45rem', fontSize: '0.68rem' }}>{k}</span>}
        </button>
        {next && move && <button className="btn btn-secondary press" style={{ fontSize: '0.72rem', minHeight: 34 }} onClick={() => update(i.id, { status: next })}>{move}</button>}
      </div>
    )
  }

  const dropped = mine.filter(i => i.status === 'dropped')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder={media ? 'Add a movie or show' : 'Add a game'} style={{ ...field, flex: '1 1 12rem' }} aria-label="New title" />
        {media && (
          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
            {(['Movie', 'Show'] as const).map(m => <button key={m} style={chip(kind === m)} onClick={() => setKind(m)}>{m}</button>)}
          </div>
        )}
        <button className="btn btn-primary press" style={{ minHeight: 44 }} onClick={add}>Add</button>
      </div>
      {err && <div style={{ ...muted, color: 'var(--rose)' }}>{err}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
        {media && (['all', 'Movie', 'Show'] as const).map(t => (
          <button key={t} style={chip(tab === t)} onClick={() => setTab(t)}>{t === 'all' ? 'All' : t + 's'}</button>
        ))}
        <button style={{ ...linkBtn, marginLeft: 'auto' }} onClick={onTable}>Table view</button>
      </div>

      {loading ? <div style={muted}>Loading…</div> : groups.map(g => {
        const list = mine.filter(i => i.status === g.status)
        return (
          <div key={g.status} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ ...muted, letterSpacing: '0.04em' }}>{g.label} · {list.length}</div>
            {list.length === 0
              ? <div style={{ ...muted, fontStyle: 'italic', opacity: 0.7 }}>Nothing here yet.</div>
              : list.map(i => row(i, g.move))}
          </div>
        )
      })}

      {dropped.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <button style={{ ...linkBtn, textAlign: 'left' }} onClick={() => setShowDropped(s => !s)}>{showDropped ? '▾' : '▸'} Dropped · {dropped.length}</button>
          {showDropped && dropped.map(i => row(i, ''))}
        </div>
      )}
    </div>
  )
}
