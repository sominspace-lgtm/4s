'use client'

import { useRef, useState } from 'react'
import { addDays, format, isSameDay, parseISO } from 'date-fns'
import { useHousehold, choreDue } from '@/lib/hooks/useHousehold'
import { useDateIdeas } from '@/lib/hooks/useDateIdeas'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { NEARBY_TAG, NEW_HOME } from '@/components/household/NearbyPlaces'
import Icon, { type IconName } from '@/components/ui/Icon'
import NowNext from './NowNext'
import MusicCard from './MusicCard'
import ScenesCard from './ScenesCard'
import type { Gathering, PrepItem } from '@/lib/hooks/useGathering'

// The shared/kiosk-mode counterpart to VillageWidgets (2026-08-25) — same
// household data (useHousehold/useDateIdeas/usePlaces, nothing new), but
// presented as a swipe-up sheet over the Village scene instead of a dock
// below it, for the "ambient default, swipe up for what's useful" iPad
// experience. VillageWidgets stays exactly as-is for personal (non-shared)
// browsing; this is specifically the wall-mounted-device shape of the same
// information. Only ever mounted when `locked` (shared mode) is true — see
// Village.tsx.
export default function VillageHomeSheet({ userId, spaceId, ambient, onInteract, gathering, onStartGathering, onUpdatePrep, onOpenDoors }: {
  userId: string
  spaceId: string | null
  /** Idle-mode is on — force the sheet closed and hide even the handle's
   *  label, leaving just a bare sliver so the scene reads as pure picture. */
  ambient: boolean
  /** Called on any drag/tap so the idle timer resets — see useIdleAmbient. */
  onInteract?: () => void
  gathering?: Gathering | null
  onStartGathering?: (title: string, opts?: { startsAt?: string | null; phase?: 'prep' | 'live' }) => void
  onUpdatePrep?: (items: PrepItem[]) => void
  onOpenDoors?: () => void
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
  const SHEET_HEIGHT = 420

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

      {/* Now / Next — the one line worth reading from across the room. */}
      <div style={{ padding: '0 1rem 0.5rem' }}>
        <NowNext spaceId={spaceId} />
      </div>

      {/* Hosting — either a prep checklist (getting ready) or the one button
          that starts one. Live gatherings are handled by the scene + the ⋯
          host panel, not here. */}
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

      {/* Same warm, tinted-card language as VillageWidgets' own Section
          (2026-08-25) — this sheet used to be a plain uppercase-label list,
          which read like a settings panel sliding up over a picture. A grid
          instead of a single column too, since the sheet is wide enough on
          an iPad to show two cards per row without cramping either. */}
      <div style={{
        padding: '0.2rem 1rem 1.1rem', overflowY: 'auto',
        display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      }}>
        <Card icon="plate" tint="var(--amber)" title="Tonight">
          {tonight ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{tonight.title}</div>
          ) : (
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>No dinner planned yet.</div>
          )}
          {choresToday.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.3rem' }}>
              {choresToday.slice(0, 4).map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    onClick={() => { h.markChoreDone(c.id); onInteract?.() }}
                    aria-label={`Mark "${c.name}" done`}
                    className="press"
                    style={{ width: 18, height: 18, flexShrink: 0, borderRadius: 5, border: '1.5px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.7rem', lineHeight: 1 }}
                  >✓</button>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text)' }}>{c.name}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card icon="calendar" tint="var(--blush)" title="This week’s meals">
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
          <Card icon="heart" tint="var(--rose)" title="Date ideas">
            {shownIdeas.map(i => (
              <div key={i.id} style={{ fontSize: '0.74rem', color: 'var(--text)', display: 'flex', gap: '0.35rem', alignItems: 'baseline' }}>
                {i.status === 'planned' && <span aria-hidden style={{ fontSize: '0.55rem', color: 'var(--emerald)' }}>●</span>}
                {i.title}
              </div>
            ))}
          </Card>
        )}

        {nearbyCount > 0 && (
          <Card icon="places" tint="var(--emerald)" title={`Near ${NEW_HOME.city}`}>
            <div style={{ fontSize: '0.74rem', color: 'var(--text)' }}>
              {nearbyCount} place{nearbyCount > 1 ? 's' : ''} saved
            </div>
          </Card>
        )}

        {/* Quick adds — the wall iPad's one bit of "do", not just "look".
            Shared household data, no PIN. */}
        <Card icon="box" tint="var(--gold)" title="Add">
          <QuickAdd placeholder="Add to shopping" onAdd={t => { h.addShopping(t, null, null); onInteract?.() }} />
          <QuickAdd placeholder="Leave a note" onAdd={t => { h.addNote(t); onInteract?.() }} />
        </Card>

        {/* House controls + scenes, and the house playlist — the wall's
            "do" surface beyond quick-adds (2026-09-01). Full-width. */}
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <ScenesCard spaceId={spaceId} onInteract={onInteract} />
          <MusicCard spaceId={spaceId} compact />
        </div>
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

      <button onClick={() => { onOpenDoors?.(); onInteract?.() }} className="press" style={{
        marginTop: '0.15rem', background: 'var(--rose)', color: 'var(--bg)', border: 'none',
        borderRadius: 10, padding: '0.55rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
      }}>Open the doors</button>
    </div>
  )
}

function QuickAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [text, setText] = useState('')
  const submit = () => { const t = text.trim(); if (!t) return; onAdd(t); setText('') }
  return (
    <div style={{ display: 'flex', gap: '0.3rem' }}>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder={placeholder}
        style={{
          flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '0.35rem 0.5rem', fontSize: '0.72rem', color: 'var(--text)',
          outline: 'none', fontFamily: 'inherit',
        }}
      />
      <button onClick={submit} className="press" aria-label={placeholder} style={{
        background: 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: 8,
        padding: '0 0.55rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, lineHeight: 1,
      }}>+</button>
    </div>
  )
}

// Same visual language as VillageWidgets' own Section — a soft, rounded,
// tinted card per topic instead of a plain uppercase label over a list.
function Card({ icon, tint, title, children }: {
  icon: IconName; tint: string; title: string; children: React.ReactNode
}) {
  return (
    <div className="organic" style={{
      background: `color-mix(in srgb, ${tint} 9%, var(--surface2))`,
      border: `1px solid color-mix(in srgb, ${tint} 22%, var(--border))`,
      borderRadius: '14px', padding: '0.65rem 0.75rem',
      display: 'flex', flexDirection: 'column', gap: '0.3rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span aria-hidden style={{ display: 'inline-flex', color: tint }}><Icon name={icon} size={16} /></span>
        <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text)' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}
