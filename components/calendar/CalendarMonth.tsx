'use client'

import { useState } from 'react'
import {
  addMonths, subMonths, format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, isToday, setHours, setMinutes,
} from 'date-fns'
import { useAgendaEntries, AGENDA_TYPE_META, type AgendaEntry } from '@/lib/hooks/useAgendaEntries'
import { useEvents } from '@/lib/hooks/useEvents'
import ShareMenu from '@/components/ui/ShareMenu'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MAX_DOTS = 4

// 'HH:MM' (24h, straight from the DB) → '9:00 AM' for display.
function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  return format(setMinutes(setHours(new Date(), h), m), 'h:mm a')
}

// Month grid over the same native entries as the agenda — tasks, renewals,
// refills, gifts. Click a day to see its items below the grid.
export default function CalendarMonth({ userId, spaceId = null }: { userId: string; spaceId?: string | null }) {
  const entries = useAgendaEntries(spaceId)
  const { add: addEvent, remove: removeEvent } = useEvents()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState<Date | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('')

  const gridStart = startOfWeek(startOfMonth(month))
  const gridEnd = endOfWeek(endOfMonth(month))

  const days: Date[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d)

  const entriesOn = (day: Date): AgendaEntry[] =>
    entries.filter(e => isSameDay(e.date, day)).sort((a, b) => +a.date - +b.date)

  const selectedEntries = selected ? entriesOn(selected) : []
  const monthHasEntries = days.some(d => isSameMonth(d, month) && entriesOn(d).length > 0)

  const navBtn: React.CSSProperties = {
    background: 'none', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: '0.72rem', padding: '0.25rem 0.65rem', minHeight: '32px',
  }

  return (
    <div>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', margin: '0.4rem 0 0.7rem' }}>
        <button onClick={() => { setMonth(m => subMonths(m, 1)); setSelected(null) }} style={navBtn} aria-label="Previous month">←</button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text)' }}>{format(month, 'MMMM yyyy')}</span>
          {!isSameMonth(month, new Date()) && (
            <button onClick={() => { setMonth(startOfMonth(new Date())); setSelected(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.62rem', fontFamily: 'var(--font-body)', padding: 0 }}>
              today
            </button>
          )}
        </div>
        <button onClick={() => { setMonth(m => addMonths(m, 1)); setSelected(null) }} style={navBtn} aria-label="Next month">→</button>
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '3px' }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.58rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75, padding: '0.2rem 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {days.map(day => {
          const inMonth = isSameMonth(day, month)
          const dayEntries = entriesOn(day)
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
                  {dayEntries.slice(0, MAX_DOTS).map(e => (
                    <span key={e.key} title={e.label} style={{
                      width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                      background: AGENDA_TYPE_META[e.type].color,
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

      {/* Selected day detail */}
      {selected && (
        <div style={{ marginTop: '0.7rem', paddingTop: '0.6rem', borderTop: '1px solid var(--faint)' }}>
          <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.8, marginBottom: '0.25rem' }}>
            {format(selected, 'EEEE, MMMM d')}
          </div>
          {selectedEntries.length === 0 && (
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic' }}>Nothing on this day.</div>
          )}
          {selectedEntries.map(e => {
            const meta = AGENDA_TYPE_META[e.type]
            return (
              <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.3rem 0', borderBottom: '1px solid var(--faint)' }}>
                <span style={{
                  fontSize: '0.6rem', letterSpacing: '0.05em', textTransform: 'uppercase', flexShrink: 0,
                  color: meta.color, background: `color-mix(in srgb, ${meta.color} 10%, transparent)`,
                  padding: '0.12em 0.5em', borderRadius: '4px', minWidth: '52px', textAlign: 'center',
                }}>{meta.label}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: '0.76rem', color: 'var(--text)', fontWeight: 300 }}>
                  {e.time && <span style={{ color: 'var(--muted)', marginRight: '0.5em' }}>{formatTime(e.time)}</span>}
                  {e.label}
                </span>
                {/* Only standalone events are directly deletable here — a
                    task/renewal/refill/gift row is derived from its own hub
                    and should be edited there, not silently forked here. */}
                {/* Share to household (2026-08-27) — private by default;
                    this is the "has to share" half of making an event
                    visible outside your own calendar. See ShareMenu / the
                    events_sharing.sql migration. */}
                {e.type === 'event' && e.id && (
                  <ShareMenu itemType="event" itemId={e.id} userId={userId} />
                )}
                {e.type === 'event' && e.id && (
                  <button
                    onClick={() => removeEvent(e.id!)}
                    aria-label="Remove event"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.5, fontSize: '0.62rem', padding: '0 0.2rem', flexShrink: 0 }}
                  >✕</button>
                )}
              </div>
            )
          })}

          {/* Add a standalone event to this day — the one thing the native
              calendar couldn't do before: anything that isn't already a
              task/renewal/refill/gift (an appointment, a birthday party).
              Optional time (2026-08-27) — matches week/day view's own
              hour-grid add; leaving it blank still makes an all-day event,
              same as before this field existed. */}
          <form
            onSubmit={async e => {
              e.preventDefault()
              if (!newTitle.trim() || !selected) return
              await addEvent(newTitle.trim(), format(selected, 'yyyy-MM-dd'), null, newTime || null)
              setNewTitle('')
              setNewTime('')
            }}
            style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}
          >
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="+ Add an event to this day"
              style={{
                flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--faint)',
                outline: 'none', fontSize: '0.74rem', color: 'var(--text)', fontFamily: 'var(--font-body)',
                padding: '0.3rem 0.1rem',
              }}
            />
            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              aria-label="Time (optional)"
              style={{
                background: 'transparent', border: 'none', borderBottom: '1px solid var(--faint)',
                outline: 'none', fontSize: '0.74rem', color: 'var(--muted)', fontFamily: 'var(--font-body)',
                padding: '0.3rem 0.1rem', width: '5.5em',
              }}
            />
          </form>
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
