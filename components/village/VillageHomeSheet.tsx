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

  // Bumped 260->300 (2026-08-25) alongside the section restyle below — real
  // rounded cards with icons take a bit more vertical room than the old
  // plain-text list did, and 260 was starting to clip the last card.
  const SHEET_HEIGHT = 300

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

      {/* Same warm, tinted-card language as VillageWidgets' own Section
          (2026-08-25) — this sheet used to be a plain uppercase-label list,
          which read like a settings panel sliding up over a picture. A grid
          instead of a single column too, since the sheet is wide enough on
          an iPad to show two cards per row without cramping either. */}
      <div style={{
        padding: '0.2rem 1rem 1.1rem', overflowY: 'auto',
        display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      }}>
        <Card icon="🍽️" tint="var(--amber)" title="Tonight">
          {tonight ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text)' }}>
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
        </Card>

        <Card icon="📅" tint="var(--blush)" title="This week’s meals">
          {week.every(day => !h.meals.find(m => m.slot === 'dinner' && isSameDay(parseISO(m.meal_date), day))) && (
            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic' }}>Nothing planned.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {week.map(day => {
              const dinner = h.meals.find(m => m.slot === 'dinner' && isSameDay(parseISO(m.meal_date), day))
              if (!dinner) return null
              return (
                <div key={+day} style={{ display: 'flex', gap: '0.4rem', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7, width: '2.1rem', flexShrink: 0 }}>{format(day, 'EEE')}</span>
                  <span style={{ fontSize: '0.74rem', color: dinner.kind === 'eating_out' ? 'var(--amber)' : 'var(--text)' }}>{dinner.title}</span>
                </div>
              )
            })}
          </div>
        </Card>

        {shownIdeas.length > 0 && (
          <Card icon="💌" tint="var(--rose)" title="Date ideas">
            {shownIdeas.map(i => (
              <div key={i.id} style={{ fontSize: '0.74rem', color: 'var(--text)', display: 'flex', gap: '0.35rem', alignItems: 'baseline' }}>
                {i.status === 'planned' && <span aria-hidden style={{ fontSize: '0.55rem', color: 'var(--emerald)' }}>●</span>}
                {i.title}
              </div>
            ))}
          </Card>
        )}

        {nearbyCount > 0 && (
          <Card icon="📍" tint="var(--emerald)" title={`Near ${NEW_HOME.city}`}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text)' }}>
              {nearbyCount} place{nearbyCount > 1 ? 's' : ''} saved
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// Same visual language as VillageWidgets' own Section — a soft, rounded,
// tinted card per topic instead of a plain uppercase label over a list.
function Card({ icon, tint, title, children }: {
  icon: string; tint: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="organic" style={{
      background: `color-mix(in srgb, ${tint} 9%, var(--surface2))`,
      border: `1px solid color-mix(in srgb, ${tint} 22%, var(--border))`,
      borderRadius: '14px', padding: '0.65rem 0.75rem',
      display: 'flex', flexDirection: 'column', gap: '0.3rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span aria-hidden style={{ fontSize: '1rem', lineHeight: 1 }}>{icon}</span>
        <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}
