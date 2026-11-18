'use client'

import { useEffect, useState } from 'react'

// Link your Spotify so the wall screen can show and play it (2026-11-18).
// Each person links their own account. Nothing here touches the screen.

const RESULT: Record<string, string> = {
  connected: 'Spotify is linked.',
  cancelled: 'Linking was cancelled.',
  'not-allowed': 'Spotify said no. Add this Spotify account under User Management in the Spotify app settings, then try again.',
  setup: 'Spotify is not set up on SS yet.',
  failed: 'That did not work. Try again.',
}

export default function SpotifyConnect() {
  const [state, setState] = useState<{ configured: boolean; connected: boolean; name: string | null } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const r = new URLSearchParams(window.location.search).get('spotify')
    if (r && RESULT[r]) setNote(RESULT[r])
    fetch('/api/spotify', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(setState).catch(() => setState(null))
  }, [])

  async function unlink() {
    setBusy(true)
    await fetch('/api/spotify', { method: 'DELETE' }).catch(() => null)
    setBusy(false)
    setState(s => s && { ...s, connected: false, name: null })
    setNote(null)
  }

  const btn: React.CSSProperties = {
    padding: '0.45rem 1rem', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)',
    background: 'transparent', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--text)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      {note && <div style={{ fontSize: '0.7rem', color: note === RESULT.connected ? 'var(--emerald)' : 'var(--muted)', lineHeight: 1.5 }}>{note}</div>}
      {!state ? (
        <span style={{ fontSize: '0.73rem', color: 'var(--muted)', opacity: 0.7 }}>Checking…</span>
      ) : !state.configured ? (
        <span style={{ fontSize: '0.73rem', color: 'var(--muted)', lineHeight: 1.6 }}>Spotify is not set up on SS yet.</span>
      ) : state.connected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.73rem', color: 'var(--emerald)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
            Linked{state.name ? ` as ${state.name}` : ''}. Your music shows on the wall screen.
          </div>
          <div><button style={{ ...btn, borderColor: 'var(--rose)', color: 'var(--rose)' }} disabled={busy} onClick={unlink}>Unlink</button></div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.6 }}>See what is playing and pick a playlist from the wall screen. Needs Premium.</span>
          <div><a href="/api/spotify/connect" style={{ ...btn, display: 'inline-block', textDecoration: 'none' }}>Link Spotify</a></div>
        </div>
      )}
    </div>
  )
}
