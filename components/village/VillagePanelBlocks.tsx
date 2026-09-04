'use client'

import { useState } from 'react'
import { addDays, format, isSameDay, parseISO } from 'date-fns'
import type { SectionConfig } from '@/components/ui/SectionCustomizer'
import { useHousehold, choreDue, dinnerFor } from '@/lib/hooks/useHousehold'
import { kitchenLookup, openExternal } from '@/lib/utils/cheatSheets'
import { goToSection, goToHousehold } from '@/lib/utils/navigate'
import type { VillageState } from '@/lib/village/state'
import type { Gathering } from '@/lib/hooks/useGathering'
import Icon, { type IconName } from '@/components/ui/Icon'
import ScenesCard from './ScenesCard'
import ShortcutsCard from './ShortcutsCard'
import ProgressCard from './ProgressCard'
import MiniCalendarCard from './MiniCalendarCard'
import TodosCard from './TodosCard'
import GuestWallActions from './GuestWallActions'
import MusicCard from './MusicCard'

// The Village home panel's content, block by block. The two shells
// (VillageHomeSheet on the wall, VillageWidgets on the personal dock) own the
// swipe/collapse chrome; this owns what's in them.
//
//   variant 'wall' / 'dock' — the customizable personal set (a smart-home
//     hub, tab shortcuts, progress, plus whatever household glances are
//     enabled). Reorder/hide via the ⋯ → Customize panel drawer.
//   variant 'guest' — a live gathering. Ignores `blocks`: read-only life
//     visuals + guest-contribution actions + the QR. No house controls, no
//     shortcuts, no quick-adds.

export interface VillagePanelProps {
  blocks: SectionConfig[]
  variant: 'wall' | 'dock' | 'guest'
  spaceId: string | null
  userId: string
  village?: VillageState | null
  locked?: boolean
  onLockedNavigate?: (label: string) => void
  onInteract?: () => void
  gathering?: Gathering | null
  guestUrl?: string | null
  qrDataUri?: string | null
}

export default function VillagePanelBlocks(props: VillagePanelProps) {
  if (props.variant === 'guest') return <GuestSet {...props} />

  const { blocks, spaceId, locked, onLockedNavigate, onInteract, village } = props
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      {blocks.filter(b => !b.hidden).map(b => {
        switch (b.id) {
          case 'house':     return <ScenesCard key={b.id} spaceId={spaceId} onInteract={onInteract} />
          case 'shortcuts': return <ShortcutsCard key={b.id} locked={locked} onLockedNavigate={onLockedNavigate} onInteract={onInteract} />
          case 'progress':  return <ProgressCard key={b.id} village={village} />
          case 'calendar':  return <MiniCalendarCard key={b.id} spaceId={spaceId} locked={locked} onLockedNavigate={onLockedNavigate} />
          case 'todos':     return <TodosCard key={b.id} spaceId={spaceId} onInteract={onInteract} />
          case 'tonight':   return <TonightCard key={b.id} spaceId={spaceId} onInteract={onInteract} />
          case 'meals':     return <MealsCard key={b.id} spaceId={spaceId} />
          case 'shopping':  return <ShoppingCard key={b.id} spaceId={spaceId} onInteract={onInteract} />
          default:          return null
        }
      })}
    </div>
  )
}

// ── Guest set ──────────────────────────────────────────────────────────────

