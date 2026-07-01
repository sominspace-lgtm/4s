'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useGiftEvents, daysUntil } from '@/lib/hooks/useGiftEvents'

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
  fontWeight: 300, padding: '0.4rem 0.65rem', outline: 'none',
}

function urgencyColor(days: number) {
  if (days <= 3) return 'var(--rose)'
  if (days <= 14) return 'var(--amber)'
  return 'rgba(232,160,192,0.4)'
}

function dueLabel(days: number) {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days}d`
}

export default function GiftsCard() {
  const { items, add, remove } = useGiftEvents()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [relation, setRelation] = useState('')
  const [budget, setBudget] = useState('')
  const [giftIdea, setGiftIdea] = useState('')
  const [recurring, setRecurring] = useState(true)

  function handleAdd() {
    if (!name.trim() || !date) return
    add({
      name: name.trim(), date, recurring,
      relation: relation.trim() || null,
      budget: budget ? parseFloat(budget) : null,
      giftIdea: giftIdea.trim() || null,
    })
    setName(''); setDate(''); setRelation(''); setBudget(''); setGiftIdea(''); setRecurring(true)
  }

  return (
    <div className="card-interactive" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.4rem 1.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 400, letterSpacing: '0.02em', color: 'var(--muted)' }}>Gifts</div>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>birthdays &amp; events</span>
      </div>
      <p style={{ fontSize: '0.73rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '1rem', lineHeight: 1.5 }}>
        Upcoming birthdays and events, so a gift never sneaks up on you.
      </p>

      {items.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>No birthdays or events yet. Add one before it sneaks up on you.</p>}

      {items.map(item => {
        const days = daysUntil(item)
        const color = urgencyColor(days)
        return (
          <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', padding: '0.6rem 0', borderBottom: '1px solid var(--faint)' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0, marginTop: '0.3rem' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
                {item.name}
                {item.relation && <span style={{ color: 'var(--muted)', opacity: 0.6 }}> · {item.relation}</span>}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: '0.1rem', opacity: 0.7 }}>
                {format(parseISO(item.date), 'MMM d')}{item.recurring ? ' · yearly' : ''}
                {item.budget != null && ` · $${item.budget} budget`}
              </div>
              {item.giftIdea && (
                <div style={{ fontSize: '0.68rem', color: 'var(--gold)', marginTop: '0.2rem', opacity: 0.8 }}>
                  ✦ {item.giftIdea}
                </div>
              )}
            </div>
            <span style={{ fontSize: '0.68rem', color, whiteSpace: 'nowrap', marginTop: '0.05rem' }}>{dueLabel(days)}</span>
            <button onClick={() => remove(item.id)} aria-label="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.62rem', opacity: 0.4, marginTop: '0.05rem' }}>✕</button>
          </div>
        )
      })}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--faint)' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Who (e.g. Mom)" aria-label="Name" style={{ ...inputStyle, flex: 2, minWidth: '110px' }} />
        <input value={date} onChange={e => setDate(e.target.value)} type="date" aria-label="Date" style={{ ...inputStyle, flex: 1, minWidth: '130px' }} />
        <input value={relation} onChange={e => setRelation(e.target.value)} placeholder="Relation (optional)" aria-label="Relation" style={{ ...inputStyle, flex: 1, minWidth: '110px' }} />
        <input value={budget} onChange={e => setBudget(e.target.value)} type="number" step="0.01" placeholder="Budget $" aria-label="Budget" style={{ ...inputStyle, width: '90px' }} />
        <input value={giftIdea} onChange={e => setGiftIdea(e.target.value)} placeholder="Gift idea (optional)" aria-label="Gift idea" style={{ ...inputStyle, flex: 2, minWidth: '140px' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem', color: 'var(--muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} />
          yearly
        </label>
        <button onClick={handleAdd} className="btn btn-primary" style={{ fontSize: '0.72rem' }}>Add</button>
      </div>
    </div>
  )
}
