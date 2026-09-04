'use client'

import { useState } from 'react'
import Icon from '@/components/ui/Icon'
import GuestActionForm, { GUEST_ACTIONS, useGuestName, type GuestActionKind } from '@/components/guest/GuestActionForm'

// Guest actions on the wall itself — the same contributions the
// /g/[token] phone portal collects, posted to the same endpoint. The
// per-kind form body is shared (components/guest/GuestActionForm.tsx);
// this file owns the wall's landing grid, its confirmation line, and the
// theme-styled shell. This is the ONLY interactive surface in guest mode.

type Kind = GuestActionKind

export default function GuestWallActions({ token, onInteract }: { token: string; onInteract?: () => void }) {
  const [open, setOpen] = useState<Kind | null>(null)
  const [justLeft, setJustLeft] = useState(false)
  const [name, rememberName] = useGuestName()

  if (justLeft) {
    return (
      <div style={shell}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text)', textAlign: 'center' }}>✨ Left in the village.</div>
        <button onClick={() => setJustLeft(false)} className="press" style={pillBtn}>Leave something else</button>
      </div>
    )
  }

  if (open) {
    return (
      <div style={shell}>
        <GuestActionForm
          token={token}
          surface="wall"
          kind={open}
          guestName={name}
          onGuestName={rememberName}
          onBack={() => setOpen(null)}
          onDone={() => { setOpen(null); setJustLeft(true); onInteract?.() }}
        />
      </div>
    )
  }

  return (
    <div style={shell}>
      <div style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text)' }}>Leave something</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))', gap: '0.4rem' }}>
        {GUEST_ACTIONS.map(a => (
          <button key={a.kind} onClick={() => { setOpen(a.kind); onInteract?.() }} className="press" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '0.6rem 0.3rem', cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit',
          }}>
            <Icon name={a.icon} size={17} />
            <span style={{ fontSize: '0.62rem', textAlign: 'center' }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

const shell: React.CSSProperties = {
  background: 'color-mix(in srgb, var(--rose) 9%, var(--surface2))',
  border: '1px solid color-mix(in srgb, var(--rose) 24%, var(--border))',
  borderRadius: 14, padding: '0.7rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
}
const pillBtn: React.CSSProperties = {
  background: 'var(--rose)', color: 'var(--bg)', border: 'none', borderRadius: 10,
  padding: '0.5rem', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
}
