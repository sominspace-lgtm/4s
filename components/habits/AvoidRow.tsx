'use client'

import { useState } from 'react'
import { format, subDays, parseISO, differenceInCalendarDays } from 'date-fns'
import type { Habit } from '@/lib/hooks/useHabits'
import { withUndo } from '@/lib/ui/undo'

// Something you're keeping away from (2026-10-27): late-night snacks,
// smoking, whatever it is. Every day counts as clean unless you say you
// slipped, so there is nothing to tick on a good day. Shows the days since
// the last slip, your best run, and the last 30 days; tap a day to mark or
// unmark a slip on it.

const ymd = (d: Date) => format(d, 'yyyy-MM-dd')

/** Days clean now, and the longest clean run, from the start and the slips. */
export function avoidRuns(createdAt: string, slips: string[], today = new Date()): { now: number; best: number } {
  // A run is the clean days between two slips. The first run starts the day
  // you added it; the current one counts today, unless today was a slip.
  const start = parseISO(createdAt.slice(0, 10))
  const sorted = [...new Set(slips)].sort().map(s => parseISO(s))
  let best = 0
  let from = start
  for (const slip of sorted) {
    best = Math.max(best, differenceInCalendarDays(slip, from))
    from = new Date(slip.getTime() + 86_400_000)
  }
  const now = Math.max(0, differenceInCalendarDays(today, from) + 1)
  return { now, best: Math.max(best, now) }
}

export default function AvoidRow({ habit, slips, onToggleSlip, onDelete }: {
  habit: Habit
  slips: string[]
  onToggleSlip: (id: string, date: string) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}) {
  const [hidden, setHidden] = useState(false)
  const today = ymd(new Date())
  const slippedToday = slips.includes(today)
  const { now, best } = avoidRuns(habit.created_at, slips)
  const startDay = habit.created_at.slice(0, 10)
  const days = Array.from({ length: 30 }, (_, i) => ymd(subDays(new Date(), 29 - i)))

  if (hidden) return null

  return (
    <div style={{ padding: '0.7rem 0', borderBottom: '1px solid var(--faint)', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
        <span style={{ flex: 1, minWidth: 0, fontSize: '0.92rem', color: 'var(--text)' }}>{habit.name}</span>
        <button onClick={() => { setHidden(true); withUndo(`Removed ${habit.name}`, () => void onDelete(habit.id), () => setHidden(false)) }}
          aria-label={`Remove ${habit.name}`}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', minWidth: 32, minHeight: 32 }}>✕</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: slippedToday ? 'var(--muted)' : 'var(--emerald)', lineHeight: 1 }}>
          {now} {now === 1 ? 'day' : 'days'}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
          {slippedToday ? 'Slipped today. Tomorrow starts fresh.' : 'clean'}
          {best > now ? ` · best ${best}` : ''}
        </span>
      </div>

      {/* The last 30 days: green for clean, rose for a slip. Tap to fix a day. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(30, 1fr)', gap: 2 }}>
        {days.map(d => {
          const slip = slips.includes(d)
          const before = d < startDay
          return (
            <button key={d} disabled={before} onClick={() => void onToggleSlip(habit.id, d)}
              title={`${format(parseISO(d), 'EEE MMM d')}: ${before ? 'before you started' : slip ? 'slipped' : 'clean'}`}
              aria-label={`${format(parseISO(d), 'MMM d')}, ${slip ? 'slipped' : 'clean'}`}
              style={{
                height: 14, padding: 0, border: 'none', borderRadius: 3, cursor: before ? 'default' : 'pointer',
                background: before ? 'var(--faint)' : slip ? 'var(--rose)' : 'color-mix(in srgb, var(--emerald) 45%, transparent)',
                opacity: before ? 0.4 : 1, outline: d === today ? '1.5px solid var(--text)' : 'none', outlineOffset: 1,
              }} />
          )
        })}
      </div>

      <button onClick={() => void onToggleSlip(habit.id, today)} className="press"
        style={{
          alignSelf: 'flex-start', minHeight: 36, padding: '0 0.9rem', borderRadius: 10, cursor: 'pointer',
          border: '1px solid var(--border)', background: 'transparent', fontFamily: 'var(--font-body)',
          fontSize: '0.8rem', color: slippedToday ? 'var(--text)' : 'var(--muted)',
        }}>
        {slippedToday ? 'Undo, I didn’t slip' : 'I slipped today'}
      </button>
    </div>
  )
}
