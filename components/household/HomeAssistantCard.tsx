'use client'

import { useCallback, useEffect, useState } from 'react'

// Connect Home Assistant (2026-11-10). You paste your Home Assistant's
// away-from-home address and a long-lived access token you made in Home
// Assistant. The server checks them, keeps the token, and brings your devices
// in. Their status is brought in again every 30 seconds while this is open.

const input: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, minHeight: 40,
  padding: '0 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box',
}

export default function HomeAssistantCard({ spaceId, onSynced }: { spaceId: string; onSynced: () => void }) {
  const [st, setSt] = useState<{ connected: boolean; address: string | null; syncedAt: string | null } | null>(null)
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const status = useCallback(async () => {
    const r = await fetch(`/api/smarthome/hass?spaceId=${spaceId}`).catch(() => null)
    if (r?.ok) setSt(await r.json())
  }, [spaceId])

  const post = useCallback(async (body: Record<string, unknown>) => {
    const r = await fetch('/api/smarthome/hass', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spaceId, ...body }),
    }).catch(() => null)
    const d = r ? await r.json().catch(() => ({})) : {}
    return { ok: !!r?.ok, count: d.count as number | undefined, error: (d.error as string | undefined) ?? (r ? undefined : 'No connection. Try again.') }
  }, [spaceId])

  const sync = useCallback(async (quiet: boolean) => {
    if (!quiet) setBusy(true)
    const r = await post({ action: 'sync' })
    if (!quiet) { setBusy(false); setMsg(r.ok ? `Up to date. ${r.count} device${r.count === 1 ? '' : 's'} from Home Assistant.` : r.error ?? 'Try again.') }
    if (r.ok) { onSynced(); status() }
  }, [post, onSynced, status])

  useEffect(() => { status() }, [status])

  // Live status: every 30 seconds while the page is visible.
  useEffect(() => {
    if (!st?.connected) return
    const tick = () => { if (document.visibilityState === 'visible') sync(true) }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [st?.connected, sync])

  async function connect() {
    setBusy(true); setMsg(null)
    const r = await post({ action: 'connect', url, token })
    setBusy(false)
    if (!r.ok) { setMsg(r.error ?? 'That did not connect.'); return }
    setToken(''); setOpen(false)
    setMsg(`Connected. ${r.count} device${r.count === 1 ? '' : 's'} came in.`)
    onSynced(); status()
  }

  if (!st) return null
  const checked = st.syncedAt ? `, checked ${new Date(st.syncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.6rem 0.8rem', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1, minWidth: '10rem' }}>
          Home Assistant
          <span style={{ display: 'block', fontSize: '0.66rem', color: 'var(--muted)' }}>
            {msg ?? (st.connected ? `Connected${checked}` : 'Bring in your real devices and control them from here.')}
          </span>
        </span>
        {!st.connected && !open && <button className="btn btn-primary press" onClick={() => setOpen(true)} style={{ fontSize: '0.72rem' }}>Connect</button>}
        {st.connected && <button className="btn btn-secondary press" disabled={busy} onClick={() => sync(false)} style={{ fontSize: '0.7rem' }}>{busy ? 'Checking…' : 'Refresh'}</button>}
        {st.connected && (
          <button className="btn btn-ghost press" style={{ fontSize: '0.7rem' }} onClick={async () => {
            if (!window.confirm('Disconnect Home Assistant? Its devices leave this page. Nothing changes in Home Assistant itself.')) return
            await fetch(`/api/smarthome/hass?spaceId=${spaceId}`, { method: 'DELETE' }).catch(() => null)
            setMsg(null); onSynced(); status()
          }}>Disconnect</button>
        )}
      </div>
      {open && !st.connected && (
        <form onSubmit={e => { e.preventDefault(); connect() }} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <label style={{ fontSize: '0.68rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            Address that works away from home
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourname.ui.nabu.casa" inputMode="url" autoComplete="off" style={input} />
          </label>
          <label style={{ fontSize: '0.68rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            Long-lived access token (Home Assistant, your profile, Security)
            <input value={token} onChange={e => setToken(e.target.value)} type="password" autoComplete="off" style={input} />
          </label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="submit" className="btn btn-primary press" disabled={busy || !url.trim() || !token.trim()} style={{ fontSize: '0.72rem' }}>{busy ? 'Checking…' : 'Connect'}</button>
            <button type="button" className="btn btn-ghost press" onClick={() => { setOpen(false); setToken('') }} style={{ fontSize: '0.72rem' }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
