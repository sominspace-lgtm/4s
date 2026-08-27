// Shared "voice" of the active Guide — greeting + proactivity — so Brief and
// Header speak with one consistent Guide personality instead of each rolling
// their own. Council uses MODES[...].transform directly; this covers the
// lighter-touch surfaces.
import { MODES, type Mode, type Proactivity } from '@/lib/constants/modes'

export function timeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

// Greeting prefix (and optional suffix) for the given Guide + hour.
export function guideGreeting(mode: Mode, hour: number): { prefix: string; suffix?: string } {
  const time = timeOfDay(hour)
  const isNight = time === 'night'

  switch (mode) {
    case 'peaceful':   return { prefix: isNight ? 'Rest easy,' : 'Welcome back,' }
    case 'friend':     return { prefix: time === 'morning' ? 'Morning,' : time === 'afternoon' ? 'Hey,' : time === 'evening' ? 'Evening,' : 'Still up,' }
    case 'executive':  return { prefix: '' }
    default:           return { prefix: `Good ${time},` }
  }
}

// A standalone greeting line (no name) for surfaces like Brief that show their
// own headline. Executive stays terse; everyone else gets a warm time greeting.
export function guideGreetingLine(mode: Mode, hour: number): string {
  const time = timeOfDay(hour)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  switch (mode) {
    // Full 4-way split (2026-08-27, was night vs. everything-else) — the
    // village itself is meant to feel like it's speaking to you differently
    // through the day, not just switching between two states.
    case 'peaceful':   return time === 'morning' ? 'Good morning' : time === 'afternoon' ? 'Hope your day is going gently' : time === 'evening' ? 'The village is winding down' : 'Rest easy'
    case 'friend':     return time === 'morning' ? 'Morning' : time === 'night' ? 'Still up' : 'Hey there'
    case 'executive':  return time === 'morning' ? "Today's priorities" : 'Where things stand'
    default:           return `Good ${cap(time)}`
  }
}

export function proactivityOf(mode: Mode): Proactivity {
  return MODES[mode]?.proactivity ?? 'medium'
}

// The Weekly Review's closing reflection, in the active Guide's voice.
export function guideReviewPrompt(mode: Mode): string {
  switch (mode) {
    case 'peaceful':   return 'What would make next week feel gentle?'
    case 'friend':     return 'What do you want next week to feel like?'
    case 'executive':  return "What are next week's top priorities?"
    default:           return 'What should next week feel like?'
  }
}
