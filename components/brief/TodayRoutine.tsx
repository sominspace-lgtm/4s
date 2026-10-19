'use client'

import { useEffect, useState } from 'react'
import { usePersonalRoutines, routineDue, type PersonalRoutine } from '@/lib/hooks/usePersonalRoutines'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { countSteps } from '@/lib/routines/items'
import { routineStreak } from '@/lib/routines/streak'
import { goToSection } from '@/lib/utils/navigate'
import RoutineChecklist from '@/components/routines/RoutineChecklist'

// The routine for right now, on Today (2026-10-19). Morning routine first
// thing; through the day the "Don't wait to" list; from 5:30 in the evening
// the night routine. Tick steps right here. Matching is by name, so a
// routine called "Morning routine" or "Night routine" is picked up; anything
// else stays in Habits.

export type RoutinePart = 'morning' | 'day' | 'night'

export function partOfDay(d: Date = new Date()): RoutinePart {
  const m = d.getHours() * 60 + d.getMinutes()
  if (m >= 4 * 60 && m < 12 * 60) return 'morning'
  if (m >= 17 * 60 + 30 || m < 4 * 60) return 'night'
  return 'day'
}

export function routineFor(routines: PersonalRoutine[], part: RoutinePart): PersonalRoutine | null {
  const re = part === 'morning' ? /morning|wake/i : part === 'night' ? /night|evening|bed/i : /don.?t wait/i
  return routines.find(r => re.test(r.name)) ?? null
}

export default function TodayRoutine({ userId }: { userId: string }) {
  const { spaces } = useSharedSpaces(userId)
  const { routines, loading, toggleRoutineItem, markRoutineDone, toggleItemShared } = usePersonalRoutines(spaces[0]?.id ?? null)
  // Re-check the part of the day every few minutes, so it switches on its own.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 5 * 60_000); return () => clearInterval(t) }, [])
  const [open, setOpen] = useState(true)

  const part = partOfDay(now)
  const r = routineFor(routines, part)
  if (loading || !r) return null

  const { done, total } = countSteps(r.items, r.cadence_days)
  const finished = total > 0 && done === total
  const streak = routineStreak(r.done_days ?? [], now)
  const due = routineDue(r)

  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '0.9rem 1.1rem' }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{
        width: '100%', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem',
        background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left', minHeight: 36,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)' }}>{r.name}</span>
        <span style={{ fontSize: '0.76rem', color: finished ? 'var(--emerald)' : 'var(--muted)', flexShrink: 0 }}>
          {finished ? 'All done ✓' : total ? `${done} of ${total}` : ''}{streak.days > 1 ? ` · ${streak.days} days${streak.paused ? ', paused' : ''}` : ''}
        </span>
      </button>
      {open && !finished && (
        <div style={{ marginTop: '0.6rem' }}>
          <RoutineChecklist items={r.items} cadenceDays={r.cadence_days}
            onToggle={id => toggleRoutineItem(r.id, id)}
            onToggleShared={id => toggleItemShared(r.id, id)} canShare={!!spaces[0]} />
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem', flexWrap: 'wrap' }}>
            {total > 0 && <button onClick={() => markRoutineDone(r.id)} className="btn btn-secondary press" style={{ minHeight: 40 }}>All done</button>}
            <button onClick={() => goToSection('habits')} className="btn btn-ghost press" style={{ minHeight: 40 }}>All routines</button>
          </div>
        </div>
      )}
      {due < 0 && !finished && r.cadence_days > 1 && <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: '0.4rem' }}>Last done {-due + r.cadence_days} days ago.</div>}
    </section>
  )
}
