import { format, subDays, startOfDay, parseISO, isToday, isYesterday } from 'date-fns'

export function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
  )
}

export function getDayLabel(dateStr: string): string {
  return format(parseISO(dateStr + 'T12:00:00'), 'EEEEE')
}

export function calcStreak(completedDates: string[]): number {
  const done = new Set(completedDates)
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  let streak = 0
  let check = startOfDay(new Date())

  // If today not done, start from yesterday
  if (!done.has(todayStr)) check = subDays(check, 1)

  while (done.has(format(check, 'yyyy-MM-dd'))) {
    streak++
    check = subDays(check, 1)
  }
  return streak
}

export const DOMAIN_COLORS: Record<string, string> = {
  'biz-active':   'var(--gold)',
  'biz-future':   'var(--purple)',
  'money':        'var(--emerald)',
  'health':       'var(--rose)',
  'relationship': 'var(--blush)',
  'creative':     'var(--amber)',
  'home':         'var(--slate)',
  'self':         'var(--lavender)',
}

export interface HabitInsight {
  domain: string
  completedThisWeek: number
  totalHabits: number
  suggestion: 'fine' | 'watch' | 'quiet'
}

export function computeHabitInsights(
  habits: { id: string; category: string | null }[],
  completions: Record<string, string[]>,
  weekDates: string[]
): HabitInsight[] {
  const byDomain: Record<string, string[]> = {}
  habits.forEach(h => {
    const cat = h.category || 'uncategorized'
    if (!byDomain[cat]) byDomain[cat] = []
    byDomain[cat].push(h.id)
  })

  return Object.entries(byDomain).map(([domain, ids]) => {
    const totalSlots = ids.length * weekDates.length
    const completed = ids.reduce((sum, id) => {
      const dates = new Set(completions[id] || [])
      return sum + weekDates.filter(d => dates.has(d)).length
    }, 0)
    const rate = totalSlots > 0 ? completed / totalSlots : 0
    return {
      domain,
      completedThisWeek: completed,
      totalHabits: ids.length,
      suggestion: rate >= 0.7 ? 'fine' : rate >= 0.4 ? 'watch' : 'quiet',
    }
  })
}