function GuestSet({ village, gathering, guestUrl, qrDataUri, spaceId, onInteract }: VillagePanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <ProgressCard village={village} guest />
      {gathering && <GuestWallActions token={gathering.token} photoAlbumUrl={gathering.photo_album_url} onInteract={onInteract} />}
      <MusicCard spaceId={spaceId} compact readOnly />
      {(qrDataUri || gathering?.photo_album_url) && (
        <div className="organic" style={{
          background: 'color-mix(in srgb, var(--gold) 9%, var(--surface2))',
          border: '1px solid color-mix(in srgb, var(--gold) 22%, var(--border))',
          borderRadius: 14, padding: '0.7rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.8rem',
        }}>
          {qrDataUri && (
            <img src={qrDataUri} alt="Scan to leave something" width={68} height={68}
              style={{ borderRadius: 8, background: '#fff', padding: 4, flexShrink: 0 }} />
          )}
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            Scan to leave a note, a song, or a photo from your phone.
            {gathering?.photo_album_url && (
              <> <a href={gathering.photo_album_url} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>Open the album →</a></>
            )}
            {guestUrl && <div style={{ fontSize: '0.6rem', opacity: 0.6, marginTop: '0.2rem' }}>{guestUrl.replace(/^https?:\/\//, '')}</div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Household glance cards ─────────────────────────────────────────────────

function Card({ icon, tint, title, count, onOpen, children }: {
  icon: IconName; tint: string; title: string; count?: number; onOpen?: () => void; children: React.ReactNode
}) {
  const Wrapper = onOpen ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onOpen}
      className={onOpen ? 'press organic' : 'organic'}
      style={{
        textAlign: 'left', cursor: onOpen ? 'pointer' : 'default', fontFamily: 'var(--font-body)', width: '100%',
        background: `color-mix(in srgb, ${tint} 9%, var(--surface2))`,
        border: `1px solid color-mix(in srgb, ${tint} 22%, var(--border))`,
        borderRadius: 14, padding: '0.7rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.35rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span aria-hidden style={{ display: 'inline-flex', color: tint }}><Icon name={icon} size={16} /></span>
          <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text)' }}>{title}</span>
        </div>
        {count !== undefined && count > 0 && (
          <span style={{
            fontSize: '0.62rem', fontWeight: 600, color: tint,
            background: `color-mix(in srgb, ${tint} 16%, transparent)`, borderRadius: 999, padding: '0.1rem 0.5rem',
          }}>{count}</span>
        )}
      </div>
      {children}
    </Wrapper>
  )
}

function Line({ children, dim, italic }: { children: React.ReactNode; dim?: boolean; italic?: boolean }) {
  return (
    <div style={{
      fontSize: '0.74rem', color: dim ? 'var(--muted)' : 'var(--text)', opacity: dim ? 0.8 : 1,
      fontStyle: italic ? 'italic' : 'normal', lineHeight: 1.4,
      minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
    }}>{children}</div>
  )
}

function QuickAdd({ placeholder, onAdd }: { placeholder: string; onAdd: (t: string) => void }) {
  const [text, setText] = useState('')
  const submit = () => { const t = text.trim(); if (!t) return; onAdd(t); setText('') }
  return (
    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
      <input
        value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
        placeholder={placeholder}
        style={{
          flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '0.3rem 0.5rem', fontSize: '0.7rem', color: 'var(--text)', outline: 'none', fontFamily: 'inherit',
        }}
      />
      <button onClick={submit} className="press" aria-label={placeholder} style={{
        background: 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: 8,
        padding: '0 0.5rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, lineHeight: 1,
      }}>+</button>
    </div>
  )
}

const mealLink: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  color: 'var(--gold)', fontSize: '0.68rem', fontFamily: 'inherit',
}

function TonightCard({ spaceId, onInteract }: { spaceId: string | null; onInteract?: () => void }) {
  const h = useHousehold(spaceId)
  const tonight = dinnerFor(h.meals)
  const choresToday = h.chores.filter(c => choreDue(c) <= 0)
  return (
    <Card icon="plate" tint="var(--amber)" title="Tonight">
      {tonight ? (
        <>
          <Line>{tonight.title}</Line>
          <div style={{ display: 'flex', gap: '0.5rem', margin: '0.1rem 0 0.3rem' }}>
            {tonight.recipe_url && (
              <button onClick={() => openExternal(tonight.recipe_url!)} style={mealLink}>Recipe ↗</button>
            )}
            <button onClick={() => openExternal(kitchenLookup(tonight.title))} style={mealLink}>Look it up ↗</button>
          </div>
        </>
      ) : <Line dim italic>No dinner planned yet.</Line>}
      {choresToday.slice(0, 4).map(c => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button onClick={() => { h.markChoreDone(c.id); onInteract?.() }} aria-label={`Mark ${c.name} done`} className="press" style={{
            width: 17, height: 17, flexShrink: 0, borderRadius: 5, border: '1.5px solid var(--border)',
            background: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.7rem', lineHeight: 1,
          }}>✓</button>
          <span style={{ fontSize: '0.72rem', color: 'var(--text)' }}>{c.name}</span>
        </div>
      ))}
    </Card>
  )
}

function MealsCard({ spaceId }: { spaceId: string | null }) {
  const h = useHousehold(spaceId)
  const week = [...Array(7)].map((_, i) => addDays(new Date(), i))
  const any = week.some(d => h.meals.find(m => m.slot === 'dinner' && isSameDay(parseISO(m.meal_date), d)))
  return (
    <Card icon="calendar" tint="var(--blush)" title="This week's meals" onOpen={() => goToHousehold('home')}>
      {!any && <Line dim italic>Nothing planned.</Line>}
      {week.map(day => {
        const dinner = dinnerFor(h.meals, day)
        if (!dinner) return null
        const isToday = isSameDay(day, new Date())
        return (
          <div key={+day} style={{ display: 'flex', gap: '0.4rem', alignItems: 'baseline' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7, width: '2.1rem', flexShrink: 0 }}>{format(day, 'EEE')}</span>
            <span style={{ fontSize: '0.74rem', color: dinner.kind === 'eating_out' ? 'var(--amber)' : 'var(--text)' }}>{dinner.title}</span>
            {isToday && (
              <button onClick={e => { e.stopPropagation(); openExternal(dinner.recipe_url || kitchenLookup(dinner.title)) }} style={mealLink}>↗</button>
            )}
          </div>
        )
      })}
    </Card>
  )
}

function ShoppingCard({ spaceId, onInteract }: { spaceId: string | null; onInteract?: () => void }) {
  const h = useHousehold(spaceId)
  const open = h.shopping.filter(s => !s.got)
  return (
    <Card icon="basket" tint="var(--emerald)" title="Shopping list" count={open.length}>
      {open.slice(0, 6).map(s => (
        <button key={s.id} onClick={() => { h.toggleGot(s.id, true); onInteract?.() }} className="press" style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', padding: '0.1rem 0', fontFamily: 'inherit',
        }}>
          <span style={{ width: 15, height: 15, flexShrink: 0, borderRadius: 4, border: '1.5px solid var(--border)' }} />
          <span style={{ fontSize: '0.74rem', color: 'var(--text)' }}>{s.name}</span>
        </button>
      ))}
      {open.length === 0 && <Line dim italic>Nothing to buy.</Line>}
      <QuickAdd placeholder="Add to shopping" onAdd={t => { h.addShopping(t, null, null); onInteract?.() }} />
    </Card>
  )
}

