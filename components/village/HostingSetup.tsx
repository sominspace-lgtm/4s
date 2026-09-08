'use client'

import { useState } from 'react'

// "Expecting guests" (2026-09-08) — name the gathering and pick when the
// doors open. A future time creates the gathering in `phase: 'prep'`: the
// village stays calm, a countdown shows on the wall, and the hosts can
// fill in the menu / agenda / checklist ahead of time. Leaving the time
// blank (or "Start hosting now" from the menu) opens the doors straight
// away.
export default function HostingSetup({ onStart, onClose }: {
  onStart: (title: string, opts?: { startsAt?: string | null }) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState('Dinner at ours')
  // Default: next top of the hour, a couple of hours out.
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() + 2 * 3_600_000)
    d.setMinutes(0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  const submit = (withTime: boolean) => {
    const startsAt = withTime && when ? new Date(when).toISOString() : null
    onStart(title, { startsAt })
    onClose()
  }

  const field: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '0.4rem 0.55rem', fontSize: '0.8rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', background: 'color-mix(in srgb, var(--bg) 45%, transparent)', backdropFilter: 'blur(3px)',
    }}>
      <div onClick={e => e.stopPropagation()} className="organic" style={{
        width: 'min(21rem, 100%)', background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
        boxShadow: '0 20px 50px color-mix(in srgb, var(--text) 25%, transparent)',
      }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text)' }}>Expecting guests</span>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.68rem', color: 'var(--muted)' }}>
          The occasion
          <input value={title} onChange={e => setTitle(e.target.value)} style={field} placeholder="Dinner at ours" />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.68rem', color: 'var(--muted)' }}>
          Doors open
          <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={field} />
        </label>

        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
          <button onClick={() => submit(false)} className="press" style={{
            flex: 1, background: 'none', border: '1px solid var(--border)', borderRadius: 10,
            padding: '0.5rem', fontSize: '0.75rem', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit',
          }}>Open now</button>
          <button onClick={() => submit(true)} className="press" style={{
            flex: 2, background: 'var(--rose)', color: 'var(--bg)', border: 'none', borderRadius: 10,
            padding: '0.5rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}>Schedule it</button>
        </div>
      </div>
    </div>
  )
}
