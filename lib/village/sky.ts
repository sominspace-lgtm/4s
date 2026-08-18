// Where the sun or moon sits, and what shape the moon is tonight.
//
// Pure and deterministic from a Date, like everything else the village draws.
// The point of the moon carrying a real phase rather than a generic disc is
// that it's the one thing on screen that is true about the world rather than
// about you: it changes on a schedule you have no say in, which is precisely
// what makes the village feel like a place rather than a readout.

export interface Celestial {
  body: 'sun' | 'moon'
  x: number
  y: number
  /** 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter. */
  phase: number
}

const SYNODIC_DAYS = 29.530588853
// A known new moon: 2000-01-06 18:14 UTC.
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14)

export function moonPhaseOf(d: Date): number {
  const days = (d.getTime() - KNOWN_NEW_MOON) / 86_400_000
  const p = (days / SYNODIC_DAYS) % 1
  return p < 0 ? p + 1 : p
}

export function moonPhaseLabel(p: number): string {
  if (p < 0.03 || p > 0.97) return 'new moon'
  if (p < 0.22) return 'waxing crescent'
  if (p < 0.28) return 'first quarter'
  if (p < 0.47) return 'waxing gibbous'
  if (p < 0.53) return 'full moon'
  if (p < 0.72) return 'waning gibbous'
  if (p < 0.78) return 'last quarter'
  return 'waning crescent'
}

/**
 * Sun from 06:00 to 18:00, moon the other twelve hours, both on the same
 * shallow arc across the upper sky. Deliberately a low arc: the scene is only
 * 440 tall and the top 150 belongs to the district labels, so a realistic
 * overhead sun would sit behind the text.
 */
export function celestialOf(d: Date): Celestial {
  const hours = d.getHours() + d.getMinutes() / 60
  const isDay = hours >= 6 && hours < 18
  const t = isDay ? (hours - 6) / 12 : ((hours - 18 + 24) % 24) / 12
  return {
    body: isDay ? 'sun' : 'moon',
    x: 70 + t * 660,
    y: 120 - 60 * Math.sin(Math.PI * t),
    phase: moonPhaseOf(d),
  }
}
