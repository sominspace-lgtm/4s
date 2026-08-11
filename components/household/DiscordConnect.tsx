'use client'

import { useState } from 'react'

// The 4S half of the Discord link (integration spec §12). Generates a
// short-lived pairing code that someone redeems once with /connect in Discord.
//
// Deliberately plain: this is a setup step you do once, not something to
// decorate. It lives inside the Household tab because the code is scoped to one
// household, and there's nothing to connect until you've picked one.
export default function DiscordConnect({ spaceId, spaceName }: { spaceId: string | null; spaceName?: string }) {
  const [code, setCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

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

  if (!spaceId) {
    return (
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        Pick a household above to connect it to Discord.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6 }}>
        Link your Discord account to {spaceName ?? 'this household'}. Anything you save from
        Discord lands here, and nothing outside Household is ever visible to the bot.
      </div>

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
          {busy ? 'Generating…' : 'Generate a pairing code'}
        </button>
      )}

      {error && (
        <div style={{ fontSize: '0.72rem', color: 'var(--danger, #d66)', lineHeight: 1.6 }}>{error}</div>
      )}
    </div>
  )
}
