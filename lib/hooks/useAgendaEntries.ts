'use client'

import { parseISO } from 'date-fns'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useSubscriptions } from '@/lib/hooks/useSubscriptions'
import { useGiftEvents, nextOccurrence } from '@/lib/hooks/useGiftEvents'
import { useBuyItems, runoutDate, computeStatus } from '@/lib/hooks/useBuyItems'

export interface AgendaEntry {
  key: string
  date: Date
  label: string
  type: 'task' | 'renewal' | 'refill' | 'gift'
}

export const AGENDA_TYPE_META: Record<AgendaEntry['type'], { label: string; color: string }> = {
  task:    { label: 'task',    color: 'var(--gold)' },
  renewal: { label: 'renewal', color: 'var(--emerald)' },
  refill:  { label: 'refill',  color: 'var(--amber)' },
  gift:    { label: 'gift',    color: 'var(--blush)' },
}

// Everything the app knows that has a date — dated tasks, renewals, refill
// run-outs, gift dates. Consumers window/bucket as needed (agenda list,
// month grid). No external calendar here; Google stays in its embed.
export function useAgendaEntries(): AgendaEntry[] {
  const { items: workItems } = useWorkItems()
  const { subs } = useSubscriptions()
  const { items: giftItems } = useGiftEvents()
  const { items: buyItems } = useBuyItems()

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
    entries.push({ key: `gift-${g.id}`, date: nextOccurrence(g), label: g.name, type: 'gift' })
  }

  return entries
}
