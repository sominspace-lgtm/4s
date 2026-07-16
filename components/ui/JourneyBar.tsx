'use client'

import { useState } from 'react'
import { goToSection } from '@/lib/utils/navigate'

// The journey bar doubles as a first-run tutorial: it doesn't just report
// progress, it hands new users a one-click way to take the next real action
// (dispatching the same events the Brief's own "+ Add task" / "+ Capture
// thought" buttons use) and a way to understand the whole system (link to
// the existing guided tour at /guide). Nothing here is invented UI — it
// drives the app's real quick-action events, just from one more place.

function tryAddTask() {
  goToSection('work')
  // Work tab renders after this event's state update flushes; give React a
  // beat to mount MasterDashboard before it dispatches app:open-add-task.
  setTimeout(() => window.dispatchEvent(new CustomEvent('app:open-add-task')), 80)
}
function tryCapture() {
  goToSection('brief')
  setTimeout(() => window.dispatchEvent(new CustomEvent('app:focus-capture')), 80)
}
function tryHabits() {
  goToSection('habits')
}

const actionBtn: React.CSSProperties = {
  padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
  border: '1px solid color-mix(in srgb, var(--gold) 35%, var(--border))',
  background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.72rem',
  whiteSpace: 'nowrap',
}

interface Props {
  unlockedCount: number
  total: number
  percent: number
  nextLabel: string | null
  nextHint: string
  remaining: number
  habitsUnlocked: boolean
  onOpenEverything: () => void
}

const INTRO_KEY = '4s-journey-intro-dismissed'

export default function JourneyBar({ unlockedCount, total, percent, nextLabel, nextHint, remaining, habitsUnlocked, onOpenEverything }: Props) {
  // Auto-open the explainer the first time anyone sees the bar; stays closed
  // for good once dismissed. Cosmetic onboarding chrome, so localStorage is
  // fine — no need for a user_prefs round trip.
  const [showIntro, setShowIntro] = useState(() =>
    typeof window !== 'undefined' && !localStorage.getItem(INTRO_KEY)
  )
  function dismissIntro() {
    setShowIntro(false)
    if (typeof window !== 'undefined') localStorage.setItem(INTRO_KEY, '1')
  }

  return (
    <div style={{ maxWidth: 'min(1080px, 94vw)', margin: '0.9rem auto 0', padding: '0 2rem' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '0.65rem',
        padding: '0.7rem 0.9rem', borderRadius: '12px',
        border: '1px solid var(--border)', background: 'var(--hover-bg)',
      }}>
        {/* Progress row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.66rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                Your OS · {unlockedCount} of {total} areas awake
              </span>
              <span style={{ fontSize: '0.66rem', color: 'var(--gold)' }}>{percent}%</span>
            </div>
            <div style={{ height: '3px', borderRadius: '3px', background: 'var(--faint)', overflow: 'hidden' }}>
              <div style={{ width: `${percent}%`, height: '100%', background: 'var(--gold)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
            </div>
          </div>
          {nextLabel && (
            <span style={{ fontSize: '0.68rem', color: 'var(--muted)', flex: '2 1 220px' }}>
              Next: <span style={{ color: 'var(--text)' }}>{nextLabel}</span>
              {' — '}{nextHint} ({remaining} to go)
            </span>
          )}
          <button onClick={onOpenEverything} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0',
            fontFamily: 'var(--font-body)', fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.8,
            textDecoration: 'underline', textUnderlineOffset: '3px', flexShrink: 0,
          }}>
            open everything now
          </button>
        </div>

        {/* One-time explainer */}
        {showIntro && (
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap',
            fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.6,
            borderTop: '1px solid var(--faint)', paddingTop: '0.55rem',
          }}>
            <span style={{ flex: '1 1 260px' }}>
              4S grows with you — new areas unlock as you use it, so it never opens overwhelming.
              Try one of the actions below to speed things up, or{' '}
              <a href="/guide" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>take the 2-minute tour →</a>
            </span>
            <button onClick={dismissIntro} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.7, flexShrink: 0,
            }}>
              Got it ✕
            </button>
          </div>
        )}

        {/* Do-it-now actions — real quick actions, one click away */}
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button onClick={tryAddTask} style={actionBtn}>+ Add a task</button>
          <button onClick={tryCapture} style={actionBtn}>+ Capture a thought</button>
          {habitsUnlocked && <button onClick={tryHabits} style={actionBtn}>✓ Check off a habit</button>}
        </div>
      </div>
    </div>
  )
}
