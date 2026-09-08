'use client'

import { useState } from 'react'
import type { Gathering, PrepItem } from '@/lib/hooks/useGathering'
import IconButton from '@/components/ui/IconButton'

// The getting-started checklist, as a one-time popup (2026-09-04) — used
// to gate a whole separate "prep" scene phase; now a gathering goes live
// immediately and this is just a nudge shown once right after starting
// (Village.tsx), reopenable any time from the ⋯ menu ("Checklist"). Same
// data (gathering.prep / onUpdatePrep) as before, just presented as a
// dismissible card instead of a mode.
export default function GatheringChecklistPopup({ gathering, signals = [], startsAt = null, onUpdate, onClose }: {
  gathering: Gathering
  /** Auto-checked items derived from real state (Somi's feed chore, the
   *  porch light, the playlist / album) — read-only, shown above the
   *  manual list. See Village.tsx's hostSignals. */
  signals?: { key: string; label: string; done: boolean }[]
  /** When the doors open, for the "Expecting guests" countdown line. */
  startsAt?: string | null
  onUpdate?: (items: PrepItem[]) => void
  onClose: () => void
}) {
  const [adding, setAdding] = useState('')
  const items = gathering.prep ?? []
  const doneCount = items.filter(i => i.done).length

  const untilDoors = startsAt ? new Date(startsAt).getTime() - Date.now() : null
  const countdown = untilDoors != null && untilDoors > 0
    ? untilDoors < 3_600_000
      ? `Doors open in ${Math.max(1, Math.round(untilDoors / 60_000))} min`
      : untilDoors < 86_400_000
        ? `Doors open in ${Math.round(untilDoors / 3_600_000)} h`
        : `Doors open ${new Date(startsAt!).toLocaleDateString(undefined, { weekday: 'short' })} ${new Date(startsAt!).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
    : null

  const toggle = (id: string) => onUpdate?.(items.map(i => (i.id === id ? { ...i, done: !i.done } : i)))
  const add = () => {
    const t = adding.trim()
    if (!t) return
    onUpdate?.([...items, { id: crypto.randomUUID(), text: t, done: false }])
    setAdding('')
  }

  return (
    <div onClick={onClose} style={{
      position: 'absolute', inset: 0, zIndex: 15, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', background: 'color-mix(in srgb, var(--bg) 45%, transparent)', backdropFilter: 'blur(3px)',
    }}>
      <div onClick={e => e.stopPropagation()} className="organic" style={{
        width: 'min(22rem, 100%)',
        background: 'color-mix(in srgb, var(--rose) 9%, var(--surface))',
        border: '1px solid color-mix(in srgb, var(--rose) 26%, var(--border))',
        borderRadius: 16, padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
        boxShadow: '0 20px 50px color-mix(in srgb, var(--text) 25%, transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', flex: 1 }}>
            Getting ready · {gathering.title}
          </span>
          {items.length > 0 && (
            <span style={{ fontSize: '0.64rem', color: 'var(--muted)' }}>{doneCount}/{items.length}</span>
          )}
          <IconButton label="Close" onClick={onClose} size={13}>✕</IconButton>
        </div>

        {countdown && (
          <div style={{ fontSize: '0.7rem', color: 'var(--rose)', fontWeight: 500 }}>{countdown}</div>
        )}

        {signals.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingBottom: '0.15rem', borderBottom: '1px solid color-mix(in srgb, var(--border) 60%, transparent)' }}>
            {signals.map(s => (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  width: 17, height: 17, flexShrink: 0, borderRadius: 5,
                  border: `1.5px solid ${s.done ? 'var(--emerald)' : 'var(--border)'}`,
                  background: s.done ? 'var(--emerald)' : 'none', color: 'var(--bg)', fontSize: '0.7rem',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                }}>{s.done ? '✓' : ''}</span>
                <span style={{ fontSize: '0.78rem', color: s.done ? 'var(--muted)' : 'var(--text)' }}>{s.label}</span>
                <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.7, marginLeft: 'auto' }}>auto</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {items.map(i => (
            <button key={i.id} onClick={() => toggle(i.id)} className="press" style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none',
              cursor: 'pointer', textAlign: 'left', padding: '0.15rem 0', fontFamily: 'inherit',
            }}>
              <span style={{
                width: 17, height: 17, flexShrink: 0, borderRadius: 5, border: '1.5px solid var(--border)',
                background: i.done ? 'var(--emerald)' : 'none', color: 'var(--bg)', fontSize: '0.7rem',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}>{i.done ? '✓' : ''}</span>
              <span style={{ fontSize: '0.78rem', color: i.done ? 'var(--muted)' : 'var(--text)', textDecoration: i.done ? 'line-through' : 'none' }}>
                {i.text}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.3rem' }}>
          <input
            value={adding}
            onChange={e => setAdding(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }}
            placeholder="Add to the list"
            style={{
              flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '0.35rem 0.55rem', fontSize: '0.74rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button onClick={add} className="press" aria-label="Add" style={{
            background: 'var(--rose)', color: 'var(--bg)', border: 'none', borderRadius: 8,
            padding: '0 0.6rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600, lineHeight: 1,
          }}>+</button>
        </div>

        <button onClick={onClose} className="press" style={{
          marginTop: '0.1rem', background: 'var(--rose)', color: 'var(--bg)', border: 'none',
          borderRadius: 10, padding: '0.55rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
        }}>Got it</button>
      </div>
    </div>
  )
}
