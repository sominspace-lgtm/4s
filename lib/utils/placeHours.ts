// "Open now" from a pin's stored hours (2026-09-09). Pins keep one open
// time and one close time in details.open / details.close ("HH:MM", local).
// Deliberately not per-day — a single window is enough to answer "is it
// worth going right now" for the courts and cafes this is really for.

function toMinutes(hhmm: unknown): number | null {
  if (typeof hhmm !== 'string') return null
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1]), min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** 'open' | 'closed' when hours are set, null when they aren't. */
export function openState(details: Record<string, unknown> | null | undefined): 'open' | 'closed' | null {
  const open = toMinutes(details?.open)
  const close = toMinutes(details?.close)
  if (open == null || close == null) return null
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  // A close time at or before the open time means it runs past midnight.
  const overnight = close <= open
  const isOpen = overnight ? (cur >= open || cur < close) : (cur >= open && cur < close)
  return isOpen ? 'open' : 'closed'
}
