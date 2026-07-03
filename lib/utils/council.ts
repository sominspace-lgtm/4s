import { differenceInDays, parseISO, addDays } from 'date-fns'
import type { Habit } from '@/lib/hooks/useHabits'
import type { Subscription } from '@/lib/hooks/useSubscriptions'
import type { BuyItem } from '@/lib/hooks/useBuyItems'
import { getLast7Days } from './habits'
import { MODES, type Mode } from '@/lib/constants/modes'

// Shared advisor metadata — used by the rule-based generator below and to
// dress AI-generated advice (which returns only domain/verdict/advice).
export const COUNCIL_DOMAINS = [
  { id: 'biz-active', label: 'Business', icon: '◈', color: 'var(--gold)' },
  { id: 'biz-future', label: 'Pipeline', icon: '◇', color: 'var(--purple)' },
  { id: 'money',      label: 'Finance',  icon: '◉', color: 'var(--emerald)' },
  { id: 'health',     label: 'Health',   icon: '○', color: 'var(--rose)' },
  { id: 'relationship',label:'Relationship',icon:'♡',color:'var(--blush)' },
  { id: 'creative',   label: 'Creative', icon: '✦', color: 'var(--amber)' },
  { id: 'home',       label: 'Home',     icon: '⌂', color: 'var(--slate)' },
  { id: 'self',       label: 'Self',     icon: '◎', color: 'var(--lavender)' },
  { id: 'sharing',    label: 'Sharing',  icon: '⇆', color: 'var(--blush)' },
  { id: 'planning',   label: 'Planning', icon: '◒', color: 'var(--gold)' },
]

export interface CouncilAdvice {
  domain: string
  label: string
  icon: string
  color: string
  verdict: 'fine' | 'watch' | 'quiet'
  advice: string
}

interface CouncilInput {
  habits: Habit[]
  completions: Record<string, string[]>
  subscriptions: Subscription[]
  buyItems: BuyItem[]
  domainTouched: Record<string, string>
  mode?: Mode
  overdueTasks?: number
  dueTodayTasks?: number
  upcomingGifts?: { name: string; days: number }[]
  pendingShares?: number
}

function habitRate(habits: Habit[], completions: Record<string, string[]>, category: string): { rate: number; count: number; done: number } {
  const week = getLast7Days()
  const relevant = habits.filter(h => h.category === category)
  if (!relevant.length) return { rate: -1, count: 0, done: 0 }
  const total = relevant.length * week.length
  const done = relevant.reduce((sum, h) => {
    const s = new Set(completions[h.id] || [])
    return sum + week.filter(d => s.has(d)).length
  }, 0)
  return { rate: done / total, count: relevant.length, done }
}

function daysSinceTouched(touched: string | undefined): number {
  if (!touched) return 999
  return differenceInDays(new Date(), parseISO(touched))
}

