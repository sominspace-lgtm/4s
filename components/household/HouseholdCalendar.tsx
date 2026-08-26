'use client'

import { useState } from 'react'
import {
  addDays, addMonths, subMonths, format, isSameDay, isWithinInterval, parseISO,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isToday,
} from 'date-fns'
import { choreDue, type Chore, type Meal } from '@/lib/hooks/useHousehold'
import { routineDue, type Routine } from '@/lib/hooks/useRoutines'
import type { Trip } from '@/lib/hooks/useTrips'
import { useSharedWorkItems, dueUrgency } from '@/lib/hooks/useWorkItems'

// One calendar for everything the household has going on: chores, meals,
// routines/maintenance, trips, and — as of 2026-08-22 — any personal task a
// partner has shared into this space via the ⇆ ShareMenu on a task row
// (useSharedWorkItems, backed by shared_item_links — see its own header
// comment). That's the "put household events/chores/reminders/tasks and
// personal stuff (if shared)" ask in one place, rather than a second
// calendar to check.
//
// Separate from the personal calendar in Today on purpose. That one answers
// "what do I have on"; this answers "what does this house have on" — an
// unshared personal task never appears here, same as it never appeared here
// before this change.
//
// Agenda and Month, same toggle pattern as Today's CalendarEmbed — a
// fortnight is denser and better for "what's coming up this week", a month
// grid is better for "what does next week look like at a glance".

type Entry = { kind: 'chore' | 'meal' | 'routine' | 'trip' | 'task'; label: string; sub?: string; overdue?: boolean }

const KIND_COLOR: Record<Entry['kind'], string> = {
  chore: 'var(--amber)',
  meal:  'var(--emerald)',
  // Routines and Maintenance share a color — both come from the same
  // household_routines table, split only by `kind`, and the calendar's job
  // is "what's coming up", not re-litigating that distinction visually.
  routine: 'var(--slate)',
  trip:  'var(--purple)',
  task:  'var(--gold)',
}

const AGENDA_DAYS = 14

export default function HouseholdCalendar({ chores, meals, routines = [], trips = [], spaceId = null }: {
  chores: Chore[]
  meals: Meal[]
  /** Routines AND maintenance — both live in household_routines, this
   *  calendar didn't know about either until now. */
  routines?: Routine[]
  /** Only trips with both a start and end date show — a trip still being
   *  dreamed about with no dates yet has nothing to put on a calendar. */
  trips?: Trip[]
  /** Current household space, for shared personal tasks. Nothing renders
   *  from that source when there's no space (solo account). */
  spaceId?: string | null
}) {
  // Month by default (2026-08-25) — same as CalendarEmbed, so every
  // calendar in the app opens on the same view.
  const [view, setView] = useState<'agenda' | 'month'>('month')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<Date | null>(null)
  const { items: sharedTasks } = useSharedWorkItems(spaceId)

  const today = new Date()

  function entriesFor(day: Date): Entry[] {
    const out: Entry[] = []

    // A chore lands on the day it next comes due. Overdue ones surface on
    // today rather than in the past, where nobody would look for them.
    for (const c of chores) {
      const due = choreDue(c)
      const dueDate = addDays(today, due)
      const showOn = due < 0 ? today : dueDate
      if (isSameDay(showOn, day)) {
        out.push({ kind: 'chore', label: c.name, sub: due < 0 ? `${-due}d overdue` : undefined, overdue: due < 0 })
      }
    }

    for (const m of meals) {
      if (isSameDay(parseISO(m.meal_date), day)) {
        out.push({ kind: 'meal', label: m.title, sub: m.slot })
      }
    }

    // Same due-date logic as chores — routineDue() is the one function that
    // already knows how, no reason for the calendar to recompute it.
    for (const r of routines) {
      const due = routineDue(r)
      const dueDate = addDays(today, due)
      const showOn = due < 0 ? today : dueDate
      if (isSameDay(showOn, day)) {
        out.push({
          kind: 'routine', label: r.name,
          sub: due < 0 ? `${-due}d overdue` : r.kind === 'maintenance' ? 'maintenance' : undefined,
          overdue: due < 0,
        })
      }
    }

    for (const t of trips) {
      if (!t.start_date || !t.end_date) continue
      if (isWithinInterval(day, { start: parseISO(t.start_date), end: parseISO(t.end_date) })) {
        out.push({ kind: 'trip', label: t.title, sub: t.destination ?? undefined })
      }
    }

    for (const w of sharedTasks) {
      if (!w.due_date) continue
      if (isSameDay(parseISO(w.due_date), day)) {
        const overdue = dueUrgency(w.due_date) === 'overdue'
        out.push({ kind: 'task', label: w.title, sub: overdue ? 'overdue' : undefined, overdue })
      }
    }

    return out
  }

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    fontSize: '0.66rem', padding: '0.3em 0.75em', borderRadius: '7px', cursor: 'pointer',
    border: 'none', fontFamily: 'var(--font-body)', letterSpacing: '0.04em',
    background: active ? 'var(--surface2)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--muted)',
  })

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
        <div className="t-card">{view === 'agenda' ? 'The next two weeks' : format(month, 'MMMM yyyy')}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          <div className="t-meta" style={{ display: 'flex', gap: '0.7rem' }}>
            {(['chore', 'meal', 'routine', 'trip', 'task'] as const).map(k => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                <span aria-hidden style={{ width: 7, height: 7, borderRadius: '50%', background: KIND_COLOR[k], display: 'inline-block' }} />
                {k}s
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--hover-bg)', borderRadius: '8px', padding: '0.2rem' }}>
            <button className="press" onClick={() => setView('agenda')} style={toggleBtn(view === 'agenda')}>Agenda</button>
            <button className="press" onClick={() => setView('month')} style={toggleBtn(view === 'month')}>Month</button>
          </div>
        </div>
      </div>

      {view === 'agenda' ? (
        <AgendaView today={today} entriesFor={entriesFor} />
      ) : (
        <MonthView
          month={month} setMonth={setMonth} selected={selected} setSelected={setSelected}
          entriesFor={entriesFor}
        />
      )}
    </section>
  )
}

