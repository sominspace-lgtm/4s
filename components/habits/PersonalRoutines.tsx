'use client'

import { useState } from 'react'
import { usePersonalRoutines, routineDue, type RoutineItem } from '@/lib/hooks/usePersonalRoutines'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

const input: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
  fontWeight: 300, padding: '0.45rem 0.7rem', outline: 'none',
}

// Morning routine, night routine — a checklist you run through once a
// cadence period, not a daily tick-box grid like a habit. Lives above the
// habit list on purpose: it's the first thing that happens in a day, so it
// reads first.
export default function PersonalRoutines({ userId }: { userId: string }) {
  const { spaces } = useSharedSpaces(userId)
  const spaceId = spaces[0]?.id ?? null
  const { routines, sharedFromPartner, loading, addRoutine, removeRoutine, toggleRoutineItem, markRoutineDone, toggleItemShared } =
    usePersonalRoutines(spaceId)

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [cadence, setCadence] = useState('1')
  const [steps, setSteps] = useState('')

  async function handleAdd() {
    if (!name.trim()) return
    await addRoutine(name.trim(), Number(cadence) || 1, steps.split(',').map(s => s.trim()).filter(Boolean))
    setName(''); setCadence('1'); setSteps(''); setShowForm(false)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.4rem 1.6rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', fontWeight: 400, letterSpacing: '0.02em' }}>Routines</div>
        <button onClick={() => setShowForm(o => !o)} style={{
          fontSize: '0.68rem', letterSpacing: '0.06em', color: 'var(--muted)',
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.3em 0.8em', cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          {showForm ? 'cancel' : '+ add routine'}
        </button>
      </div>

      {!loading && routines.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '1rem 0', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.78 }}>
          Nothing set up yet. A morning routine, a night routine — whatever starts and ends your day.
        </div>
      )}

      {routines.map(r => {
        const due = routineDue(r)
        const done = r.items.filter(i => i.done).length
        return (
          <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{r.name}</span>
              <span style={{ fontSize: '0.62rem', color: due < 0 ? 'var(--rose)' : 'var(--muted)' }}>
                {done}/{r.items.length} · {due < 0 ? `${-due}d overdue` : due === 0 ? 'due' : `in ${due}d`}
              </span>
            </div>
            {r.items.map((i: RoutineItem) => (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
                <button onClick={() => toggleRoutineItem(r.id, i.id)} className="press" style={{
                  width: '14px', height: '14px', borderRadius: '4px', border: '1px solid var(--border)', flexShrink: 0,
                  background: i.done ? 'var(--gold)' : 'transparent', cursor: 'pointer', padding: 0,
                }} />
                <span style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text)', opacity: i.done ? 0.45 : 1, textDecoration: i.done ? 'line-through' : 'none' }}>
                  {i.label}
                </span>
                {/* Per-step share, not per-routine — the rest of the routine
                    stays private no matter how many steps get shared. */}
                <button
                  onClick={() => toggleItemShared(r.id, i.id)}
                  title={i.shared ? 'Shared with partner' : 'Share this step with your partner'}
                  disabled={!spaceId}
                  style={{
                    background: 'none', border: 'none', cursor: spaceId ? 'pointer' : 'default', padding: 0, flexShrink: 0,
                    fontSize: '0.62rem', color: i.shared ? 'var(--gold)' : 'var(--muted)', opacity: i.shared ? 0.85 : 0.3,
                  }}
                >⇆</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
              <button onClick={() => markRoutineDone(r.id)} className="btn btn-secondary press" style={{ fontSize: '0.66rem' }}>Mark whole thing done</button>
              <button onClick={() => removeRoutine(r.id)} className="press" style={{ background: 'none', border: 'none', color: 'var(--muted)', opacity: 0.5, fontSize: '0.62rem', cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        )
      })}

      {showForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Routine name (e.g. Morning routine)" style={input} autoFocus />
          <input value={steps} onChange={e => setSteps(e.target.value)} placeholder="Steps, comma-separated (Make bed, Meditate, Journal...)" style={input} />
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Every</span>
            <input type="number" min="1" value={cadence} onChange={e => setCadence(e.target.value)} style={{ ...input, width: '60px' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>days</span>
            <button onClick={handleAdd} className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Save</button>
          </div>
        </div>
      )}

      {sharedFromPartner.length > 0 && (
        <div style={{ marginTop: '0.9rem', paddingTop: '0.8rem', borderTop: '1px solid var(--faint)' }}>
          <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.65, marginBottom: '0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            From your partner
          </div>
          {sharedFromPartner.map(s => (
            <div key={`${s.routine_id}-${s.item_id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
              <div style={{
                width: '14px', height: '14px', borderRadius: '4px', border: '1px solid var(--border)', flexShrink: 0,
                background: s.done ? 'var(--gold)' : 'transparent',
              }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text)', opacity: s.done ? 0.6 : 1 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
