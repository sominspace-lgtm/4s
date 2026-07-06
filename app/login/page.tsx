'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'

type Mode = 'magic' | 'signin' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')
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
      if (error) setError(error.message)
      else setSent(true)
      setLoading(false)
      return
    }

    if (mode === 'signup') {
      if (password !== confirmPassword) { setError('Passwords do not match.'); setLoading(false); return }
      if (password.length < 8) { setError('Password must be at least 8 characters.'); setLoading(false); return }
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
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
    if (error) { setError(error.message); setLoading(false); return }
    if (!rememberMe) sessionStorage.setItem('4s-session-only', '1')
    goNext('/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.04)', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '0.9rem 1rem',
    color: '#f5e8f0', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem',
    outline: 'none', marginBottom: '0.75rem', transition: 'border-color 0.2s',
  }

  const tabBtn = (m: Mode, label: string) => (
    <button key={m} onClick={() => { setMode(m); setError(null); setSent(false) }} style={{
      flex: 1, background: mode === m ? 'rgba(212,80,144,0.12)' : 'transparent',
      border: `1px solid ${mode === m ? 'rgba(212,80,144,0.4)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: '10px', padding: '0.55rem',
      color: mode === m ? '#f5e8f0' : 'rgba(245,232,240,0.45)',
      fontFamily: 'Inter, sans-serif', fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s',
    }}>{label}</button>
  )

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0d0810',
      backgroundImage: 'radial-gradient(ellipse at top right, rgba(200,60,130,0.10) 0%, transparent 55%), radial-gradient(ellipse at bottom left, rgba(160,40,120,0.08) 0%, transparent 55%)',
      padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <Logo size={56} />
          <div>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '3rem', fontWeight: 300,
              color: '#f5e8f0', marginBottom: '0.1rem', letterSpacing: '0.02em', lineHeight: 1,
            }}>4S</h1>
            <p style={{ color: 'rgba(245,232,240,0.4)', fontSize: '0.75rem', fontFamily: 'Inter, sans-serif', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              personal operating system
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
          {tabBtn('signin', 'sign in')}
          {tabBtn('signup', 'sign up')}
          {tabBtn('magic', 'magic link')}
        </div>

        {sent ? (
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px', padding: '1.5rem', color: '#f5e8f0',
            fontFamily: 'Inter, sans-serif', fontSize: '0.88rem', lineHeight: 1.7,
          }}>
            {mode === 'signup' ? (
              <>
                <div style={{ marginBottom: '0.4rem' }}>Account created ✓</div>
                <div style={{ color: 'rgba(245,232,240,0.5)', fontSize: '0.8rem' }}>Check your email to confirm, then sign in below.</div>
              </>
            ) : (
              <>
                <div style={{ marginBottom: '0.4rem' }}>Check your email.</div>
                <div style={{ color: 'rgba(245,232,240,0.5)', fontSize: '0.8rem' }}>Login link sent to <strong style={{ color: '#f5e8f0' }}>{email}</strong></div>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required aria-label="Email" style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'rgba(212,80,144,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />

            {(mode === 'signin' || mode === 'signup') && (
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="password" required aria-label="Password" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(212,80,144,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            )}

            {mode === 'signup' && (
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="confirm password" required aria-label="Confirm password" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(212,80,144,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            )}

            {mode === 'signin' && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem',
                cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(245,232,240,0.45)',
                fontFamily: 'Inter, sans-serif',
              }}>
                <input
                  type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#d45090', width: 14, height: 14, cursor: 'pointer' }}
                />
                Remember me
              </label>
            )}

            {error && (
              <div style={{ color: '#e06080', fontSize: '0.82rem', marginBottom: '0.75rem', fontFamily: 'Inter, sans-serif', padding: '0.6rem 0.8rem', background: 'rgba(220,80,100,0.08)', borderRadius: '8px', border: '1px solid rgba(220,80,100,0.15)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email || ((mode === 'signin' || mode === 'signup') && !password)}
              style={{
                width: '100%', padding: '0.9rem 1rem', borderRadius: '12px',
                border: '1px solid rgba(212,80,144,0.4)',
                background: 'rgba(212,80,144,0.12)',
                color: loading ? 'rgba(245,232,240,0.4)' : '#f5e8f0',
                fontFamily: 'Inter, sans-serif', fontSize: '0.88rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em', transition: 'all 0.2s',
              }}
            >
              {loading ? '…' : mode === 'magic' ? 'send login link' : mode === 'signup' ? 'create account' : 'sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
