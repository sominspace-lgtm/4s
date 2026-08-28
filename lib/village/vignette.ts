// "Living painting" per-day flavor (round 50, 2026-08-28) — a thin, named
// wrapper around hashPos so call sites in VillageScene.tsx/Ambient.tsx read
// as intent ("today's dawn drift") rather than raw hash calls. Deliberately
// keyed by a day-granularity date string, not per-session-load, matching
// hashPos's own documented reasoning (state.ts): a scene that looked
// different every tab reopen would read as noise, not "semi-randomized so
// it isn't identical every day" — the actual ask.

import { hashPos } from './state'

/** 'YYYY-MM-DD' in the viewer's own local time, from whatever Date the
 *  scene's own clock (useVillageClock) already produced — never re-derive
 *  from `new Date()` directly, that's the exact hydration mismatch
 *  useVillageClock's own null-until-mounted guard exists to avoid. */
export function dateKeyOf(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** A stable [0,1) value for one named "variant slot" on one day — e.g.
 *  vignetteVariant(dateKey, 'dawn', 'home-drift') picks today's version of
 *  how far Sylvia/Harry's lap starts from their usual spot at dawn. Same
 *  dateKey+bucket+slot always returns the same number; a different day (or
 *  a different slot) returns an independent one. */
export function vignetteVariant(dateKey: string, bucket: string, slot: string): number {
  return hashPos(`${dateKey}:${bucket}:${slot}`)
}
