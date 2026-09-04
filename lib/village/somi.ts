// Somi's little card (2026-09-03). Tapping the cat in the village shows
// this — her age, her snack, the tricks she knows. Guests love it and it
// saves the hosts explaining "yes you can pet her, no don't feed her
// from the table" ten times a night.
//
// DEFAULT_SOMI is the baseline; a household can override any field via
// `shared_spaces.pet_info` (edited from the gathering panel). An empty
// override falls back to the default — clearing the tricks box doesn't
// wipe her tricks, it just restores the known four.

export interface SomiInfo {
  name?: string
  /** Free text, e.g. "3 years old" or "turns 4 in spring". Overrides the
   *  live-computed age below when set. */
  ageText?: string
  snack?: string
  tricks?: string[]
  notes?: string
}

/** Her actual birthday (2026-09-04) — everything else in this file can be
 *  overridden per household; this one's a fact, not a default. */
export const SOMI_BIRTHDAY = '2025-07-11'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** "Born July 11, 2025" — a fixed label, not time-of-day dependent. */
export function somiBirthdayLabel(): string {
  const [y, m, d] = SOMI_BIRTHDAY.split('-').map(Number)
  return `Born ${MONTHS[m - 1]} ${d}, ${y}`
}

/** "2 months old" / "1 year, 3 months old" — computed live from
 *  SOMI_BIRTHDAY, no stored state to go stale. */
export function somiAgeText(now: Date = new Date()): string {
  const [by, bm, bd] = SOMI_BIRTHDAY.split('-').map(Number)
  let years = now.getFullYear() - by
  let months = now.getMonth() - (bm - 1)
  let days = now.getDate() - bd
  if (days < 0) months -= 1
  if (months < 0) { months += 12; years -= 1 }
  if (years < 0) return 'not born yet'
  if (years === 0 && months === 0) return days <= 0 ? 'born today' : `${days} day${days === 1 ? '' : 's'} old`
  if (years === 0) return `${months} month${months === 1 ? '' : 's'} old`
  return `${years} year${years === 1 ? '' : 's'}${months ? `, ${months} month${months === 1 ? '' : 's'}` : ''} old`
}

export const DEFAULT_SOMI: Required<Omit<SomiInfo, 'ageText' | 'notes'>> & Pick<SomiInfo, 'ageText' | 'notes'> = {
  name: 'Somi',
  ageText: undefined,
  snack: 'Churu',
  tricks: ['sit', 'high five', 'spin', 'stand'],
  notes: 'Please don’t feed her from the table.',
}

export interface ResolvedSomi {
  name: string
  ageText: string
  birthdayLabel: string
  snack: string
  tricks: string[]
  notes: string | null
}

/** Merge a stored override onto DEFAULT_SOMI. Empty strings / empty
 *  arrays count as "not set" so a blank field never erases a default.
 *  `ageText` defaults to the live-computed age from her real birthday
 *  rather than a static fallback — a host-entered override still wins. */
export function resolveSomi(info: SomiInfo | null | undefined, now: Date = new Date()): ResolvedSomi {
  const o = info ?? {}
  const str = (v: string | undefined, fallback: string) => {
    const t = (v ?? '').trim()
    return t || fallback
  }
  const optStr = (v: string | undefined, fallback: string | null) => {
    const t = (v ?? '').trim()
    return t || fallback
  }
  const tricks = Array.isArray(o.tricks) ? o.tricks.map(t => t.trim()).filter(Boolean) : []
  return {
    name: str(o.name, DEFAULT_SOMI.name),
    ageText: str(o.ageText, somiAgeText(now)),
    birthdayLabel: somiBirthdayLabel(),
    snack: str(o.snack, DEFAULT_SOMI.snack),
    tricks: tricks.length ? tricks : DEFAULT_SOMI.tricks,
    notes: optStr(o.notes, DEFAULT_SOMI.notes ?? null),
  }
}
