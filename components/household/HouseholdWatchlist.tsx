'use client'

import { useState } from 'react'
import { useWatchlist, type WatchlistDomain, type WatchlistStatus, type WatchlistItem } from '@/lib/hooks/useWatchlist'
import Icon from '@/components/ui/Icon'

const inputStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '0.4rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', outline: 'none',
}

const STATUS_LABEL: Record<WatchlistStatus, string> = {
  watchlist: 'Want to', watching: 'In progress', finished: 'Finished', dropped: 'Dropped',
}
const STATUS_ORDER: WatchlistStatus[] = ['watching', 'watchlist', 'finished', 'dropped']

// One backlog, two domains (2026-08-22) — games and shows/movies are the
// same shape (title, status) with different verbs, so one component covers
// both rather than duplicating markup. Same table + status vocabulary the
// Discord bot's /track command already writes through to
// (household_watchlist), so an item added here shows up in `/track list`
// and vice versa. Deliberately NOT the generic Lists feature next to it:
// that's a plain checklist (done/not done), this needs a real status
// beyond binary — watchlist -> watching -> finished, or dropped.
function DomainBacklog({ domain, label, verb, spaceId }: {
  domain: WatchlistDomain; label: React.ReactNode; /** "play" or "watch" — for the empty state and status labels */ verb: string; spaceId: string | null
}) {
  const { items: all, loading, addItem, setStatus, removeItem } = useWatchlist(spaceId)
  const items = all.filter(i => i.domain === domain)
  const [title, setTitle] = useState('')

  const grouped = STATUS_ORDER.map(s => ({ status: s, items: items.filter(i => i.status === s) })).filter(g => g.items.length > 0)

  return (
    <details style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>{label}</span>
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{items.length}</span>
      </summary>

      <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {items.length === 0 && !loading && (
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
            Nothing yet — add what you want to {verb}.
          </div>
        )}

        {grouped.map(g => (
          <div key={g.status}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.65, marginBottom: '0.25rem' }}>
              {STATUS_LABEL[g.status]}
            </div>
            {g.items.map((i: WatchlistItem) => (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
                <span style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text)' }}>
                  {i.title}{i.subtype && <span style={{ color: 'var(--muted)', opacity: 0.7 }}> · {i.subtype}</span>}
                </span>
                <select
                  value={i.status}
                  onChange={e => setStatus(i.id, e.target.value as WatchlistStatus)}
                  style={{ ...inputStyle, padding: '0.2rem 0.4rem', fontSize: '0.62rem', cursor: 'pointer' }}
                >
                  {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
                <button onClick={() => removeItem(i.id)} aria-label={`Remove ${i.title}`} className="press"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.35, fontSize: '0.55rem', flexShrink: 0 }}>✕</button>
              </div>
            ))}
          </div>
        ))}

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!title.trim()) return
            await addItem(domain, title.trim())
            setTitle('')
          }}
          style={{ display: 'flex', gap: '0.35rem' }}
        >
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={`Add something to ${verb}`}
            style={{ ...inputStyle, flex: 1 }} />
          <button type="submit" className="btn btn-ghost press" style={{ fontSize: '0.66rem' }}>Add</button>
        </form>
      </div>
    </details>
  )
}

export default function HouseholdWatchlist({ spaceId }: { spaceId: string | null }) {
  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div className="t-card">Watchlist</div>
      <DomainBacklog domain="game" label={<><Icon name="gamepad" size={12} /> Game list</>} verb="play" spaceId={spaceId} />
      <DomainBacklog domain="media" label={<><Icon name="tv" size={12} /> Watch list</>} verb="watch" spaceId={spaceId} />
    </section>
  )
}
