'use client'

import { effectiveEnergy } from '@/lib/utils/energy'
import { dueUrgency, type WorkItem } from '@/lib/hooks/useWorkItems'
import type { Habit } from '@/lib/hooks/useHabits'

// One thing. Not a list, not a dashboard, not "here are your 7 areas" —
// the single next thing worth doing, stated as a sentence.
//
// This is the answer to "what is Today FOR". Everything else on the page
// is reference material you consult; this is the part you act on. It gets
// the display type, the accent border and the only primary button above
// the fold, because a page where six things compete for attention is a
// page with no focus at all.
//
// Deliberately NOT a productivity ranking. The order below is about what a
// person can actually do right now, not what's most "important":
//   1. something overdue — it's already weighing on you
//   2. something due today — it has a deadline attached
//   3. a habit you haven't done — small, and it keeps the streak honest
//   4. a light task — when energy is low, the win that's actually available
//   5. nothing — and nothing is a legitimate answer, not an empty state

interface Props {
  items: WorkItem[]
  habits: Habit[]
  habitsDueToday: Habit[]
  completedHabitIds: Set<string>
  lowEnergy: boolean
  onOpenTask: () => void
  onOpenHabit: () => void
}

interface Pick {
  kind: 'task' | 'habit' | 'rest'
  title: string
  why: string
  action: string
  run: () => void
}

export default function OneThing({
  items, habitsDueToday, completedHabitIds, lowEnergy, onOpenTask, onOpenHabit,
}: Props) {
  const open = items.filter(i => i.status !== 'done')
  const overdue = open.filter(i => dueUrgency(i.due_date) === 'overdue')
  const dueToday = open.filter(i => dueUrgency(i.due_date) === 'today')
  const undoneHabits = habitsDueToday.filter(h => !completedHabitIds.has(h.id))

  function choose(): Pick {
    // On a low-energy day, never lead with the hardest thing. A deep-focus
    // task presented to someone who already said they're depleted is just
    // a reminder that they can't do it.
    if (lowEnergy) {
      const light = open.find(i => effectiveEnergy(i) === 'light')
      if (light) {
        return { kind: 'task', title: light.title, why: 'Small, and it counts.', action: 'Open Tasks', run: onOpenTask }
      }
      if (undoneHabits.length > 0) {
        return { kind: 'habit', title: undoneHabits[0].name, why: 'One small thing, if you want it.', action: 'Open Habits', run: onOpenHabit }
      }
      return { kind: 'rest', title: 'Nothing today.', why: 'A low day is allowed to be a low day.', action: '', run: () => {} }
    }

    if (overdue.length > 0) {
      const o = overdue[0]
      return {
        kind: 'task', title: o.title,
        why: overdue.length > 1 ? `The oldest of ${overdue.length} that slipped. Just this one.` : 'This one slipped. Start here.',
        action: 'Open Tasks', run: onOpenTask,
      }
    }
    if (dueToday.length > 0) {
      return { kind: 'task', title: dueToday[0].title, why: 'Due today.', action: 'Open Tasks', run: onOpenTask }
    }
    if (undoneHabits.length > 0) {
      return { kind: 'habit', title: undoneHabits[0].name, why: 'Waiting for you today.', action: 'Open Habits', run: onOpenHabit }
    }
    if (open.length > 0) {
      return { kind: 'task', title: open[0].title, why: 'Nothing is urgent — so pick the one you want.', action: 'Open Tasks', run: onOpenTask }
    }
    return { kind: 'rest', title: 'Nothing needs you.', why: 'Genuinely. The queue is clear.', action: '', run: () => {} }
  }

  const pick = choose()
  const resting = pick.kind === 'rest'

  return (
    <div
      className="fade-in organic"
      style={{
        border: `1px solid ${resting ? 'var(--border)' : 'color-mix(in srgb, var(--gold) 32%, var(--border))'}`,
        borderLeft: resting ? '1px solid var(--border)' : '3px solid var(--gold)',
        background: resting
          ? 'var(--surface)'
          : 'linear-gradient(120deg, color-mix(in srgb, var(--gold) 7%, var(--surface)), var(--surface) 60%)',
        boxShadow: 'var(--elev-2)',
        padding: '1.35rem 1.5rem',
      }}
    >
      <div className="t-label" style={{ marginBottom: '0.5rem' }}>
        {resting ? 'Today' : 'One thing'}
      </div>

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.5rem, 3.2vw, 2.1rem)',
          fontWeight: 400, lineHeight: 1.2, color: 'var(--text)',
          letterSpacing: '-0.01em',
        }}
      >
        {pick.title}
      </div>

      <div style={{ fontSize: 'var(--text-body)', color: 'var(--muted)', marginTop: '0.45rem', lineHeight: 1.5 }}>
        {pick.why}
      </div>

      {!resting && (
        <button onClick={pick.run} className="btn btn-primary press" style={{ marginTop: '1rem', fontSize: '0.76rem' }}>
          {pick.action} →
        </button>
      )}
    </div>
  )
}
