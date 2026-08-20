'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'

// Three fixed profiles, PIN to unlock (2026-08-20) — 4S is just Harry and
// Sylvia now. Picking a tile and entering its PIN calls /api/auth/pin-login,
// which does a real server-side Supabase sign-in on success; this page never
// sees a password, only ever a short PIN. Shared has no PIN at all — it
// opens a household-only view with nothing personal reachable from it, so a
// lockout wouldn't be protecting anything a tap doesn't already avoid.

type Profile = 'harry' | 'sylvia' | 'shared'

const PROFILES: { id: Profile; label: string; needsPin: boolean }[] = [
  { id: 'harry', label: 'Harry', needsPin: true },
  { id: 'sylvia', label: 'Sylvia', needsPin: true },
  { id: 'shared', label: 'Shared', needsPin: false },
]

export default function LoginPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Profile | null>(null)
  const [pin, setPin] = useState('')
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

  async function submit(profile: Profile, pinValue: string) {
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/pin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, pin: pinValue }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }
    if (!rememberMe) sessionStorage.setItem('4s-session-only', '1')
    goNext('/dashboard')
  }

  function pickTile(p: Profile) {
    setError(null)
    setPin('')
    if (!PROFILES.find(x => x.id === p)?.needsPin) {
      submit(p, '')
      return
    }
    setSelected(p)
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || pin.length < 4) return
    submit(selected, pin)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface2)', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'var(--border)', borderRadius: '12px', padding: '0.95rem 1rem',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '1.4rem', letterSpacing: '0.3em',
    textAlign: 'center', outline: 'none', marginBottom: '0.7rem', transition: 'border-color var(--t-base)',
  }

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
          {!selected ? (
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
          ) : (
            <form onSubmit={handlePinSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
              <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', marginBottom: '0.9rem' }}>
                {PROFILES.find(p => p.id === selected)?.label}'s PIN
              </p>
              <input
                type="password" inputMode="numeric" pattern="[0-9]*" autoFocus
                value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="••••" aria-label="PIN" style={inputStyle}
              />
              <label style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.15rem 0 1rem',
                cursor: 'pointer', fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'var(--font-body)',
              }}>
                <input
                  type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--gold)', width: 16, height: 16, cursor: 'pointer' }}
                />
                Remember me
              </label>

              {error && (
                <div role="alert" style={{
                  color: 'var(--rose)', fontSize: '0.85rem', margin: '0.25rem 0 0.85rem', fontFamily: 'var(--font-body)',
                  padding: '0.7rem 0.85rem', background: 'color-mix(in srgb, var(--rose) 10%, transparent)',
                  borderRadius: '10px', border: '1px solid color-mix(in srgb, var(--rose) 22%, transparent)', lineHeight: 1.5,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit" disabled={loading || pin.length < 4}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                  background: (loading || pin.length < 4) ? 'color-mix(in srgb, var(--gold) 40%, transparent)' : 'var(--gold)',
                  color: 'var(--bg)', fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 500,
                  cursor: (loading || pin.length < 4) ? 'not-allowed' : 'pointer', letterSpacing: '0.01em',
                  transition: 'opacity var(--t-base)',
                }}
              >
                {loading ? 'Checking…' : 'Unlock'}
              </button>

              <button
                type="button" onClick={() => { setSelected(null); setPin(''); setError(null) }}
                style={{
                  background: 'transparent', border: 'none', color: 'var(--muted)', fontFamily: 'var(--font-body)',
                  fontSize: '0.82rem', cursor: 'pointer', padding: '0.6rem', marginTop: '0.3rem',
                }}
              >
                ← Not {PROFILES.find(p => p.id === selected)?.label}
              </button>
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
