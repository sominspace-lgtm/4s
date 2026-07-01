'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useSubscriptions, urgency } from '@/lib/hooks/useSubscriptions'

const URGENCY_COLOR = { soon: 'var(--rose)', near: 'var(--amber)', fine: 'rgba(232,160,192,0.3)' }

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
  fontWeight: 300, padding: '0.4rem 0.65rem', outline: 'none',
}

export default function SubsCard() {
  const { subs, add, remove, total } = useSubscriptions()
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [date, setDate] = useState('')

  async function handleAdd() {
    if (!name.trim() || !cost) return
    await add(name.trim(), parseFloat(cost), date)
    setName(''); setCost(''); setDate('')
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.4rem 1.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 400, letterSpacing: '0.02em' }}>Renewals</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--gold)', fontWeight: 400 }}>${total.toFixed(2)}</strong> / mo
        </div>
      </div>

      {subs.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>No subscriptions added yet.</p>}

      {subs.map(s => {
        const u = urgency(s.renewal_date)
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid var(--faint)' }}
            onMouseEnter={e => (e.currentTarget.querySelector<HTMLElement>('.del')!.style.opacity = '0.4')}
            onMouseLeave={e => (e.currentTarget.querySelector<HTMLElement>('.del')!.style.opacity = '0')}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: URGENCY_COLOR[u], flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: 'var(--text)', flex: 1 }}>{s.name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>${Number(s.cost_monthly).toFixed(2)}/mo</span>
            <span style={{ fontSize: '0.7rem', color: u === 'fine' ? 'var(--muted)' : URGENCY_COLOR[u], whiteSpace: 'nowrap', minWidth: '80px', textAlign: 'right' }}>
              {s.renewal_date ? format(parseISO(s.renewal_date), 'MMM d') : '—'}
            </span>
            <button className="del" onClick={() => remove(s.id)} aria-label="Delete" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.65rem', opacity: 0, transition: 'opacity 0.15s' }}>✕</button>
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid var(--faint)' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Service name" aria-label="Service name" style={{ ...inputStyle, flex: 2, minWidth: '110px' }} />
        <input value={cost} onChange={e => setCost(e.target.value)} type="number" step="0.01" placeholder="$/mo" aria-label="Monthly cost" style={{ ...inputStyle, flex: 1, minWidth: '70px' }} />
        <input value={date} onChange={e => setDate(e.target.value)} type="date" aria-label="Renewal date" style={{ ...inputStyle, flex: 1, minWidth: '110px', colorScheme: 'dark' }} />
        <button onClick={handleAdd} style={{ padding: '0.4em 0.9em', borderRadius: '8px', border: '1px solid rgba(232,160,192,0.3)', background: 'rgba(232,160,192,0.08)', color: 'var(--gold)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', cursor: 'pointer' }}>Add</button>
      </div>
    </div>
  )
}
