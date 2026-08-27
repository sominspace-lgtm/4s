'use client'

import { useState } from 'react'
import { addWeeks, subWeeks, startOfWeek, addDays, format, isSameWeek } from 'date-fns'
import { useAgendaEntries } from '@/lib/hooks/useAgendaEntries'
import CalendarTimeGrid from './CalendarTimeGrid'

// Week view (2026-08-27, "inspired off Google Calendar") — seven day
// columns over CalendarTimeGrid's shared hour grid, same nav-header idiom
// CalendarMonth already uses (‹ label today ›).
export default function CalendarWeek({ userId, spaceId = null }: { userId: string; spaceId?: string | null }) {
  const entries = useAgendaEntries(spaceId)
  const [anchor, setAnchor] = useState(() => new Date())

  const weekStart = startOfWeek(anchor)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const weekEnd = days[6]
  const sameMonth = format(weekStart, 'MMM') === format(weekEnd, 'MMM')
  const label = sameMonth
    ? `${format(weekStart, 'MMMM d')} – ${format(weekEnd, 'd, yyyy')}`
    : `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`

  const navBtn: React.CSSProperties = {
    background: 'none', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)',
    fontSize: '0.72rem', padding: '0.25rem 0.65rem', minHeight: '32px',
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', margin: '0.4rem 0 0.7rem' }}>
        <button onClick={() => setAnchor(a => subWeeks(a, 1))} style={navBtn} aria-label="Previous week">←</button>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--text)' }}>{label}</span>
          {!isSameWeek(anchor, new Date()) && (
            <button onClick={() => setAnchor(new Date())} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.62rem', fontFamily: 'var(--font-body)', padding: 0 }}>
              today
            </button>
          )}
        </div>
        <button onClick={() => setAnchor(a => addWeeks(a, 1))} style={navBtn} aria-label="Next week">→</button>
      </div>

      <CalendarTimeGrid days={days} entries={entries} userId={userId} />
    </div>
  )
}
