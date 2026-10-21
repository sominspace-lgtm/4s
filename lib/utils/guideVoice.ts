// The app's one voice (2026-10-21): greeting, how much Today surfaces, and
// the weekly review's closing question. There used to be a voice per Guide.
import { MODES, type Mode, type Proactivity } from '@/lib/constants/modes'

export function timeOfDay(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export function guideGreeting(_mode: Mode, hour: number): { prefix: string; suffix?: string } {
  const time = timeOfDay(hour)
  return { prefix: time === 'morning' ? 'Morning,' : time === 'afternoon' ? 'Hey,' : time === 'evening' ? 'Evening,' : 'Still up,' }
}

export function guideGreetingLine(_mode: Mode, hour: number): string {
  const time = timeOfDay(hour)
  return time === 'morning' ? 'Morning' : time === 'night' ? 'Still up' : 'Hey there'
}

export function proactivityOf(mode: Mode): Proactivity {
  return MODES[mode]?.proactivity ?? 'medium'
}

export function guideReviewPrompt(_mode: Mode): string {
  return 'What do you want next week to feel like?'
}
