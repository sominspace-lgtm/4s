'use client'

import { format, differenceInDays, parseISO } from 'date-fns'
import { useWorkItems, dueUrgency } from '@/lib/hooks/useWorkItems'
import { useHabits, isDueOn } from '@/lib/hooks/useHabits'
import { useCaptures } from '@/lib/hooks/useCaptures'
import { useDomainTouched } from '@/lib/hooks/useDomainTouched'
import { useSubscriptions, urgency as subUrgency } from '@/lib/hooks/useSubscriptions'
import { useGiftEvents, daysUntil as giftDaysUntil } from '@/lib/hooks/useGiftEvents'
import { useBuyItems, computeStatus } from '@/lib/hooks/useBuyItems'
import { useWatchItems } from '@/lib/hooks/useWatchItems'
import { useCompanions } from '@/lib/hooks/useCompanions'
import { DOMAINS } from '@/lib/constants/domains'

// A compact, privacy-light summary of the user's current state, sent to the
// AI route for Council reviews and Ask Jarvis. Only counts, titles, and dates
// — no notes bodies, no emails, no ids.
export interface AppSnapshot {
  today: string
  tasks: { open: number; overdue: number; dueToday: number; inProgress: number; upcomingTitles: string[] }
  habits: { total: number; dueToday: number; doneToday: number }
  inboxCount: number
  domains: { label: string; daysSinceReview: number | null }[]
  money: {
    monthlySubsTotal: number
    renewalsSoon: string[]
    refillsDue: string[]
    wishlistCount: number
  }
  gifts: { name: string; inDays: number }[]
  sharing: { pendingInvites: number; friends: number }
  calendarConnected: boolean
}

export function useAppSnapshot(userId: string, calendarConnected: boolean): () => AppSnapshot {
  const { items: workItems } = useWorkItems()
  const { habits, completions } = useHabits()
  const { captures } = useCaptures()
  const { touched } = useDomainTouched()
  const { subs, total: monthlyTotal } = useSubscriptions()
  const { items: giftItems } = useGiftEvents()
  const { items: buyItems } = useBuyItems()
  const { items: wishItems } = useWatchItems()
  const { received, active } = useCompanions(userId)

  // Returned as a builder so callers snapshot at click time, not render time.
  return () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const openTasks = workItems.filter(i => i.status !== 'done')
    const habitsDue = habits.filter(h => isDueOn(h, today, completions[h.id] ?? []))
    return {
      today,
      tasks: {
        open: openTasks.length,
        overdue: openTasks.filter(i => dueUrgency(i.due_date) === 'overdue').length,
        dueToday: openTasks.filter(i => dueUrgency(i.due_date) === 'today').length,
        inProgress: openTasks.filter(i => i.status === 'in-progress').length,
        upcomingTitles: openTasks
          .filter(i => i.due_date)
          .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
          .slice(0, 5)
          .map(i => `${i.title} (due ${i.due_date})`),
      },
      habits: {
        total: habits.length,
        dueToday: habitsDue.length,
        doneToday: habitsDue.filter(h => (completions[h.id] ?? []).includes(today)).length,
      },
      inboxCount: captures.length,
      domains: DOMAINS.map(d => ({
        label: d.label,
        daysSinceReview: touched[d.id] ? differenceInDays(new Date(), parseISO(touched[d.id])) : null,
      })),
      money: {
        monthlySubsTotal: Math.round(monthlyTotal),
        renewalsSoon: subs.filter(s => subUrgency(s.renewal_date) === 'soon').map(s => s.name),
        refillsDue: buyItems.filter(b => ['due-to-buy', 'overdue'].includes(computeStatus(b))).map(b => b.name),
        wishlistCount: wishItems.length,
      },
      gifts: giftItems.map(g => ({ name: g.name, inDays: giftDaysUntil(g) })).filter(g => g.inDays <= 30),
      sharing: {
        pendingInvites: received.filter(c => c.status === 'pending').length,
        friends: active.length,
      },
      calendarConnected,
    }
  }
}
