'use client'

import { parseISO, isWithinInterval, startOfDay, isSameDay, format } from 'date-fns'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useSubscriptions } from '@/lib/hooks/useSubscriptions'
import { useGiftOccasions } from '@/lib/hooks/usePeople'
import { addDays } from 'date-fns'
import { useBuyItems, runoutDate, computeStatus } from '@/lib/hooks/useBuyItems'
import { useEvents, useSharedEvents } from '@/lib/hooks/useEvents'
import { useHabits, isDueOn } from '@/lib/hooks/useHabits'

export interface AgendaEntry {
  key: string
  date: Date
  label: string
  type: 'task' | 'renewal' | 'refill' | 'gift' | 'event' | 'habit'
  id?: string   // raw row id — only 'event' entries are directly editable/deletable from the calendar
  /** 'HH:MM', only ever set on 'event' entries (see useEvents' own comment
   *  on why nothing else in the app has a time). Week/day views use this to
   *  place an entry on the hour grid; undefined means "all-day," same as
   *  every task/renewal/refill/gift already renders. */
  time?: string
  /** Multi-day events only (2026-09-17, see events_end_date.sql) — the last
   *  day this entry occurs on, inclusive. Undefined means single-day, same
   *  as every non-event entry. Use entryOccursOn, not a raw date compare,
   *  so a day in the middle of the span still matches. */
  endDate?: Date
}

export const AGENDA_TYPE_META: Record<AgendaEntry['type'], { label: string; color: string }> = {
  task:    { label: 'task',    color: 'var(--gold)' },
  renewal: { label: 'renewal', color: 'var(--emerald)' },
  refill:  { label: 'refill',  color: 'var(--amber)' },
  gift:    { label: 'gift',    color: 'var(--blush)' },
  event:   { label: 'event',   color: 'var(--purple)' },
  habit:   { label: 'habit',   color: 'var(--slate)' },
}

// Does this entry occur on `day`? A plain date match for everything except
// a multi-day event, which occurs on every day from date through endDate.
export function entryOccursOn(entry: AgendaEntry, day: Date): boolean {
  if (!entry.endDate) return isSameDay(entry.date, day)
  return isWithinInterval(startOfDay(day), { start: startOfDay(entry.date), end: startOfDay(entry.endDate) })
}

// Habits are the only recurring type here — everything else already has a
// concrete row-per-occurrence. Bounded window, same idea as useHabits'
// nextDueDate (21 days): wide enough to cover a month view plus its
// adjacent days without generating occurrences forever.
const HABIT_WINDOW_BACK = 31
const HABIT_WINDOW_FWD = 62

// Everything the app knows that has a date — dated tasks, renewals, refill
// run-outs, gift dates, and standalone calendar events. Consumers
// window/bucket as needed (agenda list, month grid). No external calendar
// here; Google stays in its embed.
//
// spaceId — pass the household space's id to also pull in every event on
// that space (both partners'); since 2026-09-01 an event just carries a
// space_id, so "the household calendar" is simply everything in the space,
// no per-item sharing step. Omit it (or pass null) for a context with no
// household space at all.
export function useAgendaEntries(spaceId: string | null = null): AgendaEntry[] {
  const { items: workItems } = useWorkItems()
  const { subs } = useSubscriptions()
  const giftItems = useGiftOccasions()
  const { items: buyItems } = useBuyItems()
  const { items: ownEvents } = useEvents()
  const { items: sharedEvents } = useSharedEvents(spaceId)
  const { habits, completions } = useHabits()
  // De-duped by id — the space's own owner sees their event via both
  // useEvents (they own it) and useSharedEvents (RLS also grants it to
  // accepted members, which the owner usually also is), so without this a
  // self-created household event would double up in the owner's own view.
  const events = [...ownEvents, ...sharedEvents.filter(s => !ownEvents.some(o => o.id === s.id))]

  const entries: AgendaEntry[] = []

  for (const t of workItems) {
    if (t.status === 'done' || !t.due_date) continue
    entries.push({ key: `task-${t.id}`, date: parseISO(t.due_date), label: t.title, type: 'task' })
  }
  for (const s of subs) {
    if (!s.renewal_date) continue
    entries.push({ key: `sub-${s.id}`, date: parseISO(s.renewal_date), label: `${s.name} renews`, type: 'renewal' })
  }
  for (const b of buyItems) {
    const status = computeStatus(b)
    if (status === 'paused' || status === 'snoozed' || status === 'backup-stock') continue
    const due = runoutDate(b)
    if (!due) continue
    entries.push({ key: `buy-${b.id}`, date: due, label: `${b.name} runs out`, type: 'refill' })
  }
  for (const g of giftItems) {
    // days-until is already computed from the contact's birthday, so the
    // calendar date is simply that many days out from today.
    entries.push({ key: `gift-${g.id}`, date: addDays(new Date(), g.days), label: `${g.name}'s birthday`, type: 'gift' })
  }
  for (const e of events) {
    entries.push({
      key: `event-${e.id}`, id: e.id, date: parseISO(e.event_date), label: e.title, type: 'event',
      time: e.event_time ?? undefined,
      endDate: e.end_date ? parseISO(e.end_date) : undefined,
    })
  }
  for (const h of habits) {
    if (h.paused) continue
    const done = completions[h.id] ?? []
    for (let i = -HABIT_WINDOW_BACK; i <= HABIT_WINDOW_FWD; i++) {
      const day = addDays(new Date(), i)
      const dateStr = format(day, 'yyyy-MM-dd')
      if (isDueOn(h, dateStr, done)) entries.push({ key: `habit-${h.id}-${dateStr}`, date: day, label: h.name, type: 'habit' })
    }
  }

  return entries
}
