'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'

type Mode = 'magic' | 'signin' | 'signup'

// Turn raw Supabase auth strings into calm, human copy (handbook 12-COPYWRITING).
function humanError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login credentials'))
    return 'That email and password did not match. Try again or use a magic link.'
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a moment before trying again.'
  if (m.includes('already registered') || m.includes('already exists') || m.includes('user already'))
    return 'That email already has an account. Try signing in instead.'
  if (m.includes('email not confirmed'))
    return 'Please confirm your email first, or use a magic link to sign in.'
  return msg
}

const PREVIEW = [
  'See what needs attention today',
  'Capture what matters, wherever you are',
  'Review your life with calm guidance',
]

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [sent, setSent] = useState(false)
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

  function switchMode(m: Mode) {
    setMode(m); setError(null); setSent(false); setPassword(''); setConfirmPassword('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()

    if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
      })
      if (error) setError(humanError(error.message))
      else setSent(true)
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) { setError('Those passwords do not match.'); setLoading(false); return }
      if (password.length < 8) { setError('Use at least 8 characters for your password.'); setLoading(false); return }
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(humanError(error.message)); setLoading(false); return }
      // Email confirmation is off — session is returned immediately
      if (data.session) {
        goNext('/onboard')
        return
      }
      // Fallback: try signing in
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr) {
        // Confirmation might be required — tell user
        setSent(true)
      } else {
        goNext('/onboard')
      }
      setLoading(false)
      return
    }

    // signin
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(humanError(error.message)); setLoading(false); return }
    if (!rememberMe) sessionStorage.setItem('4s-session-only', '1')
    goNext('/dashboard')
  }

  const loadingLabel = mode === 'magic' ? 'Sending magic link…' : mode === 'signup' ? 'Creating your space…' : 'Checking your account…'
  const submitLabel = mode === 'magic' ? 'Continue with magic link' : mode === 'signup' ? 'Create account' : 'Sign in'
  const disabled = loading || !email || ((mode === 'signin' || mode === 'signup') && !password)

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface2)', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'var(--border)', borderRadius: '12px', padding: '0.95rem 1rem',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '1rem',
    outline: 'none', marginBottom: '0.7rem', transition: 'border-color var(--t-base)',
  }
  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'var(--gold)' }
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = 'var(--border)' }

  // Quiet text-style action (secondary / tertiary).
  const quietBtn: React.CSSProperties = {
    background: 'transparent', border: 'none', color: 'var(--muted)',
    fontFamily: 'var(--font-body)', fontSize: '0.85rem', cursor: 'pointer',
    padding: '0.5rem', transition: 'color var(--t-fast)',
  }

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
          {sent ? (
            <div style={{ textAlign: 'center', padding: '0.5rem 0.25rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
                {mode === 'signup' ? 'Your space is ready.' : 'Check your email.'}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem', fontFamily: 'var(--font-body)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {mode === 'signup'
                  ? <>Confirm your email to finish, then sign in below.</>
                  : <>We sent a secure sign-in link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.</>}
              </p>
              <button onClick={() => { setSent(false); setError(null) }} style={{ ...quietBtn, color: 'var(--gold)' }}>
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--muted)', fontSize: '0.92rem', fontFamily: 'var(--font-body)', lineHeight: 1.55, marginBottom: '1.2rem', textAlign: 'center' }}>
                Organize your goals, tasks, routines, reflections, and priorities in one calm workspace.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com" required aria-label="Email" autoComplete="email"
                  style={inputStyle} onFocus={focusOn} onBlur={focusOff}
                />

                {(mode === 'signin' || mode === 'signup') && (
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Password" required aria-label="Password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    style={inputStyle} onFocus={focusOn} onBlur={focusOff}
                  />
                )}

                {mode === 'signup' && (
                  <input
                    type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password" required aria-label="Confirm password" autoComplete="new-password"
                    style={inputStyle} onFocus={focusOn} onBlur={focusOff}
                  />
                )}

                {mode === 'signin' && (
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
                )}

                {error && (
                  <div role="alert" style={{
                    color: 'var(--rose)', fontSize: '0.85rem', margin: '0.25rem 0 0.85rem', fontFamily: 'var(--font-body)',
                    padding: '0.7rem 0.85rem', background: 'color-mix(in srgb, var(--rose) 10%, transparent)',
                    borderRadius: '10px', border: '1px solid color-mix(in srgb, var(--rose) 22%, transparent)', lineHeight: 1.5,
                  }}>
                    {error}
                  </div>
                )}

                {/* Primary action */}
                <button
                  type="submit" disabled={disabled}
                  style={{
                    width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                    background: disabled ? 'color-mix(in srgb, var(--gold) 40%, transparent)' : 'var(--gold)',
                    color: 'var(--bg)', fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: 500,
                    cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: '0.01em',
                    transition: 'opacity var(--t-base)', marginTop: mode === 'magic' ? '0.4rem' : 0,
                  }}
                >
                  {loading ? loadingLabel : submitLabel}
                </button>
              </form>

              {/* Secondary + tertiary actions */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.1rem', marginTop: '1rem' }}>
                {mode === 'magic' && (
                  <>
                    <button onClick={() => switchMode('signin')} style={quietBtn}>Sign in with password</button>
                    <button onClick={() => switchMode('signup')} style={{ ...quietBtn, color: 'var(--gold)' }}>New to 4S? Create an account</button>
                  </>
                )}
                {mode === 'signin' && (
                  <>
                    <button onClick={() => switchMode('magic')} style={quietBtn}>Use a magic link instead</button>
                    <button onClick={() => switchMode('signup')} style={{ ...quietBtn, color: 'var(--gold)' }}>New to 4S? Create an account</button>
                  </>
                )}
                {mode === 'signup' && (
                  <button onClick={() => switchMode('signin')} style={quietBtn}>Already have an account? Sign in</button>
                )}
              </div>
            </>
          )}
        </div>

        {/* Feature preview */}
        {!sent && (
          <ul style={{ listStyle: 'none', margin: '1.5rem 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {PREVIEW.map(item => (
              <li key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--muted)', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>
                <span aria-hidden style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, opacity: 0.8 }} />
                {item}
              </li>
            ))}
          </ul>
        )}

        {/* Privacy reassurance */}
        <p style={{ textAlign: 'center', color: 'var(--muted)', opacity: 0.7, fontSize: '0.78rem', fontFamily: 'var(--font-body)', marginTop: '1.5rem', lineHeight: 1.5 }}>
          Private by default. Your space stays yours.
        </p>
      </div>
    </div>
  )
}
