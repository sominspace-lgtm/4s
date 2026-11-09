import type { BinDays } from '@/lib/hooks/useSmartHome'

// Small pure pieces of HomeView (2026-11-08), kept here so they can be tested.

export const FACES = ['village', 'clock', 'calm'] as const
export type Face = (typeof FACES)[number]

export type PartOfDay = 'morning' | 'day' | 'evening' | 'night'

export function partOfDayOf(d: Date | null): PartOfDay {
  const hr = d ? d.getHours() : 12
  if (hr < 6) return 'night'
  if (hr < 11) return 'morning'
  if (hr < 17) return 'day'
  if (hr < 22) return 'evening'
  return 'night'
}

/** "Bins out tonight" the evening before collection, "this morning" on the day. 0 = Sunday. */
export function binLineFor(binDays: BinDays, d: Date | null): string | null {
  if (!d) return null
  const days = [binDays.trash, binDays.recycling].filter((x): x is number => typeof x === 'number')
  if (!days.length) return null
  const part = partOfDayOf(d)
  const dow = d.getDay()
  if (part === 'morning' && days.includes(dow)) return 'Bins out this morning'
  if ((part === 'evening' || part === 'night') && days.includes((dow + 1) % 7)) return 'Bins out tonight'
  return null
}
