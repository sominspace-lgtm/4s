'use client'

import { useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useBuyItems, daysUntilDue } from '@/lib/hooks/useBuyItems'

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
  fontWeight: 300, padding: '0.4rem 0.65rem', outline: 'none',
}

export default function BuylistCard() {
  const { items, add, markBought, remove } = useBuyItems()
  const [name, setName] = useState('')
  const [cadence, setCadence] = useState('30')
  const [url, setUrl] = useState('')

  async function handleAdd() {
    if (!name.trim()) return
    await add(name.trim(), parseInt(cadence) || 30, url.trim())
    setName(''); setCadence('30'); setUrl('')
  }

  function urgencyColor(days: number) {
    if (days < 0) return 'var(--rose)'
    if (days <= 5) return 'var(--amber)'
    return 'color-mix(in srgb, var(--gold) 40%, transparent)'
  }

  function dueLabel(days: number) {
    if (days < 0) return `overdue by ${Math.abs(days)}d`
    if (days === 0) return 'due today'
    return `in ${days}d`
  }

  return (
    <div className="card-interactive" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.4rem 1.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 400, letterSpacing: '0.02em', color: 'var(--muted)' }}>Buy Again</div>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>recurring purchases</span>
      </div>
      <p style={{ fontSize: '0.73rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '1rem', lineHeight: 1.5 }}>
        Things you buy on repeat. Hit "bought" when you restock — it resets the timer.
      </p>

      {items.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>Nothing on repeat yet. Add something you always run out of.</p>}

      {items.map(item => {
        const days = daysUntilDue(item)
        const color = urgencyColor(days)
        return (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 0', borderBottom: '1px solid var(--faint)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{item.name}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.1rem', opacity: 0.7 }}>
                every {item.cadence_days}d · last bought {formatDistanceToNow(parseISO(item.last_bought + 'T12:00:00'))} ago
              </div>
            </div>
            <span style={{ fontSize: '0.68rem', color, whiteSpace: 'nowrap' }}>{dueLabel(days)}</span>
            <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
              {item.buy_url && (
                <a href={item.buy_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.62rem', color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)', borderRadius: '6px', padding: '0.2em 0.5em', textDecoration: 'none', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                  buy →
                </a>
              )}
              <button onClick={() => markBought(item.id)} style={{ fontSize: '0.62rem', color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '0.2em 0.5em', cursor: 'pointer', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>✓ bought</button>
              <button onClick={() => remove(item.id)} aria-label="Delete" style={{ fontSize: '0.62rem', color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>✕</button>
            </div>
          </div>
        )
      })}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--faint)' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Item (e.g. Shampoo)" aria-label="Item name" style={{ ...inputStyle, flex: 2, minWidth: '120px' }} />
        <input value={cadence} onChange={e => setCadence(e.target.value)} type="number" placeholder="Every X days" aria-label="Cadence in days" style={{ ...inputStyle, width: '100px' }} />
        <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Amazon link (optional)" aria-label="Buy URL" style={{ ...inputStyle, flex: 3, minWidth: '160px' }} />
        <button onClick={handleAdd} style={{ padding: '0.4em 0.9em', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)', background: 'color-mix(in srgb, var(--gold) 8%, transparent)', color: 'var(--gold)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', cursor: 'pointer' }}>Add</button>
      </div>
    </div>
  )
}
