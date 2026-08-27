'use client'

import { useState } from 'react'
import CalendarSummary from './CalendarSummary'
import CalendarMonth from './CalendarMonth'
import CalendarWeek from './CalendarWeek'
import CalendarDay from './CalendarDay'
import CalendarQuickAdd from './CalendarQuickAdd'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

// 4S's own calendar. The Google Calendar iframe that used to sit below this
// is gone (2026-08-07): an embed we couldn't read, search, theme, or connect
// to anything else in the app was a foreign object in the middle of the
// product — it couldn't feed the Brief, the Council, or the village, and it
// looked like someone else's software inside ours.
//
// Everything here is 4S data: dated tasks, renewals, refill run-outs, gift
// dates, and standalone events you create right in the month view. External
// calendars come back later as an ICS *import* (one implementation covers
// Google, Apple and Outlook) — as a layer on top of this, never the
// foundation underneath it.
export default function CalendarEmbed({ userId }: { userId: string }) {
  // Month by default (2026-08-25, reverses the 2026-08-21 change) — every
  // calendar in the app should open on the same view, and the user asked
  // for that view to be the month grid. Week/day added 2026-08-27,
  // "inspired off Google Calendar" — an hourly grid with an all-day band,
  // see CalendarTimeGrid.
  const [view, setView] = useState<'agenda' | 'month' | 'week' | 'day'>('month')
  // Private by default; events shared into (or made directly in) the
  // household space also show here (2026-08-27) — see useAgendaEntries'
  // own header comment. spaces[0] matches every other "the household
  // space" lookup already in the app (Village.tsx, etc.) — a single
  // primary space, not a picker.
  const { spaces } = useSharedSpaces(userId)
  const spaceId = spaces[0]?.id ?? null

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    fontSize: '0.66rem', padding: '0.3em 0.75em', borderRadius: '7px', cursor: 'pointer',
    border: 'none', fontFamily: 'var(--font-body)', letterSpacing: '0.04em',
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--muted)',
  })

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '14px', padding: '1.1rem 1.3rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', fontWeight: 400, color: 'var(--text)' }}>
            {view === 'agenda' ? 'Today & Upcoming' : view === 'month' ? 'This Month' : view === 'week' ? 'This Week' : 'Today'}
          </span>
          <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.8, letterSpacing: '0.04em' }}>
            tasks, renewals, refills, gifts &amp; events
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--hover-bg)', borderRadius: '8px', padding: '0.2rem' }}>
            <button className="press" onClick={() => setView('agenda')} style={toggleBtn(view === 'agenda')}>Agenda</button>
            <button className="press" onClick={() => setView('month')} style={toggleBtn(view === 'month')}>Month</button>
            <button className="press" onClick={() => setView('week')} style={toggleBtn(view === 'week')}>Week</button>
            <button className="press" onClick={() => setView('day')} style={toggleBtn(view === 'day')}>Day</button>
          </div>
          {/* One-click add from anywhere in the calendar (2026-08-27) —
              every view already lets you add something, but each requires
              navigating to the right day/hour first. See its own header
              comment. */}
          <CalendarQuickAdd />
        </div>
      </div>

      {view === 'agenda' && <CalendarSummary spaceId={spaceId} />}
      {view === 'month' && <CalendarMonth userId={userId} spaceId={spaceId} />}
      {view === 'week' && <CalendarWeek userId={userId} spaceId={spaceId} />}
      {view === 'day' && <CalendarDay userId={userId} spaceId={spaceId} />}
    </div>
  )
}
