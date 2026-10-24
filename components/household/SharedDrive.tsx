'use client'

import { useCallback, useEffect, useState } from 'react'
import { useGoogleStatus } from '@/lib/hooks/useGoogle'

// Shared Drive (2026-10-24): the shared Google account's Drive, read only.
// Recent files, or search; each opens in Google. Shown in Collections, also
// on the shared screen, never in guest mode.

interface DriveFile { id: string; name: string; type: string; modified: string | null; link: string | null }

export default function SharedDrive() {
  const { status } = useGoogleStatus()
  const connected = !!status.household?.connected
  const [files, setFiles] = useState<DriveFile[]>([])
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (query: string) => {
    setBusy(true); setErr(null)
    const res = await fetch(`/api/google/drive?account=shared${query ? `&q=${encodeURIComponent(query)}` : ''}`)
    const j = await res.json().catch(() => ({})) as { files?: DriveFile[]; error?: string }
    if (res.ok) setFiles(j.files ?? [])
    else setErr(res.status === 409 ? 'Reconnect the shared Google account in Connect.' : (j.error ?? 'Drive did not answer.'))
    setBusy(false)
  }, [])

  useEffect(() => { if (connected) void load('') }, [connected, load])

  if (!connected) return null

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
      <div className="t-card" style={{ marginBottom: '0.6rem' }}>Shared Drive</div>
      <form onSubmit={e => { e.preventDefault(); void load(q.trim()) }} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search the shared Drive"
          style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '0 0.7rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)', color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, outline: 'none' }} />
        <button className="btn btn-secondary press" disabled={busy}>{busy ? '…' : 'Search'}</button>
      </form>
      {err && <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>{err}</div>}
      {!busy && !err && files.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Nothing found.</div>}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {files.map(f => (
          <a key={f.id} href={f.link ?? '#'} target="_blank" rel="noopener noreferrer" style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem', minHeight: 48, padding: '0.4rem 0.1rem',
            borderBottom: '1px solid var(--faint)', textDecoration: 'none', color: 'var(--text)',
          }}>
            <span style={{ flex: 1, minWidth: 0, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--muted)', flexShrink: 0 }}>{f.type.startsWith('application/') || f.type.startsWith('image/') ? f.type.split('/')[1] : f.type}{f.modified ? ` · ${f.modified}` : ''}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
