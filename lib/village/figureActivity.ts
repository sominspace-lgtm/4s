import { format, subDays } from 'date-fns'
import type { Habit } from '@/lib/hooks/useHabits'
import type { ContextActivity } from '@/components/village/scene/shapes'

// What the couple in the village is "doing" — the activity you've put the
// most into this week, mapped to a context pose (2026-09-04). Returns null
// (plain idle) unless something clearly dominates.

const CATEGORY_ACTIVITY: Record<string, ContextActivity> = {
  health: 'garden',
  home: 'garden',
  creative: 'read',
  self: 'read',
}

export function figureActivity(
  habits: Habit[],
  completions: Record<string, string[]>,
  now: Date = new Date(),
): ContextActivity | null {
  const since = format(subDays(now, 7), 'yyyy-MM-dd')
  const byCategory: Record<string, number> = {}
  for (const h of habits) {
    if (!h.category) continue
    const recent = (completions[h.id] ?? []).filter(d => d.slice(0, 10) >= since).length
    if (recent) byCategory[h.category] = (byCategory[h.category] ?? 0) + recent
  }
  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
  if (!top || top[1] < 2) return null
  return CATEGORY_ACTIVITY[top[0]] ?? null
}
