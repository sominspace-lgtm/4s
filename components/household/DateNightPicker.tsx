'use client'

import { useMemo, useState } from 'react'
import { useDateIdeas, type DateIdea, type PriceRange } from '@/lib/hooks/useDateIdeas'

// Date night picker (2026-10-19): pick from your own date ideas, filtered by
// what you want to spend and how much energy you have tonight. Ideas you
// have not done yet only; "Let's do it" marks it planned.

type Budget = 'any' | 'free' | 'some' | 'treat'
type Energy = 'any' | 'light' | 'medium' | 'deep'

const BUDGETS: { key: Budget; label: string; ok: (p: PriceRange | null, d: DateIdea) => boolean }[] = [
  { key: 'any', label: 'Any budget', ok: () => true },
  { key: 'free', label: 'Free or cheap', ok: (p, d) => !p || p === '$' || d.category === 'cheap' || d.category === 'home' },
  { key: 'some', label: 'Some', ok: p => !p || p === '$' || p === '$$' },
  { key: 'treat', label: 'A treat', ok: (p, d) => p === '$$$' || p === '$$$$' || d.category === 'splurge' },
]
const ENERGY: { key: Energy; label: string }[] = [
  { key: 'any', label: 'Any energy' }, { key: 'light', label: 'Low energy' }, { key: 'medium', label: 'Some energy' }, { key: 'deep', label: 'Up for anything' },
]

export function pickable(ideas: DateIdea[], budget: Budget, energy: Energy): DateIdea[] {
  const b = BUDGETS.find(x => x.key === budget)!
  const rank = { light: 1, medium: 2, deep: 3 } as const
  return ideas.filter(d => d.status !== 'done'
    && b.ok(d.price_range, d)
    // Low energy rules out the big ones; more energy allows everything below it.
    && (energy === 'any' || !d.energy || rank[d.energy] <= rank[energy]))
}

export default function DateNightPicker({ spaceId, readOnly = false }: { spaceId: string | null; readOnly?: boolean }) {
  const { ideas, update, loading } = useDateIdeas(spaceId)
  const [budget, setBudget] = useState<Budget>('any')
  const [energy, setEnergy] = useState<Energy>('any')
  const [pick, setPick] = useState<DateIdea | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const pool = useMemo(() => pickable(ideas, budget, energy), [ideas, budget, energy])

  function roll() {
    setNote(null)
    if (pool.length === 0) { setPick(null); setNote('Nothing fits. Try another budget or energy.'); return }
    const others = pool.filter(d => d.id !== pick?.id)
    const from = others.length ? others : pool
    setPick(from[Math.floor(Math.random() * from.length)])
  }

  const chip = (on: boolean): React.CSSProperties => ({
    minHeight: 36, padding: '0 0.8rem', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.8rem',
    border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
    color: on ? 'var(--gold)' : 'var(--muted)',
  })

  if (loading) return null
  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)' }}>Date night</div>
      {ideas.length === 0 ? (
        <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>Add a few date ideas in Reference and this picks one for you.</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>{BUDGETS.map(b => <button key={b.key} style={chip(budget === b.key)} onClick={() => { setBudget(b.key); setPick(null) }}>{b.label}</button>)}</div>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>{ENERGY.map(e => <button key={e.key} style={chip(energy === e.key)} onClick={() => { setEnergy(e.key); setPick(null) }}>{e.label}</button>)}</div>
          {pick && (
            <div style={{ border: '1px solid color-mix(in srgb, var(--gold) 35%, var(--border))', borderRadius: 12, padding: '0.8rem 0.9rem' }}>
              <div style={{ fontSize: '1.05rem', color: 'var(--text)' }}>{pick.title}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                {[pick.area, pick.price_range, pick.indoor_outdoor && pick.indoor_outdoor !== 'either' ? pick.indoor_outdoor : null, pick.status === 'planned' ? 'already planned' : null].filter(Boolean).join(' · ')}
              </div>
              {pick.notes && <div style={{ fontSize: '0.84rem', color: 'var(--text)', marginTop: '0.35rem', lineHeight: 1.5 }}>{pick.notes}</div>}
            </div>
          )}
          {note && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{note}</div>}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary press" style={{ minHeight: 44 }} onClick={roll}>{pick ? 'Another' : `Pick one (${pool.length})`}</button>
            {pick && !readOnly && pick.status !== 'planned' && (
              <button className="btn btn-secondary press" style={{ minHeight: 44 }} onClick={async () => { await update(pick.id, { status: 'planned' }); setNote(`"${pick.title}" is planned.`); setPick({ ...pick, status: 'planned' }) }}>Let&rsquo;s do it</button>
            )}
          </div>
        </>
      )}
    </section>
  )
}
