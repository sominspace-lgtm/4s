'use client'

import { useMemo, useState } from 'react'
import {
  addDays, addMonths, subMonths, endOfMonth, endOfWeek, format, isSameDay,
  isSameMonth, isToday, startOfMonth, startOfWeek,
} from 'date-fns'
import { useAgendaEntries } from '@/lib/hooks/useAgendaEntries'
import { goToHousehold } from '@/lib/utils/navigate'
import Icon from '@/components/ui/Icon'

// A read-only compact month for the Village home panel — a dot on every day
// that has something dated (events, tasks, renewals, refills, birthdays, from
// useAgendaEntries, the same source NowNext uses). Tapping a day opens the
// full Household calendar unless the panel is locked.

export default function MiniCalendarCard({ spaceId, locked = false, onLockedNavigate }: {
  spaceId: string | null
  locked?: boolean
  onLockedNavigate?: (label: string) => void
}) {
  const agenda = useAgendaEntries(spaceId)
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  const marked = useMemo(() => {
    const s = new Set<string>()
    for (const e of agenda) s.add(format(e.date, 'yyyy-MM-dd'))
    return s
  }, [agenda])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month))
    const end = endOfWeek(endOfMonth(month))
    const out: Date[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) out.push(d)
    return out
  }, [month])

  const open = () => { if (locked) onLockedNavigate?.('Calendar'); else goToHousehold('calendar') }

  return (
    <div className="organic" style={{
      background: 'color-mix(in srgb, var(--blush) 9%, var(--surface2))',
      border: '1px solid color-mix(in srgb, var(--blush) 22%, var(--border))',
      borderRadius: 14, padding: '0.65rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span aria-hidden style={{ display: 'inline-flex', color: 'var(--blush)' }}><Icon name="calendar" size={16} /></span>
        <button onClick={() => setMonth(m => subMonths(m, 1))} aria-label="Previous month" style={navBtn}>‹</button>
        <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text)', flex: 1, textAlign: 'center' }}>
          {format(month, 'MMMM yyyy')}
        </span>
        <button onClick={() => setMonth(m => addMonths(m, 1))} aria-label="Next month" style={navBtn}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.55rem', color: 'var(--muted)', opacity: 0.7 }}>{d}</div>
        ))}
        {days.map(day => {
          const inMonth = isSameMonth(day, month)
          const today = isToday(day)
          const has = marked.has(format(day, 'yyyy-MM-dd'))
          return (
            <button
              key={+day}
              onClick={open}
              style={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 1, border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit',
                background: today ? 'color-mix(in srgb, var(--gold) 16%, transparent)' : 'none',
                color: inMonth ? 'var(--text)' : 'var(--muted)', opacity: inMonth ? 1 : 0.35,
                fontSize: '0.6rem',
              }}
            >
              {format(day, 'd')}
              <span style={{
                width: 3, height: 3, borderRadius: '50%',
                background: has ? 'var(--blush)' : 'transparent',
              }} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

const navBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
  fontSize: '0.9rem', lineHeight: 1, padding: '0 0.3rem', fontFamily: 'inherit',
}
