'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Extracted from app/account/AccountClient.tsx (2026-08-11) so the Alexa
// pairing flow can render in two places — Account, and the new header
// Connect panel — without copy-pasting the code-generation/poll/unlink
// logic. Behavior is unchanged from the original inline version.
function Btn({ onClick, children, danger, disabled }: { onClick: () => void; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '0.45rem 1rem', borderRadius: '8px', cursor: disabled ? 'default' : 'pointer',
      border: danger ? '1px solid var(--rose)' : '1px solid var(--border)',
      background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
      color: danger ? 'var(--rose)' : 'var(--text)', opacity: disabled ? 0.4 : 1,
    }}>{children}</button>
  )
}

export default function AlexaConnect({ userId }: { userId: string }) {
  const supabase = createClient()
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [linked, setLinked] = useState<boolean | null>(null) // null = still checking
  const [unlinking, setUnlinking] = useState(false)

  useEffect(() => {
    supabase.from('alexa_links').select('user_id').eq('user_id', userId).maybeSingle()
      .then(({ data }) => setLinked(!!data))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // While a code is showing, poll so "Connected" appears the moment linking
  // succeeds on Alexa's side — no manual refresh needed.
  useEffect(() => {
    if (!code || linked) return
    const id = setInterval(() => {
      supabase.from('alexa_links').select('user_id').eq('user_id', userId).maybeSingle()
        .then(({ data }) => { if (data) { setLinked(true); setCode(null) } })
    }, 3000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, linked])

  async function connect() {
    setLoading(true); setCode(null); setErr(null)
    try {
      const res = await fetch('/api/alexa/link-code', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (data.code) setCode(data.code)
      else setErr(data.error || `Couldn't generate a code (status ${res.status}).`)
    } catch {
      setErr('Network error — try again.')
    } finally { setLoading(false) }
  }

  async function unlink() {
    setUnlinking(true); setErr(null)
    const { error } = await supabase.from('alexa_links').delete().eq('user_id', userId)
    setUnlinking(false)
    if (error) { setErr(error.message); return }
    setLinked(false)
    setCode(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {err && <div style={{ fontSize: '0.68rem', color: 'var(--rose)' }}>{err}</div>}

      {linked === null ? (
        <span style={{ fontSize: '0.73rem', color: 'var(--muted)', opacity: 0.7 }}>Checking…</span>
      ) : linked ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.73rem', color: 'var(--emerald)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
            Connected — your Echo is linked to this account.
          </div>
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            Switching to a different Echo, or handing this off to someone else? Unlink first —
            an Alexa device can only be bound to one 4S account at a time.
          </span>
          <Btn onClick={unlink} disabled={unlinking} danger>{unlinking ? 'unlinking…' : 'Unlink Alexa'}</Btn>
        </div>
      ) : (
        <>
          <span style={{ fontSize: '0.73rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            Get a code, then say <em style={{ color: 'var(--text)' }}>&ldquo;Alexa, ask four s to link&rdquo;</em> and read it out. Links your Echo to this account.
          </span>
          {!code ? (
            <Btn onClick={connect} disabled={loading}>{loading ? 'generating…' : 'Get my code'}</Btn>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.35em',
                color: 'var(--gold)', padding: '0.4rem 0', textAlign: 'center',
                background: 'color-mix(in srgb, var(--gold) 8%, transparent)', borderRadius: '10px',
                border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)',
              }}>{code}</div>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textAlign: 'center' }}>
                Say: <strong style={{ color: 'var(--text)' }}>&ldquo;Alexa, ask four s to link {code.split('').join(' ')}&rdquo;</strong>
              </span>
              <Btn onClick={connect} disabled={loading}>New code</Btn>
            </div>
          )}
        </>
      )}
    </div>
  )
}