export function generateCouncilAdvice(input: CouncilInput): CouncilAdvice[] {
  const {
    habits, completions, subscriptions, buyItems, domainTouched, mode = 'balanced',
    overdueTasks = 0, dueTodayTasks = 0, upcomingGifts = [], pendingShares = 0,
  } = input
  const modeConfig = MODES[mode]
  const week = getLast7Days()

  // Money
  const totalSpend = subscriptions.reduce((s, x) => s + Number(x.cost_monthly), 0)
  const dueSoon = subscriptions.filter(s => {
    if (!s.renewal_date) return false
    return differenceInDays(parseISO(s.renewal_date), new Date()) <= 7
  })
  const overdueItems = buyItems.filter(b => {
    const due = addDays(parseISO(b.last_bought), b.cadence_days)
    return differenceInDays(due, new Date()) < 0
  })

  // Health habits
  const healthRate = habitRate(habits, completions, 'health')
  const selfRate = habitRate(habits, completions, 'self')
  const creativeRate = habitRate(habits, completions, 'creative')
  const bizActiveRate = habitRate(habits, completions, 'biz-active')

  const advice: Pick<CouncilAdvice, 'verdict' | 'advice'>[] = [
    // Business Active
    (() => {
      const days = daysSinceTouched(domainTouched['biz-active'])
      if (days > 7) return { verdict: 'watch' as const, advice: `Your active work hasn't been reviewed in ${days} days. Check in before things drift.` }
      if (bizActiveRate.rate >= 0 && bizActiveRate.rate < 0.5) return { verdict: 'watch' as const, advice: `Business habits are at ${Math.round(bizActiveRate.rate * 100)}% this week. Push for consistency.` }
      if (bizActiveRate.rate >= 0.7) return { verdict: 'fine' as const, advice: `Good momentum this week — ${bizActiveRate.done} of ${bizActiveRate.count * 7} habit days done. Keep the cadence.` }
      return { verdict: 'quiet' as const, advice: 'No major flags. Stay proactive and review your active items.' }
    })(),

    // Business Future
    (() => {
      const days = daysSinceTouched(domainTouched['biz-future'])
      if (days > 14) return { verdict: 'watch' as const, advice: `Pipeline hasn't been touched in ${days} days. Ideas go cold — give it 10 minutes.` }
      return { verdict: 'quiet' as const, advice: 'Pipeline looks maintained. Keep nurturing long-horizon ideas.' }
    })(),

    // Money
    (() => {
      if (dueSoon.length > 0) return { verdict: 'watch' as const, advice: `${dueSoon.map(s => s.name).join(', ')} renew${dueSoon.length === 1 ? 's' : ''} within 7 days. Make sure funds are available.` }
      if (overdueItems.length > 0) return { verdict: 'watch' as const, advice: `${overdueItems.map(b => b.name).join(', ')} ${overdueItems.length === 1 ? 'is' : 'are'} overdue for restocking. Don't let essentials run out.` }
      if (totalSpend > 100) return { verdict: 'watch' as const, advice: `You're spending $${totalSpend.toFixed(0)}/mo on subscriptions. Worth a quick audit — is everything still needed?` }
      if (totalSpend > 0) return { verdict: 'fine' as const, advice: `$${totalSpend.toFixed(0)}/mo in subscriptions. Looks manageable — no urgent renewals.` }
      return { verdict: 'quiet' as const, advice: 'No subscriptions or spending tracked yet. Add them to get smarter insights here.' }
    })(),

    // Health
    (() => {
      if (healthRate.rate < 0) return { verdict: 'quiet' as const, advice: 'No health habits tracked. Add a gym or movement habit so I can keep an eye on things.' }
      if (healthRate.rate < 0.4) return { verdict: 'watch' as const, advice: `Health habits at ${Math.round(healthRate.rate * 100)}% this week. Your body needs consistency — even one session helps.` }
      if (healthRate.rate >= 0.8) return { verdict: 'fine' as const, advice: `Solid week — ${healthRate.done} of ${healthRate.count * 7} health habit days completed. Your body is thanking you.` }
      return { verdict: 'fine' as const, advice: `Health habits at ${Math.round(healthRate.rate * 100)}% this week. Decent — push a little harder next week.` }
    })(),

    // Relationship
    (() => {
      const days = daysSinceTouched(domainTouched['relationship'])
      if (days > 10) return { verdict: 'watch' as const, advice: `Relationship hasn't been checked in ${days} days. Small gestures matter — don't let connection become background noise.` }
      return { verdict: 'fine' as const, advice: 'Relationship is on your radar. Presence and intention go a long way.' }
    })(),

    // Creative
    (() => {
      if (creativeRate.rate >= 0 && creativeRate.rate < 0.3) return { verdict: 'watch' as const, advice: `Creative habits are barely moving this week. Even 15 minutes of making something counts.` }
      const days = daysSinceTouched(domainTouched['creative'])
      if (days > 7) return { verdict: 'watch' as const, advice: `Creative space hasn't been visited in ${days} days. Silence here tends to build into resistance.` }
      return { verdict: 'quiet' as const, advice: 'No major creative flags. Keep showing up, even in small ways.' }
    })(),

    // Home
    (() => {
      const days = daysSinceTouched(domainTouched['home'])
      if (days > 14) return { verdict: 'watch' as const, advice: `Home and admin last reviewed ${days} days ago. Small admin tasks compound — carve out 30 minutes.` }
      return { verdict: 'fine' as const, advice: 'Home base looks maintained. Stay on top of the small stuff before it piles up.' }
    })(),

    // Self
    (() => {
      if (selfRate.rate < 0) return { verdict: 'quiet' as const, advice: 'No self-growth habits tracked. Add a journaling or reading habit to keep this part of you visible.' }
      if (selfRate.rate < 0.4) return { verdict: 'watch' as const, advice: `Self-care habits at ${Math.round(selfRate.rate * 100)}% this week. You can't pour from an empty cup — prioritise yourself.` }
      if (selfRate.rate >= 0.7) return { verdict: 'fine' as const, advice: `Self habits strong at ${Math.round(selfRate.rate * 100)}% this week. This is what groundedness looks like.` }
      return { verdict: 'quiet' as const, advice: `Self habits at ${Math.round(selfRate.rate * 100)}% — steady. Keep checking in with yourself.` }
    })(),

    // Sharing — shared items and people
    (() => {
      const soonGift = [...upcomingGifts].sort((a, b) => a.days - b.days)[0]
      if (pendingShares > 0) return { verdict: 'watch' as const, advice: `${pendingShares} shared item${pendingShares > 1 ? 's are' : ' is'} waiting on your response.` }
      if (soonGift && soonGift.days <= 14) return { verdict: 'watch' as const, advice: `${soonGift.name} is coming up in ${soonGift.days}d — worth thinking about a gift.` }
      return { verdict: 'quiet' as const, advice: 'Nothing urgent from companions or shared spaces right now.' }
    })(),

    // Planning
    (() => {
      if (overdueTasks > 0) return { verdict: 'watch' as const, advice: `${overdueTasks} task${overdueTasks > 1 ? 's are' : ' is'} overdue. Reschedule or knock them out.` }
      if (dueTodayTasks > 0) return { verdict: 'watch' as const, advice: `${dueTodayTasks} task${dueTodayTasks > 1 ? 's' : ''} due today — plan when you'll tackle ${dueTodayTasks > 1 ? 'them' : 'it'}.` }
      return { verdict: 'fine' as const, advice: 'Calendar and tasks are clear. Good day to plan ahead.' }
    })(),
  ]

  return COUNCIL_DOMAINS.map((d, i) => {
    const raw = advice[i]
    return {
      domain: d.id, label: d.label, icon: d.icon, color: d.color,
      verdict: raw.verdict,
      advice: modeConfig.transform(raw.advice, raw.verdict, d.label),
    }
  })
}
