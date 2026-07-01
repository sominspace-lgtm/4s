'use client'

import { useEffect, useState } from 'react'

const TIPS = [
  { key: '⌘K', label: 'Quick capture — grab any thought instantly' },
  { key: '⊹', label: 'Customize — hide or reorder any section' },
  { key: '◐', label: 'Theme + Mode — change the look and tone' },
  { key: 'click name', label: 'Edit your name in the greeting' },
  { key: 'domain tile', label: 'Click any domain to expand and add notes' },
]

export default function TipsBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem('4s-tips-seen')
    if (!seen) setVisible(true)
  }, [])

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
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
            borderRadius: '8px', padding: '0.35rem 0.65rem',
          }}>
            <kbd style={{
              fontSize: '0.62rem', color: 'var(--gold)', background: 'rgba(255,255,255,0.04)',
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
