'use client'

import { useEffect, useRef, useState } from 'react'
import { format, isSameDay, isToday, setHours, setMinutes } from 'date-fns'
import { AGENDA_TYPE_META, type AgendaEntry } from '@/lib/hooks/useAgendaEntries'
import { useEvents } from '@/lib/hooks/useEvents'

const HOUR_HEIGHT = 44 // px per hour row
const START_HOUR = 0
const END_HOUR = 24

// Shared hour-by-hour grid behind both Week and Day view — Google
// Calendar's own core layout: an all-day band above a scrollable 24-hour
// column per day, click any empty hour to add something right there.
//
// Only 'event' entries ever carry a time (see useAgendaEntries' own
// comment) — tasks/renewals/refills/gifts, and any event created without a
// time, all render in the all-day band, exactly like Google Calendar treats
// an untimed item.
export default function CalendarTimeGrid({ days, entries }: { days: Date[]; entries: AgendaEntry[] }) {
  const { add: addEvent, remove: removeEvent } = useEvents()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [addSlot, setAddSlot] = useState<{ day: Date; hour: number } | null>(null)
  const [draft, setDraft] = useState('')

  // Open already scrolled to a sensible working-hours start rather than
  // midnight — matches Google Calendar's own default, and nobody wants to
  // scroll past six empty hours to see their 9am.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 7 * HOUR_HEIGHT })
  }, [])

  const entriesOn = (day: Date) => entries.filter(e => isSameDay(e.date, day)).sort((a, b) => +a.date - +b.date)
  const allDayOn = (day: Date) => entriesOn(day).filter(e => !e.time)
  const timedOn = (day: Date) => entriesOn(day).filter(e => e.time)

  async function submitAdd() {
    if (!addSlot || !draft.trim()) { setAddSlot(null); setDraft(''); return }
    const timeStr = `${String(addSlot.hour).padStart(2, '0')}:00`
    await addEvent(draft.trim(), format(addSlot.day, 'yyyy-MM-dd'), null, timeStr)
    setAddSlot(null)
    setDraft('')
  }

  const now = new Date()
  const nowMinutesFromStart = (now.getHours() - START_HOUR) * 60 + now.getMinutes()

  return (
    <div>
      {/* All-day band — one row per day, showing every untimed entry (tasks,
          renewals, refills, gifts, and any event created without a time). */}
      <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(${days.length}, 1fr)`, gap: '2px', marginBottom: '0.3rem' }}>
        <div />
        {days.map(day => (
          <div key={+day} style={{ minHeight: '20px', display: 'flex', flexDirection: 'column', gap: '2px', padding: '0.15rem' }}>
            {allDayOn(day).map(e => {
              const meta = AGENDA_TYPE_META[e.type]
              return (
                <div key={e.key} title={e.label} style={{
                  fontSize: '0.6rem', padding: '0.12em 0.4em', borderRadius: '4px', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis', color: meta.color,
                  background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                  display: 'flex', alignItems: 'center', gap: '0.3em',
                }}>
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.label}</span>
                  {e.type === 'event' && e.id && (
                    <button onClick={() => removeEvent(e.id!)} aria-label="Remove event"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6, fontSize: '0.62rem', padding: 0, lineHeight: 1 }}>✕</button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(${days.length}, 1fr)`, gap: '2px' }}>
        <div />
        {days.map(day => (
          <div key={+day} style={{ textAlign: 'center', padding: '0.15rem 0' }}>
            <div style={{ fontSize: '0.58rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75 }}>
              {format(day, days.length === 1 ? 'EEEE' : 'EEE')}
            </div>
            <div style={{
              fontSize: '0.82rem', fontWeight: isToday(day) ? 600 : 300,
              color: isToday(day) ? 'var(--gold)' : 'var(--text)',
            }}>{format(day, 'd')}</div>
          </div>
        ))}
      </div>

      {/* Scrollable hour grid */}
      <div ref={scrollRef} style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--faint)', borderRadius: '8px', marginTop: '0.3rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `48px repeat(${days.length}, 1fr)`, position: 'relative' }}>
          {/* Hour labels */}
          <div>
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map(h => (
              <div key={h} style={{
                height: HOUR_HEIGHT, fontSize: '0.58rem', color: 'var(--muted)', opacity: 0.7,
                textAlign: 'right', paddingRight: '0.4rem', boxSizing: 'border-box',
                borderTop: '1px solid var(--faint)', transform: 'translateY(-0.5em)',
              }}>
                {h === 0 ? '' : format(setMinutes(setHours(new Date(), h), 0), 'h a')}
              </div>
            ))}
          </div>

          {/* One column per day */}
          {days.map(day => {
            const dayIsToday = isToday(day)
            return (
              <div key={+day} style={{ position: 'relative', borderLeft: '1px solid var(--faint)' }}>
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map(h => {
                  const isAdding = addSlot && isSameDay(addSlot.day, day) && addSlot.hour === h
                  return (
                    <div
                      key={h}
                      onClick={() => { if (!isAdding) { setAddSlot({ day, hour: h }); setDraft('') } }}
                      style={{
                        height: HOUR_HEIGHT, borderTop: '1px solid var(--faint)', boxSizing: 'border-box',
                        cursor: 'pointer', padding: '1px 2px', position: 'relative',
                      }}
                      className="press"
                    >
                      {isAdding && (
                        <input
                          autoFocus
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          onClick={e => e.stopPropagation()}
                          onKeyDown={e => {
                            if (e.key === 'Enter') submitAdd()
                            if (e.key === 'Escape') { setAddSlot(null); setDraft('') }
                          }}
                          onBlur={submitAdd}
                          placeholder="Add something…"
                          style={{
                            width: '100%', fontSize: '0.68rem', background: 'var(--surface)',
                            border: '1px solid var(--gold)', borderRadius: '5px', padding: '0.2em 0.4em',
                            color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none',
                          }}
                        />
                      )}
                    </div>
                  )
                })}

                {/* Timed events, placed by their actual hour:minute */}
                {timedOn(day).map(e => {
                  const [hh, mm] = e.time!.split(':').map(Number)
                  const top = (hh - START_HOUR) * HOUR_HEIGHT + (mm / 60) * HOUR_HEIGHT
                  const meta = AGENDA_TYPE_META[e.type]
                  return (
                    <div key={e.key} title={`${e.label} — ${e.time}`} style={{
                      position: 'absolute', top, left: 2, right: 2, minHeight: '18px',
                      fontSize: '0.62rem', padding: '0.1em 0.4em', borderRadius: '4px',
                      color: meta.color, background: `color-mix(in srgb, ${meta.color} 16%, var(--surface))`,
                      border: `1px solid color-mix(in srgb, ${meta.color} 35%, transparent)`,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      pointerEvents: 'none', zIndex: 1,
                    }}>{e.label}</div>
                  )
                })}

                {/* Current-time indicator — today's column only. */}
                {dayIsToday && nowMinutesFromStart >= 0 && nowMinutesFromStart <= (END_HOUR - START_HOUR) * 60 && (
                  <div aria-hidden style={{
                    position: 'absolute', top: (nowMinutesFromStart / 60) * HOUR_HEIGHT,
                    left: 0, right: 0, height: 0, borderTop: '1.5px solid var(--rose)', zIndex: 2, pointerEvents: 'none',
                  }}>
                    <span style={{ position: 'absolute', left: -4, top: -3, width: 6, height: 6, borderRadius: '50%', background: 'var(--rose)' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
