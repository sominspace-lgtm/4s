'use client'

import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useWatchItems, type WatchItem } from '@/lib/hooks/useWatchItems'

const TYPE_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  price:       { color: 'var(--amber)',   bg: 'rgba(232,144,122,0.15)', border: 'rgba(232,144,122,0.25)' },
  restock:     { color: 'var(--gold)',    bg: 'color-mix(in srgb, var(--gold) 12%, transparent)', border: 'color-mix(in srgb, var(--gold) 22%, transparent)' },
  appointment: { color: 'var(--purple)',  bg: 'rgba(196,120,176,0.12)', border: 'rgba(196,120,176,0.22)' },
  supplement:  { color: 'var(--slate)',   bg: 'rgba(184,122,176,0.12)', border: 'rgba(184,122,176,0.22)' },
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
  fontWeight: 300, padding: '0.4rem 0.65rem', outline: 'none',
}

export default function WatchCard() {
  const { items, add, remove, markChecked } = useWatchItems()
  const [type, setType] = useState<WatchItem['type']>('price')
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  async function handleAdd() {
    if (!name.trim()) return
    await add(type, name.trim(), note.trim())
    setName(''); setNote('')
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.4rem 1.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 400, letterSpacing: '0.02em' }}>Things to Monitor</div>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>manual now · bot later</span>
      </div>
      <p style={{ fontSize: '0.73rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '1rem', lineHeight: 1.5 }}>
        Track prices, restocks, appointments, supplements. Mark checked when you've looked.
      </p>

      {items.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>Nothing on the watchlist yet.</p>}

      {items.map(item => {
        const ts = TYPE_STYLE[item.type]
        return (
          <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', padding: '0.65rem 0', borderBottom: '1px solid var(--faint)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.status === 'triggered' ? 'var(--rose)' : 'color-mix(in srgb, var(--gold) 50%, transparent)', flexShrink: 0, marginTop: '0.4rem' }} />
            <span style={{ fontSize: '0.58rem', letterSpacing: '0.07em', textTransform: 'uppercase', padding: '0.2em 0.55em', borderRadius: '4px', flexShrink: 0, marginTop: '0.1rem', color: ts.color, background: ts.bg, border: `1px solid ${ts.border}` }}>
              {item.type}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginBottom: '0.15rem' }}>{item.name}</div>
              {item.note && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>{item.note}</div>}
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.2rem', opacity: 0.7 }}>
                checked {formatDistanceToNow(parseISO(item.last_checked + 'T12:00:00'))} ago
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flexShrink: 0 }}>
              <button onClick={() => markChecked(item.id)} style={{ fontSize: '0.62rem', color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.2em 0.5em', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>✓ checked</button>
              <button onClick={() => remove(item.id)} aria-label="Delete" style={{ fontSize: '0.62rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, textAlign: 'right' }}>✕</button>
            </div>
          </div>
        )
      })}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--faint)' }}>
        <select value={type} onChange={e => setType(e.target.value as WatchItem['type'])} aria-label="Watch type" style={{ ...inputStyle, cursor: 'pointer', color: 'var(--muted)' }}>
          <option value="price">price drop</option>
          <option value="restock">restock</option>
          <option value="appointment">appointment</option>
          <option value="supplement">supplement</option>
        </select>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="What to watch" aria-label="Item name" style={{ ...inputStyle, flex: 2, minWidth: '130px' }} />
        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Condition or note" aria-label="Note" style={{ ...inputStyle, flex: 2, minWidth: '130px' }} />
        <button onClick={handleAdd} style={{ padding: '0.4em 0.9em', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)', background: 'color-mix(in srgb, var(--gold) 8%, transparent)', color: 'var(--gold)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', cursor: 'pointer' }}>Add</button>
      </div>
    </div>
  )
}
