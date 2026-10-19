import { addDaysYmd } from '@/lib/jarvis/time'
import { todayKey } from './items'

// Gentle streaks (2026-10-19). A streak counts the days a routine was
// finished. Missing a day or two does not break it: the count just waits
// ("paused") and carries on when you do it again. Only three missed days in a
// row start it over. Days are local yyyy-MM-dd strings.

export const GRACE_DAYS = 2

export function routineStreak(doneDays: string[], now: Date = new Date()): { days: number; paused: boolean } {
  const done = new Set(doneDays)
  const today = todayKey(now)
  let day = today
  // Today not done yet is fine: start counting from yesterday without penalty.
  if (!done.has(day)) day = addDaysYmd(day, -1)
  let count = 0, gap = 0, lastDone: string | null = null
  for (let i = 0; i < 800; i++) {
    if (done.has(day)) { count++; gap = 0; lastDone ??= day }
    else {
      gap++
      if (gap > GRACE_DAYS) break
    }
    day = addDaysYmd(day, -1)
  }
  if (!lastDone) return { days: 0, paused: false }
  // How long since it was last done, counting from yesterday.
  const sinceLast = Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${lastDone}T12:00:00Z`)) / 86_400_000)
  if (sinceLast > GRACE_DAYS + 1) return { days: 0, paused: false }
  return { days: count, paused: sinceLast >= 2 }
}

/** Add today to the list, newest first, keeping about a year. */
export function withToday(doneDays: string[] | null | undefined, now: Date = new Date()): string[] {
  const t = todayKey(now)
  return [t, ...(doneDays ?? []).filter(d => d !== t)].slice(0, 400)
}
