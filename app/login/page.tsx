'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

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
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSent(true)
      setLoading(false)
      return
    }

    // signin
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    if (!rememberMe) sessionStorage.setItem('4s-session-only', '1')
    router.push('/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'var(--surface)', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'var(--border)', borderRadius: '10px', padding: '0.85rem 1rem',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.9rem',
    outline: 'none', marginBottom: '0.75rem',
  }

  const tabBtn = (m: Mode, label: string) => (
    <button key={m} onClick={() => { setMode(m); setError(null); setSent(false) }} style={{
      flex: 1, background: mode === m ? 'var(--surface2)' : 'transparent',
      border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem',
      color: mode === m ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--font-body)',
      fontSize: '0.78rem', cursor: 'pointer', transition: 'all 0.2s',
    }}>{label}</button>
  )

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '2rem',
    }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 300,
          color: 'var(--text)', marginBottom: '0.3rem', letterSpacing: '0.02em',
        }}>4S</h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginBottom: '2rem', fontFamily: 'var(--font-body)' }}>
          your personal operating system
        </p>

        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
          {tabBtn('signin', 'sign in')}
          {tabBtn('signup', 'sign up')}
          {tabBtn('magic', 'magic link')}
        </div>

        {sent ? (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px',
            padding: '1.5rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.6,
          }}>
            {mode === 'signup' ? (
              <>
                <p style={{ marginBottom: '0.5rem' }}>Account created!</p>
                <p style={{ color: 'var(--muted)' }}>Check your email to confirm, then sign in.</p>
              </>
            ) : (
              <>
                <p style={{ marginBottom: '0.5rem' }}>Check your email.</p>
                <p style={{ color: 'var(--muted)' }}>We sent a login link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.</p>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required aria-label="Email address" style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'rgba(255,180,210,0.3)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />

            {(mode === 'signin' || mode === 'signup') && (
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="password" required aria-label="Password" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(255,180,210,0.3)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            )}

            {mode === 'signup' && (
              <input
                type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="confirm password" required aria-label="Confirm password" style={inputStyle}
                onFocus={e => e.target.style.borderColor = 'rgba(255,180,210,0.3)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            )}

            {mode === 'signin' && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem',
                cursor: 'pointer', fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--font-body)',
              }}>
                <input
                  type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)}
                  style={{ accentColor: 'var(--gold)', width: 14, height: 14, cursor: 'pointer' }}
                />
                Remember me
              </label>
            )}

            {error && <p style={{ color: 'var(--rose)', fontSize: '0.82rem', marginBottom: '0.75rem', fontFamily: 'var(--font-body)' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading || !email || ((mode === 'signin' || mode === 'signup') && !password)}
              style={{
                width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '0.85rem 1rem', color: 'var(--muted)',
                fontFamily: 'var(--font-body)', fontSize: '0.9rem',
                cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: '0.03em',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >
              {loading ? '…' : mode === 'magic' ? 'send login link' : mode === 'signup' ? 'create account' : 'sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
