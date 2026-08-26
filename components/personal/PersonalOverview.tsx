'use client'

import { useState } from 'react'
import { useWorkItems, dueUrgency } from '@/lib/hooks/useWorkItems'
import { useHabits, isDueOn } from '@/lib/hooks/useHabits'
import { useGoals } from '@/lib/hooks/useGoals'
import { useCaptures } from '@/lib/hooks/useCaptures'
import { useFocusItems } from '@/lib/hooks/useFocusItems'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useHousehold, choreDue } from '@/lib/hooks/useHousehold'
import { useRoutines, routineDue } from '@/lib/hooks/useRoutines'
import PulseItem from '@/components/pulse/PulseItem'
import { goToPersonal, goToHousehold } from '@/lib/utils/navigate'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'

// A control-center strip above Personal's own sub-tabs (2026-08-21) — the
// thing you glance at before deciding which sub-tab to actually open, so it
// deliberately duplicates nothing that tab already shows in full: no task
// list, no habit tracker, just enough of each to answer "where do I stand"
// and a fast way to jot something down without leaving Personal at all.
//
// Every number here is read from hooks other tabs already own — no new
// tables, no separate source of truth to drift out of sync with Tasks,
// Habits, or Goals.
export default function PersonalOverview({ userId }: { userId: string }) {
  const { items: workItems } = useWorkItems()
  const { habits, completions } = useHabits()
  const { spaces, members } = useSharedSpaces(userId)
  // Prefer a space that actually has an accepted member, same as
  // HouseholdHub's own spaceId logic — otherwise this can silently pick an
  // old, empty solo space instead of the real shared one.
  const householdSpaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id
    ?? spaces[0]?.id ?? null
  const goalsHook = useGoals(householdSpaceId)
  const household = useHousehold(householdSpaceId)
  const routinesHook = useRoutines(householdSpaceId)
  const { captures, add: addCapture } = useCaptures()
  const { items: focusItems, snooze } = useFocusItems()

  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const today = format(new Date(), 'yyyy-MM-dd')
  const openTasks = workItems.filter(i => i.status !== 'done')
  const overdue = openTasks.filter(i => dueUrgency(i.due_date) === 'overdue')
  const dueToday = openTasks.filter(i => dueUrgency(i.due_date) === 'today')
  const habitsDue = habits.filter(h => isDueOn(h, today, completions[h.id] ?? []))
  const habitsDone = habitsDue.filter(h => (completions[h.id] ?? []).includes(today))
  const staleGoals = goalsHook.stale

  // "Coming up" used to be personal tasks only — but Household is the one
  // tab both people already share, and its chores/routines were invisible
  // from Personal entirely (2026-08-26 — "household is just the tab both
  // users can share and see", so its due dates belong in the same glance as
  // everything else coming up, not siloed behind its own tab). Each source
  // uses its own "days until due" convention (task due_date vs.
  // choreDue/routineDue's day-count) so everything sorts on one shared key
  // regardless of where it lives.
  type ComingUpItem = { id: string; title: string; dueDays: number; dueLabel: string; badge?: string; onClick: () => void }

  const tasksUpcoming: ComingUpItem[] = openTasks
    .filter(i => i.due_date && dueUrgency(i.due_date) !== 'overdue' && dueUrgency(i.due_date) !== 'today')
    .map(i => ({
      id: `task-${i.id}`, title: i.title,
      dueDays: differenceInCalendarDays(parseISO(i.due_date!), new Date()),
      dueLabel: i.due_date!,
      onClick: () => goToPersonal('tasks'),
    }))

  const choresUpcoming: ComingUpItem[] = household.chores
    .map(c => ({ c, due: choreDue(c) }))
    .filter(({ c, due }) => c.last_done_at && due > 0 && due <= 14)
    .map(({ c, due }) => ({
      id: `chore-${c.id}`, title: c.name, dueDays: due, dueLabel: `in ${due}d`,
      badge: 'Household', onClick: () => goToHousehold('reference'),
    }))

  const routinesUpcoming: ComingUpItem[] = routinesHook.routines
    .map(r => ({ r, due: routineDue(r) }))
    .filter(({ r, due }) => r.last_done_at && due > 0 && due <= 14)
    .map(({ r, due }) => ({
      id: `routine-${r.id}`, title: r.name, dueDays: due, dueLabel: `in ${due}d`,
      badge: 'Household', onClick: () => goToHousehold('reference'),
    }))

  const upcoming = [...tasksUpcoming, ...choresUpcoming, ...routinesUpcoming]
    .sort((a, b) => a.dueDays - b.dueDays)
    .slice(0, 5)

  async function submitNote(e: React.FormEvent) {
    e.preventDefault()
    const text = note.trim()
    if (!text) return
    setSaving(true)
    await addCapture(text)
    setNote('')
    setSaving(false)
  }

  const stat = (value: number | string, label: string, color?: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <span style={{ fontSize: '1.35rem', fontFamily: 'var(--font-display)', color: color ?? 'var(--text)', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>{label}</span>
    </div>
  )

  return (
    <div className="organic" style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
      padding: '1.3rem 1.5rem', marginBottom: '1.1rem', display: 'flex', flexDirection: 'column', gap: '1.1rem',
    }}>
      {/* Progress row */}
      <div style={{ display: 'flex', gap: '1.8rem', flexWrap: 'wrap' }}>
        {stat(openTasks.length, 'Open tasks')}
        {overdue.length > 0 && stat(overdue.length, 'Overdue', 'var(--rose)')}
        {dueToday.length > 0 && stat(dueToday.length, 'Due today', 'var(--amber)')}
        {stat(`${habitsDone.length}/${habitsDue.length}`, 'Habits today')}
        {staleGoals.length > 0 && (
          <button onClick={() => goToPersonal('goals')} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
            {stat(staleGoals.length, staleGoals.length === 1 ? 'Goal gone quiet' : 'Goals gone quiet', 'var(--muted)')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        {/* Upcoming deadlines */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
            Coming up
          </div>
          {upcoming.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>Nothing dated ahead. Good, or worth scheduling something.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {upcoming.map(i => (
                <button key={i.id} onClick={i.onClick} className="press" style={{
                  background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
                  fontSize: '0.8rem', color: 'var(--text)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem',
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'baseline', gap: '0.4rem', minWidth: 0 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</span>
                    {i.badge && (
                      <span style={{ fontSize: '0.56rem', color: 'var(--muted)', opacity: 0.7, border: '1px solid var(--border)', borderRadius: '6px', padding: '0.05em 0.4em', flexShrink: 0 }}>
                        {i.badge}
                      </span>
                    )}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.7rem', flexShrink: 0 }}>{i.dueLabel}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Focus items — same data and component as Today's "On your mind",
            trimmed to what's currently active (not snoozed, per the hook). */}
        {focusItems.length > 0 && (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              On your mind
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {focusItems.slice(0, 3).map(i => <PulseItem key={i.id} item={i} onSnooze={snooze} />)}
            </div>
          </div>
        )}
      </div>

      {/* Quick note — lands in the same inbox Today's capture bar feeds,
          so it's picked up wherever captures are already triaged. */}
      <form onSubmit={submitNote} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          value={note} onChange={e => setNote(e.target.value)}
          placeholder={captures.length > 0 ? `Quick note… (${captures.length} in inbox)` : 'Quick note or reminder…'}
          style={{
            flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '9px',
            padding: '0.55rem 0.8rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', outline: 'none',
          }}
        />
        <button type="submit" disabled={saving || !note.trim()} className="btn btn-primary press" style={{
          fontSize: '0.72rem', padding: '0.55em 1em', opacity: (saving || !note.trim()) ? 0.5 : 1,
        }}>
          Add
        </button>
      </form>
    </div>
  )
}
