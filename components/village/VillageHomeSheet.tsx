'use client'

import { useRef, useState } from 'react'
import type { SectionConfig } from '@/components/ui/SectionCustomizer'
import type { VillageState } from '@/lib/village/state'
import Icon from '@/components/ui/Icon'
import NowNext from './NowNext'
import VillagePanelBlocks from './VillagePanelBlocks'
import type { Gathering, PrepItem } from '@/lib/hooks/useGathering'

// The wall / kiosk counterpart to VillageWidgets — a swipe-up sheet over the
// Village scene. Content comes from VillagePanelBlocks:
//   - a prep gathering → the getting-ready checklist above the panel
//   - a live gathering → the guest set (visuals + guest actions + QR, no
//     house controls)
//   - otherwise → the customizable personal home panel (variant "wall")
// Only mounted when `locked` (shared mode) — see Village.tsx.
export default function VillageHomeSheet({
  userId, spaceId, ambient, onInteract, gathering, onStartGathering, onUpdatePrep, onOpenDoors,
  village, panelBlocks = [], onLockedNavigate, guestUrl = null, qrDataUri = null,
}: {
  userId: string
  spaceId: string | null
  ambient: boolean
  onInteract?: () => void
  gathering?: Gathering | null
  onStartGathering?: (title: string, opts?: { startsAt?: string | null; phase?: 'prep' | 'live' }) => void
  onUpdatePrep?: (items: PrepItem[]) => void
  onOpenDoors?: () => void
  village?: VillageState | null
  panelBlocks?: SectionConfig[]
  onLockedNavigate?: (label: string) => void
  guestUrl?: string | null
  qrDataUri?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [dragY, setDragY] = useState<number | null>(null)
  const startY = useRef(0)
  const dragging = useRef(false)

  const effectiveOpen = ambient ? false : open
  const guestLive = gathering?.phase === 'live'
  const SHEET_HEIGHT = 460

  function onPointerDown(e: React.PointerEvent) {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    startY.current = e.clientY
    dragging.current = true
    onInteract?.()
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return
    onInteract?.()
    const delta = e.clientY - startY.current
    setDragY(effectiveOpen ? Math.max(0, delta) : Math.min(0, delta))
  }
  function onPointerUp() {
    if (!dragging.current) return
    dragging.current = false
    const delta = dragY ?? 0
    if (effectiveOpen) { if (delta > 40) setOpen(false) }
    else { if (delta < -40) setOpen(true) }
    setDragY(null)
  }

  const translateY = dragY != null
    ? (effectiveOpen ? dragY : SHEET_HEIGHT + dragY)
    : (effectiveOpen ? 0 : SHEET_HEIGHT - 14)

  return (
    <div
      style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: SHEET_HEIGHT,
        transform: `translateY(${translateY}px)`,
        transition: dragY != null ? 'none' : 'transform 280ms cubic-bezier(.2,.8,.3,1)',
        background: 'color-mix(in srgb, var(--surface) 94%, transparent)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--border)', borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 20px color-mix(in srgb, var(--text) 8%, transparent)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => { if (!ambient) { setOpen(o => !o); onInteract?.() } }}
        style={{ padding: '0.6rem 0 0.4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', touchAction: 'none' }}
      >
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
        {!ambient && !effectiveOpen && (
          <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.8 }}>
            {guestLive ? 'Leave something' : 'Swipe up'}
          </span>
        )}
      </div>

      <div style={{ padding: '0 1rem 0.5rem' }}>
        <NowNext spaceId={spaceId} />
      </div>

      {gathering?.phase === 'prep' ? (
        <div style={{ padding: '0 1rem 0.6rem' }}>
          <PrepPanel gathering={gathering} onUpdate={onUpdatePrep} onOpenDoors={onOpenDoors} onInteract={onInteract} />
        </div>
      ) : !gathering && onStartGathering ? (
        <div style={{ padding: '0 1rem 0.6rem' }}>
          <button
            onClick={() => {
              const title = window.prompt('Name this gathering (shown on the keepsake later):', 'Dinner at ours')
              if (title !== null) { onStartGathering(title, { phase: 'prep' }); onInteract?.() }
            }}
            className="press"
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              background: 'color-mix(in srgb, var(--rose) 12%, var(--surface))',
              border: '1px solid color-mix(in srgb, var(--rose) 30%, var(--border))',
              borderRadius: 12, padding: '0.6rem', cursor: 'pointer', color: 'var(--text)',
              fontFamily: 'inherit', fontSize: '0.78rem',
            }}
          >
            <Icon name="sparkle" size={15} /> Hosting tonight
          </button>
        </div>
      ) : null}

      <div style={{ padding: '0.2rem 1rem 1.1rem', overflowY: 'auto' }}>
        <VillagePanelBlocks
          blocks={panelBlocks}
          variant={guestLive ? 'guest' : 'wall'}
          spaceId={spaceId}
          userId={userId}
          village={village}
          locked
          onLockedNavigate={onLockedNavigate}
          onInteract={onInteract}
          gathering={gathering}
          guestUrl={guestUrl}
          qrDataUri={qrDataUri}
        />
      </div>
    </div>
  )
}

