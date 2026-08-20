'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'

// Sign-in only (2026-08-18) — 4S is now just Harry and Sylvia, two existing
// accounts. There is deliberately no sign-up form and no guest/anonymous
// entry here any more: both used to mint a brand-new Supabase account on
// click, which is exactly the "no other account creation" this removes. If
// a password ever needs resetting, that happens directly in Supabase, not
// through this page.

function humanError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials'))
    return 'That email and password did not match. Try again.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a moment before trying again.'
  if (m.includes('email not confirmed'))
    return 'Please confirm your email first — check your inbox for the link.'
  return msg
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Honor ?next= so flows that bounce through login (e.g. Alexa account
  // linking → /api/alexa/authorize) return to where they started. Only
  // same-origin relative paths are allowed, never an external URL.
  function nextTarget(fallback: string): string {
    if (typeof window === 'undefined') return fallback
    const n = new URLSearchParams(window.location.search).get('next')
    return n && n.startsWith('/') && !n.startsWith('//') ? n : fallback
  }

  // API-route targets (e.g. Alexa account linking) end in a 302 to an external
  // Amazon URL. router.push does a soft in-app navigation that won't follow
  // that redirect, so hard-navigate the browser for those; keep the SPA push
  // for normal page targets.
  function goNext(fallback: string) {
    const target = nextTarget(fallback)
    if (target.startsWith('/api/')) window.location.assign(target)
    else router.push(target)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(humanError(error.message)); setLoading(false); return }
    if (!rememberMe) sessionStorage.setItem('4s-session-only', '1')
    goNext('/dashboard')
  }

  const disabled = loading || !email || !password

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface2)', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'var(--border)', borderRadius: '12px', padding: '0.95rem 1rem',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '1rem',
    outline: 'none', marginBottom: '0.7rem', transition: 'border-color var(--t-base)',
  }
  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'var(--gold)' }
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'var(--border)' }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at top, color-mix(in srgb, var(--gold) 10%, transparent) 0%, transparent 55%), radial-gradient(ellipse at bottom left, color-mix(in srgb, var(--purple) 8%, transparent) 0%, transparent 55%)',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Brand */}
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

        {/* Card */}
        <div style={{
          background: 'color-mix(in srgb, var(--surface) 70%, transparent)',
          border: '1px solid var(--border)', borderRadius: '20px',
          padding: '1.6rem 1.4rem', boxShadow: 'var(--shadow-soft)',
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" required aria-label="Email" autoComplete="email"
              style={inputStyle} onFocus={focusOn} onBlur={focusOff}
            />

            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Password" required aria-label="Password" autoComplete="current-password"
              style={inputStyle} onFocus={focusOn} onBlur={focusOff}
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
              type="submit" disabled={disabled}
              style={{
                width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                background: disabled ? 'color-mix(in srgb, var(--gold) 40%, transparent)' : 'var(--gold)',
                color: 'var(--bg)', fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 500,
                cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '0.01em',
                transition: 'opacity var(--t-base)',
              }}
            >
              {loading ? 'Checking your account…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--muted)', opacity: 0.7, fontSize: '0.78rem', fontFamily: 'var(--font-body)', marginTop: '1.5rem', lineHeight: 1.5 }}>
          Private by default. Your space stays yours.
        </p>
      </div>
    </div>
  )
}
