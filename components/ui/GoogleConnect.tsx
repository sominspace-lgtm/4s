'use client'

import { useEffect, useState } from 'react'
import { useGoogleStatus, notifyGoogleChanged } from '@/lib/hooks/useGoogle'

// Connect / disconnect Google (Calendar + Gmail) (2026-10-05). Lives in the
// header Connect panel next to Discord and Alexa. The sign-in itself happens
// at /api/google/connect; this just starts it and shows the result.

const RESULT: Record<string, string> = {
  connected: 'Connected.',
  cancelled: 'Cancelled. Nothing was connected.',
  badstate: 'That sign-in did not match this browser. Try again.',
  tokenfail: 'Google did not accept the sign-in. Try again.',
  savefail: 'Connected to Google but could not save it. Try again.',
  denied: 'Sign in to 4S first, then connect Google.',
}

function Btn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.45rem 1rem', borderRadius: '8px', cursor: 'pointer',
      border: danger ? '1px solid var(--rose)' : '1px solid var(--border)',
      background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
      color: danger ? 'var(--rose)' : 'var(--text)',
    }}>{children}</button>
  )
}

export default function GoogleConnect() {
  const { status, loading, connect, disconnect } = useGoogleStatus()
  const [result, setResult] = useState<string | null>(null)

  // Landed back from Google with ?google=<result>: show it once, then tidy the URL.
  useEffect(() => {
    const url = new URL(window.location.href)
    const r = url.searchParams.get('google')
    if (!r) return
    setResult(RESULT[r] ?? null)
    url.searchParams.delete('google')
    window.history.replaceState({}, '', url.toString())
    notifyGoogleChanged()
  }, [])

  const muted: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }

  if (loading) return <div style={muted}>Checking…</div>
  if (status.blocked) return <div style={muted}>Google is only available when you are signed in as yourself, not on the shared screen.</div>
  if (!status.configured) return <div style={muted}>Google is not set up on the server yet.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {result && <div style={{ ...muted, color: 'var(--text)' }}>{result}</div>}
      {status.connected ? (
        <>
          <div style={muted}>
            Connected{status.email ? ` as ${status.email}` : ''}.
            <br />
            {[status.calendar && 'Calendar', status.gmail && 'Gmail (read)', status.send && 'Gmail (send)'].filter(Boolean).join(' · ') || 'No permissions granted'}
          </div>
          {!(status.calendar && status.gmail && status.send) && (
            <div style={muted}>Some permissions were not granted. Connect again and tick every box.</div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Btn onClick={connect}>Reconnect</Btn>
            <Btn danger onClick={disconnect}>Disconnect</Btn>
          </div>
        </>
      ) : (
        <>
          <div style={muted}>
            Bring Google Calendar into the calendar, read your inbox, and send mail, all inside 4S. You can disconnect any time.
          </div>
          <div><Btn onClick={connect}>Connect Google</Btn></div>
        </>
      )}
    </div>
  )
}
