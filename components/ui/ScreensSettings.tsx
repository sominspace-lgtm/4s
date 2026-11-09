'use client'

import { useCallback, useEffect, useState } from 'react'

// Paired screens (2026-11-08): the wall iPad and anything like it. Lists
// what is paired, when it was last on, and lets either of you remove one.
interface Screen { id: string; name: string; created_at: string; last_seen_at: string | null }

function ago(iso: string | null) {
  if (!iso) return 'not on yet'
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (min < 10) return 'on now'
  if (min < 60) return `on ${min} min ago`
  const h = Math.round(min / 60)
  if (h < 24) return `on ${h} h ago`
  return `last on ${new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

export default function ScreensSettings() {
  const [screens, setScreens] = useState<Screen[] | null>(null)
  const [setupNeeded, setSetupNeeded] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [host, setHost] = useState('')
  useEffect(() => { setHost(window.location.host) }, [])

  const load = useCallback(async () => {
    const res = await fetch('/api/devices').catch(() => null)
    const data = res ? await res.json().catch(() => ({})) : {}
    setScreens(data.devices ?? [])
    setSetupNeeded(!!data.setupNeeded)
  }, [])

  useEffect(() => { load() }, [load])

  async function remove(s: Screen) {
    if (!window.confirm(`Remove ${s.name}? It will go back to the pairing screen.`)) return
    setBusy(s.id)
    await fetch(`/api/devices/${s.id}`, { method: 'DELETE' }).catch(() => null)
    setBusy(null)
    load()
  }

  const muted = { fontSize: '0.73rem', color: 'var(--muted)', lineHeight: 1.6 } as const
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
      <span style={muted}>
        On the iPad, open <strong style={{ color: 'var(--text)' }}>{host}/pair</strong>, then scan its code with this phone.
      </span>
      {setupNeeded && <span style={{ ...muted, color: 'var(--rose)' }}>Pairing needs its database table first.</span>}
      {screens === null ? (
        <span style={{ ...muted, opacity: 0.7 }}>Checking…</span>
      ) : screens.length === 0 ? null : screens.map(s => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{s.name}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{ago(s.last_seen_at)}</div>
          </div>
          <button onClick={() => remove(s)} disabled={busy === s.id} style={{
            padding: '0.4rem 0.9rem', borderRadius: 8, border: '1px solid var(--rose)', background: 'transparent',
            color: 'var(--rose)', fontSize: '0.72rem', cursor: 'pointer', opacity: busy === s.id ? 0.4 : 1, fontFamily: 'var(--font-body)',
          }}>{busy === s.id ? 'Removing…' : 'Remove'}</button>
        </div>
      ))}
    </div>
  )
}