function PrepPanel({ gathering, onUpdate, onOpenDoors, onInteract }: {
  gathering: Gathering
  onUpdate?: (items: PrepItem[]) => void
  onOpenDoors?: () => void
  onInteract?: () => void
}) {
  const [adding, setAdding] = useState('')
  const items = gathering.prep ?? []
  const doneCount = items.filter(i => i.done).length

  const toggle = (id: string) => { onUpdate?.(items.map(i => (i.id === id ? { ...i, done: !i.done } : i))); onInteract?.() }
  const add = () => {
    const t = adding.trim()
    if (!t) return
    onUpdate?.([...items, { id: crypto.randomUUID(), text: t, done: false }])
    setAdding('')
    onInteract?.()
  }

  return (
    <div className="organic" style={{
      background: 'color-mix(in srgb, var(--rose) 9%, var(--surface2))',
      border: '1px solid color-mix(in srgb, var(--rose) 24%, var(--border))',
      borderRadius: 14, padding: '0.7rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.45rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <Icon name="sparkle" size={15} style={{ color: 'var(--rose)' }} />
        <span style={{ fontSize: '0.76rem', fontWeight: 500, color: 'var(--text)', flex: 1 }}>
          Getting ready · {gathering.title}
        </span>
        {items.length > 0 && (
          <span style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>{doneCount}/{items.length}</span>
        )}
      </div>

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
            <span style={{ fontSize: '0.74rem', color: i.done ? 'var(--muted)' : 'var(--text)', textDecoration: i.done ? 'line-through' : 'none' }}>
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
            borderRadius: 8, padding: '0.3rem 0.5rem', fontSize: '0.7rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
          }}
        />
        <button onClick={add} className="press" aria-label="Add" style={{
          background: 'var(--rose)', color: 'var(--bg)', border: 'none', borderRadius: 8,
          padding: '0 0.5rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, lineHeight: 1,
        }}>+</button>
      </div>

      <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.64rem', color: 'var(--muted)' }}>
        <span>{gathering.music_url ? '♪ playlist ready' : '♪ no playlist'}</span>
        <span>{gathering.photo_album_url ? '▦ album ready' : '▦ no album'}</span>
      </div>

      <button
        onClick={() => {
          try { window.open(`${window.location.origin}/g/${gathering.token}`, '_blank', 'noopener') } catch { /* ignore */ }
          onInteract?.()
        }}
        className="press"
        style={{
          marginTop: '0.15rem', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '0.5rem', fontSize: '0.74rem', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
        }}
      >Preview as a guest ↗</button>

      <button onClick={() => { onOpenDoors?.(); onInteract?.() }} className="press" style={{
        background: 'var(--rose)', color: 'var(--bg)', border: 'none',
        borderRadius: 10, padding: '0.55rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>Open the doors</button>
    </div>
  )
}
