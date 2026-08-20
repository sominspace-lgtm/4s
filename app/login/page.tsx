'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'

// Three fixed profiles, PIN to unlock (2026-08-20) — 4S is just Harry and
// Sylvia now. Harry and Sylvia each choose their own PIN the first time they
// open this page (pin-status says whether a profile still needs that);
// Shared's PIN is fixed and pre-seeded, so it always goes straight to "enter
// your PIN". Either way, the actual sign-in happens server-side — this page
// never sees a password, only ever a short PIN.

type Profile = 'harry' | 'sylvia' | 'shared'
type Screen = 'tiles' | 'enter' | 'create'

const PROFILES: { id: Profile; label: string }[] = [
  { id: 'harry', label: 'Harry' },
  { id: 'sylvia', label: 'Sylvia' },
  { id: 'shared', label: 'Shared' },
]

export default function LoginPage() {
  const router = useRouter()
  const [screen, setScreen] = useState<Screen>('tiles')
  const [selected, setSelected] = useState<Profile | null>(null)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function nextTarget(fallback: string): string {
    if (typeof window === 'undefined') return fallback
    const n = new URLSearchParams(window.location.search).get('next')
    return n && n.startsWith('/') && !n.startsWith('//') ? n : fallback
  }

  function goNext(fallback: string) {
    const target = nextTarget(fallback)
    if (target.startsWith('/api/')) window.location.assign(target)
    else router.push(target)
  }

  async function pickTile(p: Profile) {
    setError(null)
    setPin(''); setConfirmPin('')
    setSelected(p)
    setLoading(true)
    const res = await fetch(`/api/auth/pin-status?profile=${p}`)
    const body = await res.json().catch(() => ({}))
    setLoading(false)
    setScreen(res.ok && body.needsSetup ? 'create' : 'enter')
  }

  async function handleEnter(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || pin.length < 4) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/pin-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: selected, pin }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      // A profile can flip to "needs setup" between the tile tap and now if
      // it was never actually claimed (pin-status raced an empty DB) —
      // route to create instead of showing a confusing wrong-PIN error.
      if (body.error === 'not_set_up') { setScreen('create'); setLoading(false); return }
      setError(body.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    if (!rememberMe) sessionStorage.setItem('4s-session-only', '1')
    goNext('/dashboard')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || pin.length < 4) return
    if (pin !== confirmPin) { setError('Those two PINs don’t match.'); return }
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/pin-setup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: selected, pin }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Someone else claimed it first (or it's already set) — fall back to
      // the normal enter-PIN screen rather than a dead end.
      setError(body.error ?? 'Something went wrong.')
      setScreen('enter')
      setLoading(false)
      return
    }
    if (!rememberMe) sessionStorage.setItem('4s-session-only', '1')
    goNext('/dashboard')
  }

  function back() {
    setScreen('tiles'); setSelected(null); setPin(''); setConfirmPin(''); setError(null)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface2)', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'var(--border)', borderRadius: '12px', padding: '0.95rem 1rem',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '1.4rem', letterSpacing: '0.3em',
    textAlign: 'center', outline: 'none', marginBottom: '0.7rem', transition: 'border-color var(--t-base)',
  }

  const label = selected ? PROFILES.find(p => p.id === selected)?.label : ''

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at top, color-mix(in srgb, var(--gold) 10%, transparent) 0%, transparent 55%), radial-gradient(ellipse at bottom left, color-mix(in srgb, var(--purple) 8%, transparent) 0%, transparent 55%)',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
          <Logo size={64} />
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '2.8rem', fontWeight: 300,
            color: 'var(--text)', margin: '1rem 0 0.2rem', letterSpacing: '0.02em', lineHeight: 1,
          }}>4S</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem', fontFamily: 'var(--font-body)', letterSpacing: '0.02em' }}>
            Your personal operating system
          </p>
        </div>

        <div style={{
          background: 'color-mix(in srgb, var(--surface) 70%, transparent)',
          border: '1px solid var(--border)', borderRadius: '20px',
          padding: '1.6rem 1.4rem', boxShadow: 'var(--shadow-soft)',
        }}>
          {screen === 'tiles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {PROFILES.map(p => (
                <button
                  key={p.id} onClick={() => pickTile(p.id)} disabled={loading}
                  style={{
                    padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)',
                    background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-body)',
                    fontSize: '1rem', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'background var(--t-base), border-color var(--t-base)',
                  }}
                >
                  {p.label}
                </button>
              ))}
              {error && (
                <div role="alert" style={{
                  color: 'var(--rose)', fontSize: '0.85rem', marginTop: '0.4rem', fontFamily: 'var(--font-body)',
                  padding: '0.7rem 0.85rem', background: 'color-mix(in srgb, var(--rose) 10%, transparent)',
                  borderRadius: '10px', border: '1px solid color-mix(in srgb, var(--rose) 22%, transparent)', lineHeight: 1.5,
                }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {screen === 'enter' && (
            <form onSubmit={handleEnter} style={{ display: 'flex', flexDirection: 'column' }}>
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', marginBottom: '0.9rem' }}>
                {label}&rsquo;s PIN
              </p>
              <input
                type="password" inputMode="numeric" pattern="[0-9]*" autoFocus
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="••••" aria-label="PIN" style={inputStyle}
              />
              <RememberMe checked={rememberMe} onChange={setRememberMe} />
              <ErrorBox error={error} />
              <SubmitButton loading={loading} disabled={pin.length < 4} label="Unlock" />
              <BackButton onClick={back} label={label} />
            </form>
          )}

          {screen === 'create' && (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column' }}>
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', marginBottom: '0.3rem' }}>
                First time as {label} — choose a PIN
              </p>
              <p style={{ textAlign: 'center', color: 'var(--muted)', opacity: 0.7, fontSize: '0.72rem', fontFamily: 'var(--font-body)', marginBottom: '0.9rem' }}>
                At least 4 digits, 6 is safer.
              </p>
              <input
                type="password" inputMode="numeric" pattern="[0-9]*" autoFocus
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="New PIN" aria-label="New PIN" style={inputStyle}
              />
              <input
                type="password" inputMode="numeric" pattern="[0-9]*"
                value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Confirm PIN" aria-label="Confirm PIN" style={inputStyle}
              />
              <RememberMe checked={rememberMe} onChange={setRememberMe} />
              <ErrorBox error={error} />
              <SubmitButton loading={loading} disabled={pin.length < 4 || confirmPin.length < 4} label="Save & continue" />
              <BackButton onClick={back} label={label} />
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', opacity: 0.7, fontSize: '0.78rem', fontFamily: 'var(--font-body)', marginTop: '1.5rem', lineHeight: 1.5 }}>
          Private by default. Your space stays yours.
        </p>
      </div>
    </div>
  )
}

function RememberMe({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.15rem 0 1rem',
      cursor: 'pointer', fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'var(--font-body)',
    }}>
      <input
        type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--gold)', width: 16, height: 16, cursor: 'pointer' }}
      />
      Remember me
    </label>
  )
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null
  return (
    <div role="alert" style={{
      color: 'var(--rose)', fontSize: '0.85rem', margin: '0.25rem 0 0.85rem', fontFamily: 'var(--font-body)',
      padding: '0.7rem 0.85rem', background: 'color-mix(in srgb, var(--rose) 10%, transparent)',
      borderRadius: '10px', border: '1px solid color-mix(in srgb, var(--rose) 22%, transparent)', lineHeight: 1.5,
    }}>
      {error}
    </div>
  )
}

function SubmitButton({ loading, disabled, label }: { loading: boolean; disabled: boolean; label: string }) {
  const isDisabled = loading || disabled
  return (
    <button
      type="submit" disabled={isDisabled}
      style={{
        width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
        background: isDisabled ? 'color-mix(in srgb, var(--gold) 40%, transparent)' : 'var(--gold)',
        color: 'var(--bg)', fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 500,
        cursor: isDisabled ? 'not-allowed' : 'pointer', letterSpacing: '0.01em',
        transition: 'opacity var(--t-base)',
      }}
    >
      {loading ? 'Checking…' : label}
    </button>
  )
}

function BackButton({ onClick, label }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{
        background: 'transparent', border: 'none', color: 'var(--muted)', fontFamily: 'var(--font-body)',
        fontSize: '0.82rem', cursor: 'pointer', padding: '0.6rem', marginTop: '0.3rem',
      }}
    >
      ← Not {label}
    </button>
  )
}
