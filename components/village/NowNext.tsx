'use client'

import { useMemo } from 'react'
import { addDays, differenceInMinutes, format, isSameDay, parseISO, startOfDay } from 'date-fns'
import { useAgendaEntries } from '@/lib/hooks/useAgendaEntries'
import { useHousehold, choreDue } from '@/lib/hooks/useHousehold'

// One or two lines: what's on right now, and what's next. Reads the agenda
// (events, dated tasks, renewals, refills, birthdays) plus tonight's dinner
// and chores that are due — nothing new stored. Renders nothing when the day
// is genuinely clear, so it never adds noise to a quiet house.

interface Slot { when: Date; timed: boolean; label: string; sub?: string }

export default function NowNext({ spaceId }: { spaceId: string | null }) {
  const agenda = useAgendaEntries(spaceId)
  const h = useHousehold(spaceId)

  const { now: nowSlot, next: nextSlot } = useMemo(() => {
    const now = new Date()
    const today = startOfDay(now)
    const horizon = addDays(today, 2)
    const slots: Slot[] = []

    for (const e of agenda) {
      if (e.date < today || e.date > horizon) continue
      const when = e.time
        ? parseISO(`${format(e.date, 'yyyy-MM-dd')}T${e.time}`)
        : e.date
      slots.push({ when, timed: !!e.time, label: e.label })
    }

    const dinner = h.meals.find(m => m.slot === 'dinner' && isSameDay(parseISO(m.meal_date), now))
    if (dinner) slots.push({ when: now, timed: false, label: dinner.title, sub: 'dinner' })

    for (const c of h.chores) {
      if (choreDue(c) <= 0) slots.push({ when: today, timed: false, label: c.name, sub: 'chore' })
    }

    slots.sort((a, b) => a.when.getTime() - b.when.getTime())

    // "Now" — a timed thing within the hour either way, or an untimed thing
    // that belongs to today (chores, dinner) when nothing timed is closer.
    const nowIdx = slots.findIndex(s =>
      (s.timed && Math.abs(differenceInMinutes(s.when, now)) <= 60) ||
      (!s.timed && isSameDay(s.when, now)),
    )
    const now_ = nowIdx >= 0 ? slots[nowIdx] : null
    const next_ = slots.find((s, i) => i !== nowIdx && s.when.getTime() > now.getTime()) ?? null

    return { now: now_, next: next_ }
  }, [agenda, h.meals, h.chores])

  if (!nowSlot && !nextSlot) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      {nowSlot && <Line kicker="Now" slot={nowSlot} strong />}
      {nextSlot && <Line kicker={nowSlot ? 'Then' : 'Next'} slot={nextSlot} />}
    </div>
  )
}

function Line({ kicker, slot, strong }: { kicker: string; slot: Slot; strong?: boolean }) {
  const time = slot.timed ? format(slot.when, 'h:mm a') : slot.sub
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', fontSize: strong ? '0.82rem' : '0.76rem' }}>
      <span style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--muted)', opacity: 0.7, flexShrink: 0, width: '2.6rem' }}>
        {kicker}
      </span>
      {time && <span style={{ color: 'var(--gold)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{time}</span>}
      <span style={{ color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {slot.label}
      </span>
    </div>
  )
}
