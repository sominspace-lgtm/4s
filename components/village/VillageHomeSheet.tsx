'use client'

import { useRef, useState } from 'react'
import type { SectionConfig } from '@/components/ui/SectionCustomizer'
import type { VillageState } from '@/lib/village/state'
import Icon from '@/components/ui/Icon'
import NowNext from './NowNext'
import VillagePanelBlocks from './VillagePanelBlocks'
import type { Gathering } from '@/lib/hooks/useGathering'

// The wall / kiosk counterpart to VillageWidgets — a swipe-up sheet over the
// Village scene. Content comes from VillagePanelBlocks:
//   - a live gathering → the guest set (visuals + guest actions + QR, no
//     house controls)
//   - otherwise → the customizable personal home panel (variant "wall")
// No prep phase any more (round 80, 2026-09-04) — starting a gathering
// opens the doors immediately.
// Only mounted when `locked` (shared mode) — see Village.tsx.
export default function VillageHomeSheet({
  userId, spaceId, ambient, onInteract, gathering, onStartGathering,
  village, panelBlocks = [], onLockedNavigate, guestUrl = null, qrDataUri = null,
}: {
  userId: string
  spaceId: string | null
  ambient: boolean
  onInteract?: () => void
  gathering?: Gathering | null
  onStartGathering?: (title: string, opts?: { startsAt?: string | null }) => void
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.8 }}>
            {/* Tap is the primary affordance now (round 80, 2026-09-04) —
                the swipe still works underneath, this is just the hint
                copy + a small caret instead of "Swipe up". */}
            {guestLive ? 'Leave something' : 'Tap for more'}
            {!guestLive && (
              <svg width="9" height="6" viewBox="0 0 9 6" aria-hidden style={{ opacity: 0.9 }}>
                <path d="M1 5 L4.5 1.5 L8 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
        )}
      </div>

      <div style={{ padding: '0 1rem 0.5rem' }}>
        <NowNext spaceId={spaceId} />
      </div>

      {/* No prep phase any more (round 80, 2026-09-04) — starting a
          gathering opens the doors immediately; the getting-ready
          checklist is a one-time popup now (GatheringChecklistPopup, in
          Village.tsx), not a separate scene state gating this sheet. */}
      {!gathering && onStartGathering ? (
        <div style={{ padding: '0 1rem 0.6rem' }}>
          <button
            onClick={() => {
              const title = window.prompt('Name this gathering (shown on the keepsake later):', 'Dinner at ours')
              if (title !== null) { onStartGathering(title); onInteract?.() }
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
            <Icon name="sparkle" size={15} /> Start hosting
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
