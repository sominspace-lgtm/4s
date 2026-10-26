'use client'

import { withUndo } from '@/lib/ui/undo'
import { useEffect, useState } from 'react'
import { usePersonalRoutines, routineDue } from '@/lib/hooks/usePersonalRoutines'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { countSteps, parseRoutineText } from '@/lib/routines/items'
import { MY_ROUTINES } from '@/lib/routines/presets'
import { routineStreak } from '@/lib/routines/streak'
import { getLast7Days } from '@/lib/utils/habits'
import RoutineEditor from '@/components/routines/RoutineEditor'
import RoutineChecklist from '@/components/routines/RoutineChecklist'

const input: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.85rem',
  fontWeight: 300, padding: '0.5rem 0.7rem', outline: 'none',
}
const MINE_KEY = '4s:my-routines-offer-done'

const smallBtn: React.CSSProperties = {
  fontSize: '0.78rem', color: 'var(--muted)', background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '0 0.9em', minHeight: 40, cursor: 'pointer', fontFamily: 'var(--font-body)',
}

// Morning routine, night routine — a checklist you run through once a
// cadence period, not a daily tick-box grid like a habit. Lives above the
// habit list on purpose: it's the first thing that happens in a day, so it
// reads first.
//
// 2026-10-15: every routine can be edited (name, how often, sections, steps,
// notes), a routine can be pasted in as text, and ticks reset each period, so
// a daily routine starts fresh each morning.
// Routines live inside the habits card now (2026-10-23): each one shows the
// same week of dots a habit does, filled on the days it was finished.
export default function PersonalRoutines({ userId, embedded = false }: { userId: string; embedded?: boolean }) {
  const week = getLast7Days()
  const { spaces } = useSharedSpaces(userId)
  const spaceId = spaces[0]?.id ?? null
  const { routines, sharedFromPartner, loading, addRoutine, updateRoutine, removeRoutine, toggleRoutineItem, markRoutineDone, toggleItemShared } =
    usePersonalRoutines(spaceId)

  const [mode, setMode] = useState<'none' | 'new' | 'paste'>('none')
  const [editing, setEditing] = useState<string | null>(null)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [paste, setPaste] = useState('')
  const [note, setNote] = useState<string | null>(null)

  // The offer to add your own routines goes away once you add them or say no.
  const [dismissed, setDismissed] = useState(true)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read a saved choice once
    try { setDismissed(localStorage.getItem(MINE_KEY) === '1') } catch { setDismissed(false) }
  }, [])
  const dismiss = () => { setDismissed(true); try { localStorage.setItem(MINE_KEY, '1') } catch { /* private mode */ } }

  const have = new Set(routines.map(r => r.name.toLowerCase()))
  const missingMine = dismissed ? [] : MY_ROUTINES.filter(r => !have.has(r.name.toLowerCase()))

  async function addMine() {
    for (const r of missingMine) {
      const e = await addRoutine(r.name, 1, r.items)
      if (e) { setNote(e); return }
    }
    setNote(null); dismiss()
  }

  async function addPasted() {
    const parsed = parseRoutineText(paste)
    if (parsed.length === 0) { setNote('I could not find any steps. Put each step on its own line starting with a dash.'); return }
    for (const r of parsed) {
      const e = await addRoutine(r.name, 1, r.items)
      if (e) { setNote(e); return }
    }
    setPaste(''); setMode('none'); setNote(null)
  }

  const toggleOpen = (id: string) => setOpen(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })

  return (
    <div style={embedded ? { marginBottom: '1.1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--faint)' } : { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.2rem 1.2rem', marginBottom: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
        <div className={embedded ? 't-label' : undefined} style={embedded ? undefined : { fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', fontWeight: 400, letterSpacing: '0.02em' }}>Routines</div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button onClick={() => setMode(m => (m === 'paste' ? 'none' : 'paste'))} style={smallBtn}>{mode === 'paste' ? 'Cancel' : 'Paste a routine'}</button>
          <button onClick={() => setMode(m => (m === 'new' ? 'none' : 'new'))} style={smallBtn}>{mode === 'new' ? 'Cancel' : '+ New'}</button>
        </div>
      </div>

      {missingMine.length > 0 && !loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.9rem', padding: '0.7rem 0.8rem', borderRadius: 10, background: 'color-mix(in srgb, var(--gold) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 25%, var(--border))' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text)', flex: 1, minWidth: '12rem' }}>Your {missingMine.map(r => r.name.toLowerCase()).join(', ')} are ready to add.</span>
          <button onClick={addMine} className="btn btn-primary press" style={{ minHeight: 40 }}>Add my routines</button>
          <button onClick={dismiss} style={{ ...smallBtn, border: 'none' }}>No thanks</button>
        </div>
      )}

      {mode === 'paste' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.9rem' }}>
          <textarea value={paste} onChange={e => setPaste(e.target.value)} rows={8} style={{ ...input, resize: 'vertical', lineHeight: 1.5 }}
            placeholder={'MORNING ROUTINE\n**6:00 AM — Coffee**\n- Make coffee\n- Drink water'} />
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            A line on its own is the routine&rsquo;s name. A bold line is a section, with a time before a dash if you like. Each step starts with a dash.
          </div>
          <button onClick={addPasted} className="btn btn-primary press" style={{ alignSelf: 'flex-start', minHeight: 40 }}>Add</button>
        </div>
      )}

      {mode === 'new' && (
        <div style={{ marginBottom: '0.9rem' }}>
          <RoutineEditor name="" cadenceDays={1} items={[]}
            onCancel={() => setMode('none')}
            onSave={async p => { const e = await addRoutine(p.name, p.cadence_days, p.items); if (!e) setMode('none'); return e }} />
        </div>
      )}

      {note && <div style={{ fontSize: '0.8rem', color: 'var(--rose)', marginBottom: '0.6rem' }}>{note}</div>}

      {!loading && routines.length === 0 && mode === 'none' && missingMine.length === 0 && (
        <div style={{ textAlign: 'center', padding: '1rem 0', fontSize: '0.8rem', color: 'var(--muted)', opacity: 0.8 }}>
          Nothing set up yet. A morning routine, a night routine, whatever starts and ends your day.
        </div>
      )}

      {routines.map(r => {
        const due = routineDue(r)
        const { done, total } = countSteps(r.items, r.cadence_days)
        const isOpen = open.has(r.id)
        if (editing === r.id) {
          return (
            <div key={r.id} style={{ border: '1px solid var(--gold)', borderRadius: '12px', padding: '0.8rem', marginBottom: '0.7rem' }}>
              <RoutineEditor name={r.name} cadenceDays={r.cadence_days} items={r.items}
                onCancel={() => setEditing(null)}
                onSave={async p => { const e = await updateRoutine(r.id, p); if (!e) setEditing(null); return e }}
                onDelete={() => { setEditing(null); withUndo(`Deleting "${r.name}"`, () => removeRoutine(r.id)) }} />
            </div>
          )
        }
        return (
          <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '0.4rem 0.8rem', marginBottom: '0.6rem' }}>
            <button onClick={() => toggleOpen(r.id)} aria-expanded={isOpen} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', minHeight: 44,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--font-body)', textAlign: 'left',
            }}>
              <span style={{ fontSize: '0.92rem', color: 'var(--text)', flex: 1, minWidth: 0 }}>{r.name}</span>
              <span aria-label="This week" style={{ display: 'inline-flex', gap: 3, flexShrink: 0 }}>
                {week.map(d => (
                  <span key={d} title={d} style={{ width: 9, height: 9, borderRadius: '50%', border: '1px solid color-mix(in srgb, var(--emerald) 45%, var(--border))', background: (r.done_days ?? []).includes(d) ? 'var(--emerald)' : 'transparent' }} />
                ))}
              </span>
              <span style={{ fontSize: '0.74rem', color: done === total && total > 0 ? 'var(--emerald)' : due < 0 ? 'var(--rose)' : 'var(--muted)', flexShrink: 0 }}>
                {total > 0 ? `${done}/${total}` : ''}{(() => { const st = routineStreak(r.done_days ?? []); return st.days > 1 ? ` · ${st.days} days${st.paused ? ', paused' : ''}` : '' })()}{r.cadence_days !== 1 ? ` · every ${r.cadence_days}d` : ''} {isOpen ? '▴' : '▾'}
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: '0.3rem 0 0.6rem' }}>
                <RoutineChecklist items={r.items} cadenceDays={r.cadence_days}
                  onToggle={id => toggleRoutineItem(r.id, id)}
                  onToggleShared={id => toggleItemShared(r.id, id)} canShare={!!spaceId} />
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.8rem', flexWrap: 'wrap' }}>
                  <button onClick={() => markRoutineDone(r.id)} className="btn btn-secondary press" style={{ minHeight: 40 }}>All done</button>
                  <button onClick={() => setEditing(r.id)} style={smallBtn}>Edit</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {sharedFromPartner.length > 0 && (
        <div style={{ marginTop: '0.9rem', paddingTop: '0.8rem', borderTop: '1px solid var(--faint)' }}>
          <div style={{ fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.7, marginBottom: '0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            From your partner
          </div>
          {sharedFromPartner.map(s => (
            <div key={`${s.routine_id}-${s.item_id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '5px', border: '1px solid var(--border)', flexShrink: 0,
                background: s.done ? 'var(--gold)' : 'transparent',
              }} />
              <span style={{ fontSize: '0.84rem', color: 'var(--text)', opacity: s.done ? 0.6 : 1 }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
