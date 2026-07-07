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
    case 'monk':       return { prefix: isNight ? 'Rest now,' : 'Be present,' }
    case 'friend':     return { prefix: time === 'morning' ? 'Morning,' : time === 'afternoon' ? 'Hey,' : time === 'evening' ? 'Evening,' : 'Still up,' }
    case 'teacher':    return { prefix: `Good ${time},`, suffix: '— ready to reflect?' }
    case 'therapist':  return { prefix: isNight ? 'Still with you,' : `Good ${time},`, suffix: '— how are you, really?' }
    case 'navigator':  return { prefix: `Good ${time},`, suffix: '— let\'s look ahead.' }
    case 'executive':  return { prefix: '' }
    case 'butler':     return { prefix: isNight ? 'Good evening,' : `Good ${time},` }
    case 'challenger': return { prefix: time === 'morning' ? "Let's move," : time === 'afternoon' ? 'Still going,' : time === 'evening' ? 'Finish it,' : 'Late one,' }
    default:           return { prefix: `Good ${time},` }
  }
}

// A standalone greeting line (no name) for surfaces like Brief that show their
// own headline. Executive stays terse; everyone else gets a warm time greeting.
export function guideGreetingLine(mode: Mode, hour: number): string {
  const time = timeOfDay(hour)
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  switch (mode) {
    case 'peaceful':   return time === 'night' ? 'Rest easy' : 'Welcome back'
    case 'monk':       return 'Be present'
    case 'friend':     return time === 'morning' ? 'Morning' : time === 'night' ? 'Still up' : 'Hey there'
    case 'teacher':    return `Good ${time} — ready to reflect?`
    case 'therapist':  return `Good ${time} — how are you, really?`
    case 'navigator':  return `Good ${time} — let's look ahead`
    case 'executive':  return time === 'morning' ? "Today's priorities" : 'Where things stand'
    case 'butler':     return `Good ${time}`
    case 'challenger': return time === 'morning' ? "Let's move" : time === 'night' ? 'Late one' : 'Still going'
    default:           return `Good ${cap(time)}`
  }
}

export function proactivityOf(mode: Mode): Proactivity {
  return MODES[mode]?.proactivity ?? 'medium'
}
