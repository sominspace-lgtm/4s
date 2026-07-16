'use client'

import { useState } from 'react'
import { goToSection } from '@/lib/utils/navigate'
import type { UnlockStage, ActionKey } from '@/lib/hooks/useProgression'

// The journey bar IS the tutorial: each row names one concrete action, says
// why the section it unlocks is worth having, and — for the very next
// undone row — offers a one-click button that performs the real action
// (the same events the Brief's own "+ Add task" / "+ Capture thought"
// buttons use). Actions already done during onboarding (the default habit,
// the optional first capture) show up checked off on the very first load —
// nobody is asked to redo what they just did.

function runAction(action: ActionKey) {
  switch (action) {
    case 'task':
      goToSection('work')
      setTimeout(() => window.dispatchEvent(new CustomEvent('app:open-add-task')), 80)
      return
    case 'capture':
      goToSection('brief')
      setTimeout(() => window.dispatchEvent(new CustomEvent('app:focus-capture')), 80)
      return
    case 'habit':
    case 'checkHabit':
      goToSection('habits')
      return
    case 'completeTask':
      goToSection('work')
      return
  }
}

interface Stage extends UnlockStage { done: boolean }

interface Props {
  unlockedCount: number
  total: number
  percent: number
  stages: Stage[]
  next: Stage | null
  onOpenEverything: () => void
}

const INTRO_KEY = '4s-journey-intro-dismissed'

export default function JourneyBar({ unlockedCount, total, percent, stages, next, onOpenEverything }: Props) {
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
        display: 'flex', flexDirection: 'column', gap: '0.7rem',
        padding: '0.75rem 0.95rem', borderRadius: '12px',
        border: '1px solid var(--border)', background: 'var(--hover-bg)',
      }}>
        {/* Progress row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px', minWidth: '160px' }}>
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
          <button onClick={onOpenEverything} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0',
            fontFamily: 'var(--font-body)', fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.8,
            textDecoration: 'underline', textUnderlineOffset: '3px', flexShrink: 0,
          }}>
            open everything now
          </button>
        </div>

        {showIntro && (
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap',
            fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.6,
            borderTop: '1px solid var(--faint)', paddingTop: '0.55rem',
          }}>
            <span style={{ flex: '1 1 260px' }}>
              4S grows with you — each thing you try unlocks the next area, so it never opens overwhelming.{' '}
              <a href="/guide" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>Or take the 2-minute tour →</a>
            </span>
            <button onClick={dismissIntro} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.7, flexShrink: 0,
            }}>
              Got it ✕
            </button>
          </div>
        )}

        {/* The checklist — this is the tutorial */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', borderTop: '1px solid var(--faint)', paddingTop: '0.55rem' }}>
          {stages.map(s => {
            const isNext = !s.done && next?.id === s.id
            return (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                opacity: s.done ? 0.55 : isNext ? 1 : 0.75,
              }}>
                <span aria-hidden style={{
                  width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', lineHeight: 1,
                  background: s.done ? 'var(--gold)' : 'transparent',
                  color: s.done ? 'var(--bg)' : 'var(--muted)',
                  border: s.done ? 'none' : `1px solid ${isNext ? 'var(--gold)' : 'var(--border)'}`,
                }}>
                  {s.done ? '✓' : ''}
                </span>
                <span aria-hidden style={{ fontSize: '0.8rem', color: isNext ? 'var(--gold)' : 'var(--muted)', flexShrink: 0 }}>{s.icon}</span>
                <span style={{ fontSize: '0.74rem', flex: '0 0 auto', color: s.done ? 'var(--muted)' : 'var(--text)', textDecoration: s.done ? 'line-through' : 'none' }}>
                  {s.label}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--muted)', flex: '1 1 auto' }}>
                  {s.done ? s.teaser : isNext ? s.milestone : s.teaser}
                </span>
                {isNext && s.action && (
                  <button onClick={() => runAction(s.action!)} style={{
                    padding: '0.32rem 0.7rem', borderRadius: '8px', cursor: 'pointer', flexShrink: 0,
                    border: '1px solid color-mix(in srgb, var(--gold) 40%, var(--border))',
                    background: 'color-mix(in srgb, var(--gold) 12%, transparent)',
                    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.68rem', whiteSpace: 'nowrap',
                  }}>
                    Try it →
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
