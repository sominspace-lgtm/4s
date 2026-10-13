'use client'

import { useEffect, useState } from 'react'
import { useKitchenTimers } from '@/lib/hooks/useKitchenTimers'
import { detectTimers, clock } from '@/lib/recipes/time'
import type { Ingredient } from '@/lib/recipes/ingredients'

// Cook mode (2026-10-13): one step at a time, big enough to read across the
// counter, the screen kept awake, and a one-tap timer for any time written in
// the step ("simmer 10 minutes"). Ingredients sit one tap away.

export default function CookMode({ title, steps, ingredients, onClose, onDone }: {
  title: string; steps: string[]; ingredients: Ingredient[]; onClose: () => void; onDone: () => void
}) {
  const [i, setI] = useState(0)
  const [showIng, setShowIng] = useState(false)
  const timers = useKitchenTimers()

  // Keep the screen on while cooking. Not every browser allows it; that is fine.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then(l => { lock = l }).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [])

  const step = steps[i] ?? ''
  const found = detectTimers(step)
  const last = i >= steps.length - 1
  const btn: React.CSSProperties = { fontSize: '1rem', padding: '0.7em 1.4em', borderRadius: '999px', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'var(--font-body)' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'var(--bg)', color: 'var(--text)', display: 'flex', flexDirection: 'column', padding: 'max(1rem, env(safe-area-inset-top)) 1.2rem max(1rem, env(safe-area-inset-bottom))' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowIng(s => !s)} style={{ ...btn, fontSize: '0.8rem', padding: '0.4em 1em' }}>{showIng ? 'Hide ingredients' : 'Ingredients'}</button>
          <button onClick={onClose} style={{ ...btn, fontSize: '0.8rem', padding: '0.4em 1em' }}>Close</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.2rem', maxWidth: '40rem', width: '100%', margin: '0 auto', padding: '1rem 0' }}>
        {showIng ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: '1.15rem', lineHeight: 1.9 }}>
            {ingredients.map(g => <li key={g.id}>{g.text}</li>)}
          </ul>
        ) : (
          <>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Step {i + 1} of {steps.length}</div>
            <div style={{ fontSize: 'clamp(1.4rem, 4.5vw, 2rem)', lineHeight: 1.45, fontFamily: 'var(--font-display)' }}>{step}</div>
            {found.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {found.map(t => (
                  <button key={t.label} onClick={() => timers.add(`${title}: ${t.label}`, t.seconds)} style={{ ...btn, fontSize: '0.9rem', borderColor: 'var(--gold)', color: 'var(--gold)' }}>
                    Start {t.label} timer
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {timers.timers.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', paddingBottom: '0.6rem' }}>
          {timers.timers.map(t => (
            <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35em 0.9em', borderRadius: '999px', border: `1px solid ${t.rang ? 'var(--rose)' : 'var(--border)'}`, fontSize: '0.85rem', color: t.rang ? 'var(--rose)' : 'var(--text)' }}>
              <span style={{ maxWidth: '10rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
              <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{t.rang ? 'Done' : clock(t.left)}</strong>
              {!t.rang && <button onClick={() => (t.running ? timers.pause(t.id) : timers.start(t.id))} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>{t.running ? 'Pause' : 'Start'}</button>}
              <button onClick={() => timers.remove(t.id)} aria-label="Remove timer" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>✕</button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', maxWidth: '40rem', width: '100%', margin: '0 auto' }}>
        <button disabled={i === 0} onClick={() => setI(n => Math.max(0, n - 1))} style={{ ...btn, opacity: i === 0 ? 0.4 : 1 }}>Back</button>
        {last
          ? <button onClick={onDone} style={{ ...btn, background: 'var(--gold)', color: 'var(--bg)', borderColor: 'var(--gold)' }}>We made it</button>
          : <button onClick={() => setI(n => n + 1)} style={{ ...btn, background: 'var(--gold)', color: 'var(--bg)', borderColor: 'var(--gold)' }}>Next</button>}
      </div>
    </div>
  )
}
