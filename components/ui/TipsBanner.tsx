'use client'

import { useEffect, useState } from 'react'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useCaptures } from '@/lib/hooks/useCaptures'
import { useHabits } from '@/lib/hooks/useHabits'

const TIPS = [
  { key: '⌘K', label: 'Quick capture — grab any thought instantly' },
  { key: '⊹', label: 'Customize — hide or reorder any section' },
  { key: '◐', label: 'Theme + Mode — change the look and tone' },
  { key: 'click name', label: 'Edit your name in the greeting' },
  { key: 'domain tile', label: 'Click any domain to expand and add notes' },
]

// Once a user has a handful of real items beyond whatever onboarding
// seeded, they're established — stop showing this automatically.
const ESTABLISHED_THRESHOLD = 5

export default function TipsBanner() {
  const [visible, setVisible] = useState(false)
  const { items } = useWorkItems()
  const { captures } = useCaptures()
  const { habits } = useHabits()

  useEffect(() => {
    const seen = localStorage.getItem('4s-tips-seen')
    if (!seen) setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return
    const activity = items.length + captures.length + habits.length
    if (activity >= ESTABLISHED_THRESHOLD) dismiss()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, captures.length, habits.length, visible])

  function dismiss() {
    localStorage.setItem('4s-tips-seen', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '1rem 1.2rem', marginBottom: '0.5rem',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.7rem' }}>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.7 }}>
          Quick start
        </span>
        <button onClick={dismiss} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.5, fontFamily: 'var(--font-body)',
          padding: '0.1rem 0.3rem',
        }}>got it ✕</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {TIPS.map(tip => (
          <div key={tip.key} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'var(--hover-bg)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '0.35rem 0.65rem',
          }}>
            <kbd style={{
              fontSize: '0.62rem', color: 'var(--gold)', background: 'var(--hover-bg)',
              border: '1px solid var(--border)', borderRadius: '4px',
              padding: '0.1em 0.4em', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
            }}>{tip.key}</kbd>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 300 }}>{tip.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
