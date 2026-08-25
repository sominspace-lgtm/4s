'use client'

import { useState } from 'react'
import { addDays, differenceInCalendarDays, format, isSameDay, parseISO } from 'date-fns'
import { useHousehold, choreDue } from '@/lib/hooks/useHousehold'
import { useDateIdeas } from '@/lib/hooks/useDateIdeas'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { goToSection, goToHousehold } from '@/lib/utils/navigate'
import { NEARBY_TAG, NEW_HOME } from '@/components/household/NearbyPlaces'

// The dock under the village scene (2026-08-24 redesign, was a grid of
// standalone cards) — a single panel attached to the scene above it rather
// than a row of separate bordered boxes floating below it, so it reads as
// "the village continues here" instead of "an unrelated dashboard starts
// here." Collapsed by default to a one-line "what's happening" summary +
// a THIS WEEK stat row; expands to the same real content the old card grid
// had (Tonight, this week's meals, date ideas, nearby, move-in) — nothing
// removed, just reorganized.
//
// Deliberately NOT one widget per feature. Chores, shopping, routines,
// watchlist, notes and the rest all already have a real home in Household and
// gain nothing from a second, smaller, read-only copy here — a dashboard of
// every feature is exactly the "productivity-heavy" thing this shouldn't be.
// Every section below reads an existing hook; none introduces its own storage.
export default function VillageWidgets({ userId, spaceId }: { userId: string; spaceId: string | null }) {
  const h = useHousehold(spaceId)
  const { ideas } = useDateIdeas(spaceId)
  const { places } = usePlaces()
  const [open, setOpen] = useState(false)

  const today = new Date()
  const week = [...Array(7)].map((_, i) => addDays(today, i))

  const tonight = h.meals.find(m => m.slot === 'dinner' && isSameDay(parseISO(m.meal_date), today))
  const choresToday = h.chores.filter(c => choreDue(c) <= 0)
  const nearbyCount = places.filter(p => p.tags?.includes(NEARBY_TAG)).length
  const moveinLeft = h.moveinItems.filter(i => !i.got).length
  const moveinDone = h.moveinItems.length - moveinLeft
  const plannedIdeas = ideas.filter(i => i.status === 'planned')
  // A place saved in the last 7 days — real data (created_at), not a guess —
  // stands in for "something new" in the week strip below.
  const newPlacesThisWeek = places.filter(p => differenceInCalendarDays(today, parseISO(p.created_at)) <= 7).length

  // Planned first — a date that's actually been decided on is more useful at
  // a glance than the back half of a 40-item wishlist.
  const shownIdeas = [...ideas]
    .filter(i => i.status !== 'done')
    .sort((a, b) => (a.status === 'planned' ? -1 : 0) - (b.status === 'planned' ? -1 : 0))
    .slice(0, 4)

  // "What's happening" (2026-08-24) — up to 3 real, concrete things: planned
  // dates first (they were deliberately decided on), then tonight's dinner
  // if it isn't already one of them. No fabricated dates — planned date
  // ideas have a status, not a scheduled day, so this reads as "planned",
  // not "Friday".
  const happenings: { label: string; sub: string }[] = plannedIdeas
    .slice(0, 3)
    .map(i => ({ label: i.title, sub: 'planned' }))
  if (tonight && happenings.length < 3) {
    happenings.push({ label: tonight.title, sub: tonight.kind === 'eating_out' ? 'eating out tonight' : 'dinner tonight' })
  }

  return (
    <div className="lift organic" style={{
      marginTop: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      background: 'var(--surface)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="press"
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)',
          background: 'none', border: 'none', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>
            {happenings.length === 0
              ? 'Your village is quiet today.'
              : `${happenings.length} thing${happenings.length > 1 ? 's are' : ' is'} happening`}
          </span>
          <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{open ? '▾ less' : '▸ more'}</span>
        </div>

        {happenings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            {happenings.map((it, i) => (
              <div key={i} style={{ fontSize: '0.68rem', color: 'var(--muted)', display: 'flex', gap: '0.4rem' }}>
                <span style={{ color: 'var(--text)' }}>{it.label}</span>
                <span style={{ opacity: 0.7 }}>· {it.sub}</span>
              </div>
            ))}
          </div>
        )}

        {/* THIS WEEK — a compact stat row, real counts only. */}
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.1rem', fontSize: '0.66rem', color: 'var(--muted)' }}>
          <span>♡ {plannedIdeas.length} plan{plannedIdeas.length === 1 ? '' : 's'}</span>
          <span>📍 {newPlacesThisWeek} new place{newPlacesThisWeek === 1 ? '' : 's'}</span>
          <span>🧺 {choresToday.length} chore{choresToday.length === 1 ? '' : 's'} today</span>
        </div>
      </button>

      {open && (
        <div style={{
          borderTop: '1px solid var(--border)', padding: '0.85rem 1rem 1rem',
          display: 'grid', gap: '0.8rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        }}>
          {/* Tonight — the single most-asked household question there is */}
          <Section title="Tonight" onOpen={() => goToHousehold('home')}>
            {tonight ? (
              <>
                <Line strong>
                  {tonight.kind === 'eating_out' ? '🍴 ' : ''}{tonight.title}
                </Line>
                {tonight.kind === 'eating_out' && <Line dim>not cooking tonight</Line>}
              </>
            ) : (
              <Line dim italic>No dinner planned yet.</Line>
            )}
            {choresToday.length > 0 && (
              <Line dim>{choresToday.length} chore{choresToday.length > 1 ? 's' : ''} due</Line>
            )}
          </Section>

          {/* This week's meals — the compact strip, not the full planner */}
          <Section title="This week’s meals" onOpen={() => goToHousehold('home')}>
            {h.meals.length === 0 && !h.loading && <Line dim italic>Nothing planned.</Line>}
            {week.map(day => {
              const dinner = h.meals.find(m => m.slot === 'dinner' && isSameDay(parseISO(m.meal_date), day))
              if (!dinner) return null
              return (
                <div key={+day} style={{ display: 'flex', gap: '0.4rem', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.7, width: '2.1rem', flexShrink: 0 }}>
                    {format(day, 'EEE')}
                  </span>
                  <span style={{
                    fontSize: '0.7rem', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    color: dinner.kind === 'eating_out' ? 'var(--amber)' : 'var(--text)',
                    fontStyle: dinner.kind === 'eating_out' ? 'italic' : 'normal',
                  }}>{dinner.title}</span>
                </div>
              )
            })}
          </Section>

          {/* Date ideas — glance + a door, the full editor stays in Household */}
          <Section title="Date ideas" onOpen={() => goToHousehold('reference')} count={ideas.filter(i => i.status !== 'done').length}>
            {shownIdeas.length === 0 && <Line dim italic>Nothing saved yet.</Line>}
            {shownIdeas.map(i => (
              <div key={i.id} style={{ display: 'flex', gap: '0.35rem', alignItems: 'baseline' }}>
                {i.status === 'planned' && <span aria-hidden style={{ fontSize: '0.55rem', color: 'var(--emerald)', flexShrink: 0 }}>●</span>}
                <span style={{ fontSize: '0.7rem', color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {i.title}
                </span>
              </div>
            ))}
          </Section>

          {/* Nearby — pins around the new place */}
          <Section title={`Near ${NEW_HOME.label}`} onOpen={() => goToSection('places')} count={nearbyCount}>
            {nearbyCount === 0
              ? <Line dim italic>No pins tagged nearby yet.</Line>
              : <Line dim>{nearbyCount} place{nearbyCount > 1 ? 's' : ''} saved around {NEW_HOME.city}</Line>}
          </Section>

          {/* Move-in — only while it's actually relevant. Retargeted to Home
              (2026-08-25) — Move-In is no longer its own tab; its overview
              card + Near Our New Home moved into a Home block. */}
          {h.moveinItems.length > 0 && (
            <Section title="Move-in" onOpen={() => goToHousehold('home')}>
              <Line strong>{moveinLeft} still to get</Line>
              <Line dim>{moveinDone} sorted</Line>
              {/* A thin progress bar reads faster than the two numbers alone. */}
              <div style={{ height: 4, borderRadius: 2, background: 'var(--surface2)', overflow: 'hidden', marginTop: '0.2rem' }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: 'var(--emerald)',
                  width: `${h.moveinItems.length ? (moveinDone / h.moveinItems.length) * 100 : 0}%`,
                }} />
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

// A lighter version of the old standalone Widget — same click-through-to-
// the-real-section idea, but as a section inside the dock's expanded panel
// rather than its own elevated/bordered card, since the panel itself now
// carries that framing.
function Section({ title, count, onOpen, children }: {
  title: string
  count?: number
  onOpen: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onOpen}
      className="press"
      style={{
        textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)',
        background: 'none', border: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.4rem', marginBottom: '0.15rem' }}>
        <span style={{ fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.8 }}>
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span style={{ fontSize: '0.6rem', color: 'var(--gold)', opacity: 0.9 }}>{count}</span>
        )}
      </div>
      {children}
    </button>
  )
}

function Line({ children, strong, dim, italic }: {
  children: React.ReactNode; strong?: boolean; dim?: boolean; italic?: boolean
}) {
  return (
    <div style={{
      fontSize: strong ? '0.82rem' : '0.68rem',
      color: dim ? 'var(--muted)' : 'var(--text)',
      opacity: dim ? 0.8 : 1,
      fontStyle: italic ? 'italic' : 'normal',
      lineHeight: 1.4,
      minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis',
    }}>{children}</div>
  )
}
