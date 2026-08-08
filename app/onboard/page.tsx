'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeProvider from '@/components/ui/ThemeProvider'

// ARRIVAL, not setup.
//
// This used to be a five-step wizard: name → domains → theme → first habit →
// first thought, all before anything had been shown to work. That asked
// someone to make five decisions about a product they had not yet
// experienced, and it's where the one blocking bug of this work lived (a
// failed session check left the button spinning forever with no message).
//
// The replacement: three lines of philosophy you can skip, then ONE input.
// Everything the wizard used to demand is now either defaulted (theme,
// guide), asked later at the moment it's useful (name, domains), or simply
// dropped (templates). Target is under 45 seconds from landing to having
// something real in your village — the old flow took two to four minutes.
//
// Everything here still degrades safely: every exit either lands on the
// dashboard or says what went wrong and lets you retry.

const PANELS = [
  {
    line: 'Your life is not a list to complete.',
    sub: 'It is a world to care for.',
  },
  {
    line: 'Nothing here grows because you used an app.',
    sub: 'It grows because you lived.',
  },
  {
    line: 'Start with one thing.',
    sub: 'The rest can wait until it matters.',
  },
]

// A tiny village that fills in across the three panels — the same visual
// language as the real thing, so the promise and the product match.
function MiniVillage({ step }: { step: number }) {
  const plants = Math.min(step + 1, 3)
  return (
    <svg viewBox="0 0 280 90" style={{ width: '100%', maxWidth: '280px', height: 'auto', margin: '0 auto' }} aria-hidden>
      <path d="M 0 74 Q 70 62 140 70 T 280 64 L 280 90 L 0 90 Z" fill="var(--surface)" opacity={0.9} />
      <path d="M 0 74 Q 70 62 140 70 T 280 64" fill="none" stroke="var(--border)" strokeWidth={1} />
      <g transform="translate(140 70)">
        <rect x={-15} y={-22} width={30} height={22} rx={2} fill="var(--surface2)" stroke="var(--border)" />
        <path d="M -19 -22 L 0 -34 L 19 -22 Z" fill="var(--gold)" fillOpacity={0.5} />
        <rect x={-4} y={-12} width={8} height={12} fill="var(--gold)" opacity={0.3} />
      </g>
      {/* plants appear as you read */}
      {[60, 92, 210].slice(0, plants).map((x, i) => (
        <g key={x} transform={`translate(${x} 72)`} className="grew">
          <rect x={-1} y={-14 - i * 5} width={2} height={14 + i * 5} fill="var(--emerald)" opacity={0.7} />
          <circle cy={-16 - i * 5} r={5 + i * 1.6} fill="var(--emerald)" opacity={0.75} />
        </g>
      ))}
    </svg>
  )
}

export default function OnboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(0)     // 0..2 = philosophy, 3 = the one input
  const [thought, setThought] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // One write, one navigation, every failure surfaced. `finally` guarantees
  // the button can never be left stuck — the exact bug this page used to have.
  async function finish(withThought: boolean) {
    setSaving(true)
    setError(null)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        setError("We couldn't confirm your session. What you typed is still here — try again.")
        return
      }

      if (withThought && thought.trim()) {
        const { error: capErr } = await supabase.from('captures')
          .insert({ user_id: user.id, text: thought.trim() })
        // A failed capture is worth logging, but it must never trap someone
        // on the doorstep — they can always capture again inside.
        if (capErr) console.error('First capture failed:', capErr.message)
      }

      const { error: prefsError } = await supabase.from('user_prefs').upsert({
        user_id: user.id,
        onboarded: true,
        theme: 'sunset',     // changeable any time from the header ◐
        mode: 'peaceful',    // the calm default; the app suggests others later
      })
      if (prefsError) {
        setError(`We couldn't save your setup: ${prefsError.message}`)
        return
      }

      router.push('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const onPhilosophy = step < PANELS.length

  return (
    <ThemeProvider theme="sunset">
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        backgroundImage: 'radial-gradient(ellipse at top right, var(--aurora-1) 0%, transparent 55%), radial-gradient(ellipse at bottom left, var(--aurora-2) 0%, transparent 55%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem', fontFamily: 'var(--font-body)', color: 'var(--text)',
      }}>
        <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>

          <MiniVillage step={step} />

          {onPhilosophy ? (
            <div key={step} className="fade-in" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: 300, lineHeight: 1.25 }}>
                {PANELS[step].line}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                {PANELS[step].sub}
              </div>
            </div>
          ) : (
            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.3rem, 4.5vw, 1.7rem)', fontWeight: 300, textAlign: 'center', lineHeight: 1.3 }}>
                What&rsquo;s one thing on your mind?
              </div>
              <input
                autoFocus
                value={thought}
                onChange={e => setThought(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && thought.trim()) finish(true) }}
                placeholder="Anything. A task, a worry, an idea."
                style={{
                  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: '10px', color: 'var(--text)', fontFamily: 'var(--font-body)',
                  fontSize: '0.95rem', padding: '0.85rem 1rem', outline: 'none',
                }}
              />
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', opacity: 0.7, textAlign: 'center' }}>
                It becomes the first thing in your world. You can change everything later.
              </div>
            </div>
          )}

          {error && (
            <div role="alert" style={{
              fontSize: '0.76rem', color: 'var(--rose)', textAlign: 'center', lineHeight: 1.5,
              background: 'color-mix(in srgb, var(--rose) 8%, transparent)',
              border: '1px solid color-mix(in srgb, var(--rose) 25%, transparent)',
              borderRadius: '9px', padding: '0.6rem 0.8rem',
            }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            {onPhilosophy ? (
              <>
                <button onClick={() => finish(false)} disabled={saving} className="btn btn-ghost press" style={{ padding: '0.75rem 1rem', fontSize: '0.78rem' }}>
                  Skip
                </button>
                <button onClick={() => setStep(s => s + 1)} className="btn btn-primary press" style={{ flex: 1, padding: '0.75rem', fontSize: '0.82rem', letterSpacing: '0.04em' }}>
                  {step === PANELS.length - 1 ? 'Begin →' : 'Next →'}
                </button>
              </>
            ) : (
              <>
                <button onClick={() => finish(false)} disabled={saving} className="btn btn-ghost press" style={{ padding: '0.75rem 1rem', fontSize: '0.78rem' }}>
                  {saving ? '…' : 'Skip'}
                </button>
                <button
                  onClick={() => finish(true)}
                  disabled={saving || !thought.trim()}
                  className="btn btn-primary press"
                  style={{ flex: 1, padding: '0.75rem', fontSize: '0.82rem', letterSpacing: '0.04em' }}
                >
                  {saving ? 'Opening…' : 'Enter your world →'}
                </button>
              </>
            )}
          </div>

          {/* Progress — four dots, no "step 1 of 5" pressure */}
          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
            {[0, 1, 2, 3].map(i => (
              <span key={i} style={{
                width: i === step ? 16 : 5, height: 5, borderRadius: 99,
                background: i === step ? 'var(--gold)' : 'var(--border)',
                transition: 'width 200ms ease, background 200ms ease',
              }} />
            ))}
          </div>

          <div style={{ textAlign: 'center' }}>
            <a href="/guide" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: 'var(--muted)', textDecoration: 'none', opacity: 0.75 }}>
              Want the full tour? Open the guide →
            </a>
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
