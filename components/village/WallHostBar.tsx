'use client'

import { useRef, useState } from 'react'
import type { GuestContribution, AgendaItem, GatheringMemory } from '@/lib/hooks/useGathering'

// A host's controls on the wall itself, hidden behind a deliberate
// long-press in the bottom-left corner (2026-09-03). The room is full of
// guests, so this never just sits on screen. No music controls — the
// playlist is an embedded iframe we can't drive. What a host actually
// needs mid-party: pin a message big, tick the next thing off the plan,
// and end the night.

const HOLD_MS = 800
const SLOP = 12

export default function WallHostBar({
  contributions, agenda, pinnedId, onSetPinned, onSetAgenda, onCloseGathering,
}: {
  contributions: GuestContribution[]
  agenda: AgendaItem[]
  pinnedId: string | null
  onSetPinned?: (id: string | null) => void
  onSetAgenda?: (items: AgendaItem[]) => void
  onCloseGathering?: () => void | Promise<GatheringMemory | null>
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    start.current = null
  }
  const armHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setOpen(false), 8000)
  }

  const pinnable = contributions
    .filter(c => c.status === 'visible' && (c.kind === 'thank_you' || c.kind === 'guestbook' || c.kind === 'note') && c.body)
    .slice(-6)
    .reverse()
  const nextBeat = agenda.find(a => !a.done)

  return (
    <>
      {/* Invisible long-press target, bottom-left, clear of the swipe-up
          sheet handle (bottom-centre) and the scene's pan area. */}
      <div
        onPointerDown={e => {
          start.current = { x: e.clientX, y: e.clientY }
          timer.current = setTimeout(() => { setOpen(true); armHide() }, HOLD_MS)
        }}
        onPointerMove={e => {
          if (!start.current) return
          if (Math.abs(e.clientX - start.current.x) > SLOP || Math.abs(e.clientY - start.current.y) > SLOP) cancel()
        }}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        style={{ position: 'absolute', left: 0, bottom: 0, width: 48, height: 48, zIndex: 6 }}
        aria-hidden
      />

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          onPointerDown={armHide}
          style={{
            position: 'absolute', left: '0.6rem', bottom: '0.6rem', zIndex: 12,
            width: 'min(15rem, 70vw)', background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '0.6rem', fontFamily: 'var(--font-body)',
            boxShadow: '0 12px 34px color-mix(in srgb, var(--text) 22%, transparent)',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>Host</span>
            <button onClick={() => setOpen(false)} style={iconBtn}>✕</button>
          </div>

          {nextBeat && onSetAgenda && (
            <button
              className="press"
              onClick={() => onSetAgenda(agenda.map(a => (a.id === nextBeat.id ? { ...a, done: true } : a)))}
              style={rowBtn}
            >
              ✓ {nextBeat.time ? `${nextBeat.time} · ` : ''}{nextBeat.label} — done
            </button>
          )}

          {onSetPinned && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Pin a message to the wall</span>
              {pinnedId && (
                <button className="press" onClick={() => onSetPinned(null)} style={{ ...rowBtn, color: 'var(--muted)' }}>
                  Clear the pinned message
                </button>
              )}
              {pinnable.length === 0 && <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>No messages yet.</span>}
              {pinnable.map(c => (
                <button
                  key={c.id}
                  className="press"
                  onClick={() => onSetPinned(c.id === pinnedId ? null : c.id)}
                  style={{ ...rowBtn, ...(c.id === pinnedId ? { borderColor: 'var(--gold)', color: 'var(--gold)' } : {}) }}
                >
                  <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.body}{c.guest_name ? ` — ${c.guest_name}` : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {onCloseGathering && (
            <button
              className="press"
              onClick={() => { if (confirm('End the gathering? The village goes back to normal and a keepsake is saved.')) void onCloseGathering() }}
              style={{ ...rowBtn, marginTop: '0.2rem', color: 'var(--rose)', borderColor: 'color-mix(in srgb, var(--rose) 40%, var(--border))' }}
            >End the gathering</button>
          )}
        </div>
      )}
    </>
  )
}

const iconBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--muted)', padding: 0, lineHeight: 1 }
const rowBtn: React.CSSProperties = {
  textAlign: 'left', width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '0.4rem 0.5rem', fontSize: '0.68rem', color: 'var(--text)',
  cursor: 'pointer', fontFamily: 'inherit',
}
