'use client'

import { useEffect, useRef, useState } from 'react'
import PersonalRoutines from './PersonalRoutines'
import HabitTracker from './HabitTracker'
import GoalsSection from '@/components/goals/GoalsSection'

// The Habits section (2026-09-01) — routines + the habit grid, plus Goals
// folded in below as a collapsible. Goals stopped being its own nav pill;
// goToPersonal('goals') lands here and fires 4s:open-goals to expand it.
export default function HabitsTab({ userId }: { userId: string }) {
  const [goalsOpen, setGoalsOpen] = useState(false)
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    function open() {
      setGoalsOpen(true)
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    }
    window.addEventListener('4s:open-goals', open)
    return () => window.removeEventListener('4s:open-goals', open)
  }, [])

  return (
    <div>
      <PersonalRoutines userId={userId} />
      <HabitTracker />

      <details
        ref={ref}
        open={goalsOpen}
        onToggle={e => setGoalsOpen((e.currentTarget as HTMLDetailsElement).open)}
        style={{ marginTop: '1.6rem', borderTop: '1px solid var(--faint)', paddingTop: '1rem' }}
      >
        <summary style={{
          cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text)',
          fontFamily: 'var(--font-display, var(--font-body))', listStyle: 'none',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
        }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', transform: goalsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>▸</span>
          Goals
        </summary>
        <div style={{ marginTop: '0.9rem' }}>
          <GoalsSection userId={userId} />
        </div>
      </details>
    </div>
  )
}
