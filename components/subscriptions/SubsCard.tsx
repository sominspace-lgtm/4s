'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useSubscriptions, urgency, type Cadence, type DueKind } from '@/lib/hooks/useSubscriptions'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'

const URGENCY_COLOR = {
  paid: 'var(--emerald)',
  soon: 'var(--rose)',
  near: 'var(--amber)',
  fine: 'color-mix(in srgb, var(--gold) 30%, transparent)',
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
  fontWeight: 300, padding: '0.4rem 0.65rem', outline: 'none',
}

function toggle(active: boolean): React.CSSProperties {
  return {
    ...inputStyle, cursor: 'pointer', padding: '0.4rem 0.7rem',
    background: active ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'var(--bg)',
    color: active ? 'var(--gold)' : 'var(--muted)',
    border: `1px solid ${active ? 'color-mix(in srgb, var(--gold) 35%, transparent)' : 'var(--border)'}`,
  }
}

export default function SubsCard() {
  const lang = useLang()
  const { subs, add, remove, markPaid, total } = useSubscriptions()
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [date, setDate] = useState('')
  const [cadence, setCadence] = useState<Cadence>('monthly')
  const [dueKind, setDueKind] = useState<DueKind>('on')

  async function handleAdd() {
    if (!name.trim() || !cost) return
    // Cost is stored as the monthly-equivalent so the total stays honest;
    // a yearly amount is entered as $/yr and divided down here.
    const monthly = cadence === 'yearly' ? parseFloat(cost) / 12 : parseFloat(cost)
    await add(name.trim(), monthly, date, cadence, dueKind)
    setName(''); setCost(''); setDate(''); setCadence('monthly'); setDueKind('on')
  }

  return (
    <div className="card-interactive" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.4rem 1.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 400, letterSpacing: '0.02em', color: 'var(--muted)' }}>{t('Renewals', lang)}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--gold)', fontWeight: 400 }}>${total.toFixed(2)}</strong> {t('/ mo', lang)}
        </div>
      </div>

      {subs.length === 0 && <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>{t('Nothing tracked yet. Add a subscription to see your monthly total.', lang)}</p>}

      {subs.map(s => {
        const u = urgency(s)
        const priceLabel = s.cadence === 'yearly' ? `$${(Number(s.cost_monthly) * 12).toFixed(2)}/yr` : `$${Number(s.cost_monthly).toFixed(2)}/mo`
        return (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.5rem 0', borderBottom: '1px solid var(--faint)' }}
            onMouseEnter={e => (e.currentTarget.querySelector<HTMLElement>('.del')!.style.opacity = '0.4')}
            onMouseLeave={e => (e.currentTarget.querySelector<HTMLElement>('.del')!.style.opacity = '0')}
          >
            <button
              onClick={() => markPaid(s.id)}
              disabled={!s.renewal_date}
              title={u === 'paid' ? 'Paid this cycle — click to advance again' : 'Mark this cycle paid'}
              aria-label={`Mark ${s.name} paid`}
              className="press"
              style={{
                flexShrink: 0, width: 16, height: 16, borderRadius: '5px', cursor: s.renewal_date ? 'pointer' : 'default',
                border: `1.5px solid ${u === 'paid' ? 'var(--emerald)' : 'var(--border)'}`,
                background: u === 'paid' ? 'var(--emerald)' : 'transparent',
                color: 'var(--bg)', fontSize: '0.7rem', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{u === 'paid' ? '✓' : ''}</button>
            <span style={{ fontSize: '0.82rem', color: 'var(--text)', flex: 1 }}>{s.name}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{priceLabel}</span>
            <span style={{ fontSize: '0.7rem', color: u === 'fine' || u === 'paid' ? 'var(--muted)' : URGENCY_COLOR[u], whiteSpace: 'nowrap', minWidth: '92px', textAlign: 'right' }}>
              {s.renewal_date ? `${s.due_kind} ${format(parseISO(s.renewal_date), 'MMM d')}` : '—'}
            </span>
            <button className="del" onClick={() => remove(s.id)} aria-label="Delete" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.65rem', opacity: 0, transition: 'opacity 0.15s' }}>✕</button>
          </div>
        )
      })}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.9rem', paddingTop: '0.9rem', borderTop: '1px solid var(--faint)' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Service name" aria-label="Service name" style={{ ...inputStyle, flex: 2, minWidth: '110px' }} />
        <input value={cost} onChange={e => setCost(e.target.value)} type="number" step="0.01" placeholder={cadence === 'yearly' ? '$/yr' : '$/mo'} aria-label="Cost" style={{ ...inputStyle, flex: 1, minWidth: '70px' }} />
        <input value={date} onChange={e => setDate(e.target.value)} type="date" aria-label="Renewal date" style={{ ...inputStyle, flex: 1, minWidth: '110px', colorScheme: 'dark' }} />
        <button onClick={() => setCadence(c => c === 'monthly' ? 'yearly' : 'monthly')} style={toggle(false)} title="Billing cadence">{cadence === 'yearly' ? 'yearly' : 'monthly'}</button>
        <button onClick={() => setDueKind(k => k === 'on' ? 'by' : 'on')} style={toggle(false)} title="Charged on a date, or due by a date">{dueKind === 'by' ? 'pay by' : 'pay on'}</button>
        <button onClick={handleAdd} style={{ padding: '0.4em 0.9em', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)', background: 'color-mix(in srgb, var(--gold) 8%, transparent)', color: 'var(--gold)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', cursor: 'pointer' }}>Add</button>
      </div>
    </div>
  )
}
