'use client'

import { useCallback, useEffect, useState } from 'react'

// The 4S half of the Discord link (integration spec §12). Generates a
// short-lived pairing code that someone redeems once with /connect in Discord,
// and lists who's already linked with per-person notification toggles.
//
// Deliberately plain: this is a setup step you do once, not something to
// decorate. It lives inside the Household tab because the code is scoped to one
// household, and there's nothing to connect until you've picked one.

interface Connection {
  id: string
  discord_user_id: string
  email: string | null
  notify: { reminders: boolean; tasks: boolean; maintenance: boolean; shopping: boolean }
  last_used_at: string | null
}

const NOTIFY_LABELS: [keyof Connection['notify'], string][] = [
  ['reminders', 'Household reminders'],
  ['tasks', 'Assigned tasks'],
  ['maintenance', 'Maintenance'],
  ['shopping', 'Shopping updates'],
]

export default function DiscordConnect({ spaceId, spaceName }: { spaceId: string | null; spaceName?: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])

  const loadConnections = useCallback(async () => {
    if (!spaceId) return
    const res = await fetch(`/api/household/connections?spaceId=${spaceId}`)
    if (res.ok) setConnections((await res.json()).connections ?? [])
  }, [spaceId])

  useEffect(() => { loadConnections() }, [loadConnections])

  async function generate() {
    if (!spaceId) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/household/link-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ spaceId }),
      })
      const body = await res.json()
      // Surface the real message rather than swallowing it — a missing
      // migration otherwise looks like "nothing happened".
      if (!res.ok) setError(body.error ?? `Request failed (${res.status})`)
      else setCode(body.code)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reach the server')
    } finally {
      setBusy(false)
    }
  }

  async function toggleNotify(conn: Connection, key: keyof Connection['notify']) {
    const notify = { ...conn.notify, [key]: !conn.notify[key] }
    setConnections(cs => cs.map(c => (c.id === conn.id ? { ...c, notify } : c)))
    await fetch(`/api/household/connections/${conn.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ notify }),
    }).catch(() => {})
  }

  async function disconnect(conn: Connection) {
    setConnections(cs => cs.filter(c => c.id !== conn.id))
    await fetch(`/api/household/connections/${conn.id}`, { method: 'DELETE' }).catch(() => {})
  }

  if (!spaceId) {
    return (
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        Pick a household above to connect it to Discord.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        Link your Discord account to {spaceName ?? 'this household'}. Anything you save from
        Discord lands here, and nothing outside Household is ever visible to the bot.
      </div>

      {connections.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {connections.map(conn => (
            <div key={conn.id} style={{
              border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.85rem',
              display: 'flex', flexDirection: 'column', gap: '0.5rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
                  Connected ✓ — {conn.email ?? 'linked account'}
                </span>
                <button onClick={() => disconnect(conn)} className="btn btn-secondary" style={{ fontSize: '0.68rem' }}>
                  Disconnect
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem 1rem' }}>
                {NOTIFY_LABELS.map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--muted)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={conn.notify[key]} onChange={() => toggleNotify(conn, key)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {code ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '1.6rem', letterSpacing: '0.18em', color: 'var(--gold)', fontVariantNumeric: 'tabular-nums' }}>
            {code}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            In Discord, run <code>/connect {code}</code> within 15 minutes. Each person links
            their own account, so it&apos;s clear who added what.
          </div>
          <button onClick={generate} disabled={busy} className="btn btn-secondary" style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>
            New code
          </button>
        </div>
      ) : (
        <button onClick={generate} disabled={busy} className="btn btn-primary" style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>
          {busy ? 'Generating…' : connections.length > 0 ? 'Link another person' : 'Generate a pairing code'}
        </button>
      )}

      {error && (
        <div style={{ fontSize: '0.72rem', color: 'var(--danger, #d66)', lineHeight: 1.6 }}>{error}</div>
      )}
    </div>
  )
}
