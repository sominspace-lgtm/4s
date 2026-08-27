'use client'

import { useState } from 'react'
import { addDays, subDays, format, isToday } from 'date-fns'
import { useAgendaEntries } from '@/lib/hooks/useAgendaEntries'
import CalendarTimeGrid from './CalendarTimeGrid'

// Day view (2026-08-27, "inspired off Google Calendar") — a single column
// over the same shared hour grid Week view uses.
export default function CalendarDay() {
  const entries = useAgendaEntries()
  const [day, setDay] = useState(() => new Date())

  const navBtn: React.CSSProperties = {
    background: 'none', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: '0.72rem', padding: '0.25rem 0.65rem', minHeight: '32px',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', margin: '0.4rem 0 0.7rem' }}>
        <button onClick={() => setDay(d => subDays(d, 1))} style={navBtn} aria-label="Previous day">←</button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text)' }}>{format(day, 'EEEE, MMMM d')}</span>
          {!isToday(day) && (
            <button onClick={() => setDay(new Date())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.62rem', fontFamily: 'var(--font-body)', padding: 0 }}>
              today
            </button>
          )}
        </div>
        <button onClick={() => setDay(d => addDays(d, 1))} style={navBtn} aria-label="Next day">→</button>
      </div>

      <CalendarTimeGrid days={[day]} entries={entries} />
    </div>
  )
}
