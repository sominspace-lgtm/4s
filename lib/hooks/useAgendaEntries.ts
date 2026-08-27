'use client'

import { parseISO } from 'date-fns'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useSubscriptions } from '@/lib/hooks/useSubscriptions'
import { useGiftOccasions } from '@/lib/hooks/usePeople'
import { addDays } from 'date-fns'
import { useBuyItems, runoutDate, computeStatus } from '@/lib/hooks/useBuyItems'
import { useEvents, useSharedEvents } from '@/lib/hooks/useEvents'

export interface AgendaEntry {
  key: string
  date: Date
  label: string
  type: 'task' | 'renewal' | 'refill' | 'gift' | 'event'
  id?: string   // raw row id — only 'event' entries are directly editable/deletable from the calendar
  /** 'HH:MM', only ever set on 'event' entries (see useEvents' own comment
   *  on why nothing else in the app has a time). Week/day views use this to
   *  place an entry on the hour grid; undefined means "all-day," same as
   *  every task/renewal/refill/gift already renders. */
  time?: string
}

export const AGENDA_TYPE_META: Record<AgendaEntry['type'], { label: string; color: string }> = {
  task:    { label: 'task',    color: 'var(--gold)' },
  renewal: { label: 'renewal', color: 'var(--emerald)' },
  refill:  { label: 'refill',  color: 'var(--amber)' },
  gift:    { label: 'gift',    color: 'var(--blush)' },
  event:   { label: 'event',   color: 'var(--purple)' },
}

// Everything the app knows that has a date — dated tasks, renewals, refill
// run-outs, gift dates, and standalone calendar events. Consumers
// window/bucket as needed (agenda list, month grid). No external calendar
// here; Google stays in its embed.
//
// spaceId (2026-08-27) — private by default: your own events always show.
// Pass the household space's id to also pull in events either shared into
// it (via ShareMenu) or created directly from the Household calendar
// (useEvents' addShared, which shares on creation) — "has to share, or be
// made in household" per the user's own framing. Omit it (or pass null) to
// see only your own, e.g. a context with no household space at all.
export function useAgendaEntries(spaceId: string | null = null): AgendaEntry[] {
  const { items: workItems } = useWorkItems()
  const { subs } = useSubscriptions()
  const giftItems = useGiftOccasions()
  const { items: buyItems } = useBuyItems()
  const { items: ownEvents } = useEvents()
  const { items: sharedEvents } = useSharedEvents(spaceId)
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
    })
  }

  return entries
}
