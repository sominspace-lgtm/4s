'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WAS_SHARED_DEVICE_KEY } from '@/lib/hooks/useAutoRelock'

// Session upgrade from Shared → personal (2026-08-21).
//
// Shared mode can SEE the Village — plants and buildings drawn from real
// habits and tasks — because it's a shared household device and the shape of
// each other's week is exactly what's worth glancing at. Going from that
// picture into the underlying data is a different thing, and needs the PIN.
//
// Mechanically this is just /api/auth/pin-login again: a correct PIN signs in
// as that person for real and clears the 4s-shared-mode cookie, so the whole
// app opens up as them. No separate "elevated shared session" concept — you
// either are someone, or you're the shared view.
export default function UnlockPanel({ open, onClose, reason }: {
  open: boolean
  onClose: () => void
  /** What they were trying to reach, so the prompt says why it's asking. */
  reason?: string | null
}) {
  const router = useRouter()
  const [profile, setProfile] = useState<'harry' | 'sylvia' | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || pin.length < 4) return
    setLoading(true)
    setError(null)
    const res = await fetch('/api/auth/pin-login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, pin }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(body.error === 'not_set_up' ? 'That profile has no PIN yet — set one from the login screen.' : (body.error ?? 'Something went wrong.'))
      setLoading(false)
      return
    }
    // Mark this browser as the shared kiosk (2026-08-25) — this unlock only
    // ever happens FROM shared mode (see this component's own header
    // comment), so this is the one place that knows "this physical device
    // is the one that stays logged in on the wall." See useAutoRelock,
    // which reads this to know whether to sign back into shared after
    // inactivity, vs. leaving a personal phone/laptop alone.
    try { localStorage.setItem(WAS_SHARED_DEVICE_KEY, '1') } catch { /* ignore */ }
    // The cookie changed server-side; refresh so the dashboard re-reads it
    // and drops out of shared mode.
    router.refresh()
    onClose()
  }

  function reset() {
    setProfile(null); setPin(''); setError(null)
  }

  const input: React.CSSProperties = {
    width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '0.9rem 1rem', color: 'var(--text)',
    fontFamily: 'var(--font-body)', fontSize: '1.3rem', letterSpacing: '0.3em',
    textAlign: 'center', outline: 'none', marginBottom: '0.7rem',
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unlock"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 520, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '1rem',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="organic"
        style={{
          width: '100%', maxWidth: 380, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 20,
          padding: '1.5rem 1.4rem', boxShadow: 'var(--elev-3)',
        }}
      >
        <div style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.5rem' }}>
          Unlock
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
          {reason
            ? `${reason} lives in a personal space. Enter your PIN to open it.`
            : 'Enter your PIN to switch from the shared view to your own.'}
        </p>

        {!profile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(['harry', 'sylvia'] as const).map(p => (
              <button key={p} onClick={() => setProfile(p)} className="press" style={{
                padding: '0.9rem', borderRadius: 12, border: '1px solid var(--border)',
                background: 'var(--surface2)', color: 'var(--text)',
                fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 500, cursor: 'pointer',
              }}>
                {p === 'harry' ? 'Harry' : 'Sylvia'}
              </button>
            ))}
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: 'var(--muted)', fontFamily: 'var(--font-body)',
              fontSize: '0.8rem', cursor: 'pointer', padding: '0.6rem', marginTop: '0.2rem',
            }}>
              Stay in the shared view
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <input
              type="password" inputMode="numeric" pattern="[0-9]*" autoFocus
              autoComplete="one-time-code"
              value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="••••" aria-label="PIN" style={input}
            />
            {error && (
              <div role="alert" style={{
                color: 'var(--rose)', fontSize: '0.8rem', marginBottom: '0.7rem',
                padding: '0.6rem 0.8rem', borderRadius: 10,
                background: 'color-mix(in srgb, var(--rose) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--rose) 22%, transparent)',
              }}>{error}</div>
            )}
            <button type="submit" disabled={loading || pin.length < 4} style={{
              width: '100%', padding: '0.9rem', borderRadius: 12, border: 'none',
              background: (loading || pin.length < 4) ? 'color-mix(in srgb, var(--gold) 40%, transparent)' : 'var(--gold)',
              color: 'var(--bg)', fontFamily: 'var(--font-body)', fontSize: '0.92rem', fontWeight: 500,
              cursor: (loading || pin.length < 4) ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Checking…' : 'Unlock'}
            </button>
            <button type="button" onClick={reset} style={{
              background: 'none', border: 'none', color: 'var(--muted)', fontFamily: 'var(--font-body)',
              fontSize: '0.8rem', cursor: 'pointer', padding: '0.6rem', width: '100%', marginTop: '0.2rem',
            }}>
              ← Someone else
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
