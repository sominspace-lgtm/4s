'use client'

import { useState } from 'react'
import { THEMES } from '@/lib/constants/themes'

// Small pieces of the village scene that stand on their own: the welcome
// sign's tag, the ping card's form, and the phone/iPad glance sheet.

// Under the welcome sign: says what tapping it does (2026-10-27).
export function WelcomeTag() {
  return (
    <g pointerEvents="none">
      <rect x={-14} y={3.5} width={28} height={7.5} rx={3.75} fill="#fffaf0" stroke="#c9a97a" strokeWidth={0.5} />
      <text x={0} y={8.9} textAnchor="middle" fontSize={4} fill="#8a5a2c" fontFamily="var(--font-body)">Wi-Fi & info</text>
    </g>
  )
}

// The ping card's body — chips plus, for the partner variant, a free-text
// field ("pick up flour" isn't a preset chip). Its own tiny component so
// the free-text input's state doesn't have to live on VillageScene itself.
export function PingForm({ title, reasons, showNote, onSend }: {
  title: string
  reasons: string[]
  showNote: boolean
  onSend: (text: string, isNote: boolean) => void
}) {
  const [note, setNote] = useState('')
  const chip: React.CSSProperties = {
    fontSize: 8, fontFamily: 'inherit', cursor: 'pointer',
    padding: '2px 6px', borderRadius: 999,
    background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
  }
  return (
    <>
      <div style={{ fontSize: 9.5, fontWeight: 600 }}>{title}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {reasons.map(r => (
          <button key={r} onClick={() => onSend(r, false)} style={chip}>{r}</button>
        ))}
      </div>
      {showNote && (
        <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
          <input
            value={note} onChange={e => setNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && note.trim()) onSend(note.trim(), true) }}
            placeholder="pick up flour…" maxLength={140}
            style={{
              flex: 1, minWidth: 0, fontSize: 8, fontFamily: 'inherit', padding: '3px 6px',
              borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', outline: 'none',
            }}
          />
          <button
            onClick={() => note.trim() && onSend(note.trim(), true)}
            disabled={!note.trim()}
            style={{ ...chip, opacity: note.trim() ? 1 : 0.5, background: 'var(--gold)', borderColor: 'var(--gold)', color: 'var(--bg)' }}
          >Send</button>
        </div>
      )}
    </>
  )
}

// The glance-card as a bottom sheet, for phones (2026-09-07) — the SVG
// popover is fine on a desktop or the wall but on a narrow screen it's a
// tiny target that clips off the top edge. Same content, finger-sized,
// slides up from the bottom. Portalled to <body>, so it re-declares the
// Bloom vars the same way the fullscreen overlay does (the portal lands
// past the card's own theme scope).
export function GlanceSheet({ info, onClose, onPrimary, side = false }: {
  info: { title: string; lines: string[]; actionLabel: string; go: () => void; secondary?: { label: string; go: () => void }; cards?: { text: string; tone?: 'note' }[] }
  onClose: () => void
  /** What the main button does — a district preview step, or straight nav. */
  onPrimary: () => void
  /** The iPad (2026-10-21): a panel down the right side, so the village stays
   *  in view on the left, with type you can read from across the counter. */
  side?: boolean
}) {
  return (
    <div style={{ ...THEMES.bloom, position: 'fixed', inset: 0, zIndex: 4000, display: 'flex', flexDirection: side ? 'row' : 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: side ? 'rgba(20,16,10,0.12)' : 'rgba(20,16,10,0.3)' }} />
      <div className={side ? 'village-side' : 'village-sheet'} style={side ? {
        position: 'relative', background: 'var(--surface)', color: 'var(--text)',
        width: 'min(400px, 42vw)', height: '100%', overflowY: 'auto',
        borderTopLeftRadius: 24, borderBottomLeftRadius: 24, borderLeft: '1px solid var(--border)',
        boxShadow: '-12px 0 44px rgba(0,0,0,0.22)', fontFamily: 'var(--font-body)',
        padding: 'calc(28px + env(safe-area-inset-top, 0px)) 28px calc(28px + env(safe-area-inset-bottom, 0px))',
        display: 'flex', flexDirection: 'column',
      } : {
        position: 'relative', background: 'var(--surface)', color: 'var(--text)',
        borderTopLeftRadius: 20, borderTopRightRadius: 20, borderTop: '1px solid var(--border)',
        boxShadow: '0 -12px 44px rgba(0,0,0,0.28)', fontFamily: 'var(--font-body)',
        padding: '12px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
      }}>
        {side
          ? <button onClick={onClose} aria-label="Close" style={{ alignSelf: 'flex-end', minWidth: 48, minHeight: 48, border: 'none', background: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', margin: '-14px -12px 4px 0' }}>✕</button>
          : <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)', margin: '0 auto 14px' }} />}
        <div style={{ fontFamily: side ? 'var(--font-display)' : undefined, fontSize: side ? 28 : 17, fontWeight: side ? 400 : 600, marginBottom: side ? 12 : 6 }}>{info.title}</div>
        {info.cards && info.cards.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '4px 0 8px' }}>
            {info.cards.map((c, i) => (
              <div key={i} style={{
                fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 14, lineHeight: 1.4,
                color: 'var(--text)', padding: '9px 12px', borderRadius: 8,
                border: '1px solid var(--border)',
                background: c.tone === 'note'
                  ? 'color-mix(in srgb, var(--rose, var(--gold)) 12%, var(--surface))'
                  : 'color-mix(in srgb, var(--gold) 7%, var(--surface))',
                transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}>{c.text}</div>
            ))}
          </div>
        )}
        {info.lines.map((l, i) => (
          <div key={i} style={{ fontSize: side ? 17 : 13.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: side ? 4 : 0 }}>{l}</div>
        ))}
        <button onClick={() => { onPrimary(); onClose() }} style={{
          marginTop: side ? 'auto' : 16, width: '100%', padding: side ? '17px 18px' : '13px 16px', borderRadius: 13,
          background: 'var(--gold)', color: 'var(--bg)', border: 'none',
          fontSize: 14.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
        }}>{info.actionLabel}</button>
        {info.secondary && (
          <button onClick={() => { info.secondary!.go(); onClose() }} style={{
            marginTop: 8, width: '100%', padding: '11px 16px', borderRadius: 13,
            background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)',
            fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
          }}>{info.secondary.label}</button>
        )}
      </div>
    </div>
  )
}
