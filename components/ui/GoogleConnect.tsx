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
  const { status, loading, connect, disconnect, connectShared, disconnectShared } = useGoogleStatus()
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
  if (!status.configured) return <div style={muted}>Google is not set up on the server yet.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      {result && <div style={{ ...muted, color: 'var(--text)' }}>{result}</div>}
      {/* The shared screen: personal Google stays off, the shared account works (2026-10-24). */}
      {status.blocked ? (
        <div style={muted}>Your own Google account connects when you are signed in as yourself. The shared account below works here too.</div>
      ) : status.connected ? (
        <>
          <div style={muted}>
            Connected{status.email ? ` as ${status.email}` : ''}.
            <br />
            {[status.calendar && 'Calendar', status.gmail && 'Gmail (read)', status.send && 'Gmail (send)', status.drafts && 'Gmail drafts', status.tasks && 'Tasks', status.drive && 'Drive (read)', status.photos && 'Photos (ones you pick)'].filter(Boolean).join(' · ') || 'No permissions granted'}
          </div>
          {!(status.calendar && status.gmail && status.send) && (
            <div style={muted}>Some permissions were not granted. Connect again and tick every box.</div>
          )}
          {status.calendar && !status.photos && (
            <div style={muted}>New: pick photos from Google Photos for check-ins and things you own. Tap Reconnect to allow it.</div>
          )}
          {status.calendar && !(status.tasks && status.drive && status.drafts) && (
            <div style={muted}>Jarvis can now use Google Tasks, read your Drive, and save Gmail drafts. Tap Reconnect to allow them.</div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Btn onClick={connect}>Reconnect</Btn>
            <Btn danger onClick={disconnect}>Disconnect</Btn>
          </div>
        </>
      ) : (
        <>
          <div style={muted}>
            Bring Google Calendar into the calendar, read your inbox and send mail inside 4S, and let Jarvis use your calendar, Google Tasks, Gmail drafts and Drive (read only). You can disconnect any time.
          </div>
          <div><Btn onClick={connect}>Connect Google</Btn></div>
        </>
      )}

      {/* The household's shared email (2026-10-24): one account the two of
          you share. Either of you can connect it; both can use it. */}
      {status.household?.available && (
        <div style={{ borderTop: '1px solid var(--faint)', paddingTop: '0.7rem', marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text)' }}>Shared Google account</div>
          {status.household.connected ? (
            <>
              <div style={muted}>Connected{status.household.email ? ` as ${status.household.email}` : ''}. You both can use it. Ask Jarvis about the shared inbox or calendar.</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <Btn onClick={connectShared}>Reconnect</Btn>
                <Btn danger onClick={disconnectShared}>Disconnect</Btn>
              </div>
            </>
          ) : (
            <>
              <div style={muted}>The email the two of you share. Connect it once and it works for both of you. When Google asks, pick the shared account.</div>
              <div><Btn onClick={connectShared}>Connect shared account</Btn></div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
