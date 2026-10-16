import { differenceInCalendarDays, format, parseISO } from 'date-fns'

// How far off a trip is, said plainly (2026-10-16): "in 42 days", "tomorrow",
// "day 3 of 7", "6 weeks ago". Pure, so the edges are tested.

export type TripPhase = 'undated' | 'upcoming' | 'now' | 'past'

export interface TripWhen { phase: TripPhase; label: string; nights: number | null; range: string | null; daysAway: number | null }

export function tripWhen(start: string | null, end: string | null, today: Date = new Date()): TripWhen {
  if (!start) return { phase: 'undated', label: 'No dates yet', nights: null, range: null, daysAway: null }
  const s = parseISO(start)
  const e = end ? parseISO(end) : s
  const nights = Math.max(0, differenceInCalendarDays(e, s))
  const sameYear = s.getFullYear() === e.getFullYear()
  const range = end && end !== start
    ? `${format(s, sameYear ? 'MMM d' : 'MMM d, yyyy')} to ${format(e, s.getMonth() === e.getMonth() && sameYear ? 'd, yyyy' : 'MMM d, yyyy')}`
    : format(s, 'MMM d, yyyy')
  const toStart = differenceInCalendarDays(s, today)
  const sinceEnd = differenceInCalendarDays(today, e)
  if (toStart > 0) {
    const label = toStart === 1 ? 'Tomorrow' : toStart < 60 ? `In ${toStart} days` : `In ${Math.round(toStart / 7)} weeks`
    return { phase: 'upcoming', label, nights, range, daysAway: toStart }
  }
  if (sinceEnd <= 0) {
    const day = -toStart + 1
    return { phase: 'now', label: nights > 0 ? `Day ${day} of ${nights + 1}` : 'Today', nights, range, daysAway: 0 }
  }
  const label = sinceEnd < 14 ? `${sinceEnd} day${sinceEnd === 1 ? '' : 's'} ago` : sinceEnd < 120 ? `${Math.round(sinceEnd / 7)} weeks ago` : format(s, 'MMM yyyy')
  return { phase: 'past', label, nights, range, daysAway: null }
}

/** A calm two-colour gradient picked from the trip's name, so each card looks its own. */
export function tripGradient(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  const a = h % 360, b = (a + 40 + (h >> 9) % 60) % 360
  return `linear-gradient(135deg, hsl(${a} 45% 42%), hsl(${b} 50% 30%))`
}