function AgendaView({ today, entriesFor }: { today: Date; entriesFor: (day: Date) => Entry[] }) {
  const days = [...Array(AGENDA_DAYS)].map((_, i) => addDays(today, i))
  const anything = days.some(d => entriesFor(d).length > 0)

  return (
    <>
      {!anything && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Nothing scheduled. Add a chore or plan a meal and it lands here.
        </div>
      )}

      {anything && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
          {days.map(day => {
            const entries = entriesFor(day)
            const dayIsToday = isSameDay(day, today)
            // Empty days still render, so the fortnight reads as a continuous
            // stretch of time rather than a list of things that happen to
            // have something on them.
            return (
              <div key={+day} className="organic" style={{
                border: `1px solid ${dayIsToday ? 'color-mix(in srgb, var(--gold) 45%, var(--border))' : 'var(--border)'}`,
                background: dayIsToday ? 'color-mix(in srgb, var(--gold) 6%, var(--surface2))' : 'var(--surface2)',
                padding: '0.5rem 0.6rem', minHeight: '76px',
                display: 'flex', flexDirection: 'column', gap: '0.3rem',
                opacity: entries.length === 0 ? 0.55 : 1,
              }}>
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: dayIsToday ? 'var(--gold)' : 'var(--muted)', opacity: dayIsToday ? 1 : 0.7 }}>
                  {dayIsToday ? 'Today' : format(day, 'EEE d')}
                </div>

                {entries.length === 0 && (
                  <div style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.3, fontStyle: 'italic' }}>—</div>
                )}

                {entries.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
                    <span aria-hidden style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0, marginTop: '0.34rem',
                      background: e.overdue ? 'var(--rose)' : KIND_COLOR[e.kind],
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text)', lineHeight: 1.35, wordBreak: 'break-word' }}>{e.label}</div>
                      {e.sub && (
                        <div style={{ fontSize: '0.58rem', color: e.overdue ? 'var(--rose)' : 'var(--muted)', opacity: e.overdue ? 1 : 0.7 }}>{e.sub}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

const MAX_DOTS = 4

function MonthView({ month, setMonth, selected, setSelected, entriesFor }: {
  month: Date
  setMonth: React.Dispatch<React.SetStateAction<Date>>
  selected: Date | null
  setSelected: React.Dispatch<React.SetStateAction<Date | null>>
  entriesFor: (day: Date) => Entry[]
}) {
  const gridStart = startOfWeek(startOfMonth(month))
  const gridEnd = endOfWeek(endOfMonth(month))
  const days: Date[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d)

  const selectedEntries = selected ? entriesFor(selected) : []
  const monthHasEntries = days.some(d => isSameMonth(d, month) && entriesFor(d).length > 0)

  const navBtn: React.CSSProperties = {
    background: 'none', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: '0.72rem', padding: '0.25rem 0.65rem', minHeight: '32px',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <button onClick={() => { setMonth(m => subMonths(m, 1)); setSelected(null) }} style={navBtn} aria-label="Previous month">←</button>
        {!isSameMonth(month, new Date()) && (
          <button onClick={() => { setMonth(startOfMonth(new Date())); setSelected(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.62rem', fontFamily: 'var(--font-body)', padding: 0 }}>
            today
          </button>
        )}
        <button onClick={() => { setMonth(m => addMonths(m, 1)); setSelected(null) }} style={navBtn} aria-label="Next month">→</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '3px' }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75, padding: '0.2rem 0' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {days.map(day => {
          const inMonth = isSameMonth(day, month)
          const dayEntries = entriesFor(day)
          const isSel = selected != null && isSameDay(day, selected)
          const today = isToday(day)
          return (
            <button
              key={+day}
              onClick={() => setSelected(s => s && isSameDay(day, s) ? null : day)}
              style={{
                minHeight: '52px', padding: '0.25rem 0.2rem 0.3rem', borderRadius: '8px', cursor: 'pointer',
                border: `1px solid ${isSel ? 'var(--gold)' : today ? 'color-mix(in srgb, var(--gold) 45%, var(--border))' : 'var(--border)'}`,
                background: isSel ? 'color-mix(in srgb, var(--gold) 8%, transparent)' : today ? 'color-mix(in srgb, var(--gold) 4%, var(--surface))' : 'var(--surface)',
                opacity: inMonth ? 1 : 0.35,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                fontFamily: 'var(--font-body)', transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <span style={{ fontSize: '0.66rem', color: today ? 'var(--gold)' : 'var(--text)', fontWeight: today ? 600 : 300, lineHeight: 1 }}>
                {format(day, 'd')}
              </span>
              {dayEntries.length > 0 && (
                <span style={{ display: 'flex', gap: '2.5px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%' }}>
                  {dayEntries.slice(0, MAX_DOTS).map((e, i) => (
                    <span key={i} title={e.label} style={{
                      width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                      background: e.overdue ? 'var(--rose)' : KIND_COLOR[e.kind],
                    }} />
                  ))}
                  {dayEntries.length > MAX_DOTS && (
                    <span style={{ fontSize: '0.5rem', color: 'var(--muted)', lineHeight: '5px' }}>+{dayEntries.length - MAX_DOTS}</span>
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {selected && (
        <div style={{ marginTop: '0.7rem', paddingTop: '0.6rem', borderTop: '1px solid var(--faint)' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.8, marginBottom: '0.25rem' }}>
            {format(selected, 'EEEE, MMMM d')}
          </div>
          {selectedEntries.length === 0 && (
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic' }}>Nothing on this day.</div>
          )}
          {selectedEntries.map((e, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.3rem 0', borderBottom: '1px solid var(--faint)' }}>
              <span style={{
                fontSize: '0.6rem', letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0,
                color: e.overdue ? 'var(--rose)' : KIND_COLOR[e.kind],
                background: `color-mix(in srgb, ${e.overdue ? 'var(--rose)' : KIND_COLOR[e.kind]} 10%, transparent)`,
                padding: '0.12em 0.5em', borderRadius: '4px', minWidth: '52px', textAlign: 'center',
              }}>{e.kind}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: '0.76rem', color: 'var(--text)', fontWeight: 300 }}>{e.label}</span>
              {e.sub && <span style={{ fontSize: '0.62rem', color: e.overdue ? 'var(--rose)' : 'var(--muted)' }}>{e.sub}</span>}
            </div>
          ))}
        </div>
      )}

      {!monthHasEntries && !selected && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic', textAlign: 'center' }}>
          Nothing scheduled this month.
        </div>
      )}
    </div>
  )
}
