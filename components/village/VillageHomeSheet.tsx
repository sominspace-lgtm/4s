'use client'

import { useRef, useState } from 'react'
import { addDays, format, isSameDay, parseISO } from 'date-fns'
import { useHousehold, choreDue } from '@/lib/hooks/useHousehold'
import { useDateIdeas } from '@/lib/hooks/useDateIdeas'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { NEARBY_TAG, NEW_HOME } from '@/components/household/NearbyPlaces'

// The shared/kiosk-mode counterpart to VillageWidgets (2026-08-25) — same
// household data (useHousehold/useDateIdeas/usePlaces, nothing new), but
// presented as a swipe-up sheet over the Village scene instead of a dock
// below it, for the "ambient default, swipe up for what's useful" iPad
// experience. VillageWidgets stays exactly as-is for personal (non-shared)
// browsing; this is specifically the wall-mounted-device shape of the same
// information. Only ever mounted when `locked` (shared mode) is true — see
// Village.tsx.
export default function VillageHomeSheet({ userId, spaceId, ambient, onInteract }: {
  userId: string
  spaceId: string | null
  /** Idle-mode is on — force the sheet closed and hide even the handle's
   *  label, leaving just a bare sliver so the scene reads as pure picture. */
  ambient: boolean
  /** Called on any drag/tap so the idle timer resets — see useIdleAmbient. */
  onInteract?: () => void
}) {
  const h = useHousehold(spaceId)
  const { ideas } = useDateIdeas(spaceId)
  const { places } = usePlaces()
  const [open, setOpen] = useState(false)
  const [dragY, setDragY] = useState<number | null>(null)
  const startY = useRef(0)
  const dragging = useRef(false)

  // Ambient mode always wins — a sheet left open when the screen goes idle
  // would defeat the whole point of the picture-frame default.
  const effectiveOpen = ambient ? false : open

  const today = new Date()
  const week = [...Array(7)].map((_, i) => addDays(today, i))
  const tonight = h.meals.find(m => m.slot === 'dinner' && isSameDay(parseISO(m.meal_date), today))
  const choresToday = h.chores.filter(c => choreDue(c) <= 0)
  const nearbyCount = places.filter(p => p.tags?.includes(NEARBY_TAG)).length
  const plannedIdeas = ideas.filter(i => i.status === 'planned')
  const shownIdeas = [...ideas]
    .filter(i => i.status !== 'done')
    .sort((a, b) => (a.status === 'planned' ? -1 : 0) - (b.status === 'planned' ? -1 : 0))
    .slice(0, 4)

  const SHEET_HEIGHT = 260 // px, matches the max-height below

  function onPointerDown(e: React.PointerEvent) {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    startY.current = e.clientY
    dragging.current = true
    onInteract?.()
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return
    onInteract?.()
    const delta = e.clientY - startY.current // negative while dragging up
    setDragY(effectiveOpen ? Math.max(0, delta) : Math.min(0, delta))
  }
  function onPointerUp() {
    if (!dragging.current) return
    dragging.current = false
    const delta = dragY ?? 0
    if (effectiveOpen) { if (delta > 40) setOpen(false) } // dragged down enough to close
    else { if (delta < -40) setOpen(true) } // dragged up enough to open
    setDragY(null)
  }

  const translateY = dragY != null
    ? (effectiveOpen ? dragY : SHEET_HEIGHT + dragY)
    : (effectiveOpen ? 0 : SHEET_HEIGHT - 14) // 14px sliver always peeking, as the swipe affordance

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
      {/* Drag handle — the only thing visible while ambient/closed. */}
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
            {plannedIdeas.length + choresToday.length > 0 ? `${plannedIdeas.length + choresToday.length} things today` : 'Swipe up'}
          </span>
        )}
      </div>

      <div style={{ padding: '0 1rem 1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <div>
          <div style={sectionLabelStyle}>Tonight</div>
          {tonight ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
              {tonight.kind === 'eating_out' ? '🍴 ' : ''}{tonight.title}
            </div>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>No dinner planned yet.</div>
          )}
          {choresToday.length > 0 && (
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
              {choresToday.length} chore{choresToday.length > 1 ? 's' : ''} due
            </div>
          )}
        </div>

        <div>
          <div style={sectionLabelStyle}>This week&apos;s meals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {week.map(day => {
              const dinner = h.meals.find(m => m.slot === 'dinner' && isSameDay(parseISO(m.meal_date), day))
              if (!dinner) return null
              return (
                <div key={+day} style={{ display: 'flex', gap: '0.4rem', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.7, width: '2.1rem', flexShrink: 0 }}>{format(day, 'EEE')}</span>
                  <span style={{ fontSize: '0.72rem', color: dinner.kind === 'eating_out' ? 'var(--amber)' : 'var(--text)' }}>{dinner.title}</span>
                </div>
              )
            })}
          </div>
        </div>

        {shownIdeas.length > 0 && (
          <div>
            <div style={sectionLabelStyle}>Date ideas</div>
            {shownIdeas.map(i => (
              <div key={i.id} style={{ fontSize: '0.72rem', color: 'var(--text)', display: 'flex', gap: '0.35rem', alignItems: 'baseline' }}>
                {i.status === 'planned' && <span aria-hidden style={{ fontSize: '0.55rem', color: 'var(--emerald)' }}>●</span>}
                {i.title}
              </div>
            ))}
          </div>
        )}

        {nearbyCount > 0 && (
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
            📍 {nearbyCount} place{nearbyCount > 1 ? 's' : ''} saved around {NEW_HOME.city}
          </div>
        )}
      </div>
    </div>
  )
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.65, marginBottom: '0.3rem',
}
