// Time for Jarvis (2026-10-18). The server runs in UTC; the two of you live in
// California. Everything Jarvis says or books is in the home time zone, never
// the server's. Pure functions, tested.

export const HOME_TZ = process.env.HOME_TZ || 'America/Los_Angeles'

/** Minutes the zone is ahead of UTC at that instant (negative for the Americas). */
export function tzOffsetMinutes(at: Date, tz: string = HOME_TZ): number {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(at)
  const v = (t: string) => Number(p.find(x => x.type === t)?.value)
  const asUtc = Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute'), v('second'))
  return Math.round((asUtc - at.getTime()) / 60000)
}

/** A wall-clock date and time in the zone, as a real instant. */
export function zoned(date: string, time = '00:00', tz: string = HOME_TZ): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  // Two passes settle the offset across a daylight-saving change.
  let t = guess - tzOffsetMinutes(new Date(guess), tz) * 60000
  t = guess - tzOffsetMinutes(new Date(t), tz) * 60000
  return new Date(t)
}

/** The wall-clock date and time of an instant in the zone. */
export function wallClock(at: Date, tz: string = HOME_TZ): { date: string; time: string; weekday: string } {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'long',
  }).formatToParts(at)
  const v = (t: string) => p.find(x => x.type === t)?.value ?? ''
  return { date: `${v('year')}-${v('month')}-${v('day')}`, time: `${v('hour')}:${v('minute')}`, weekday: v('weekday') }
}

export function addDaysYmd(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export interface Slot { date: string; start: string; end: string }

/**
 * Free stretches of at least `minutes` between `earliest` and `latest` each
 * day, from `fromDate` to `toDate` inclusive, skipping busy blocks and
 * anything already in the past. At most `limit` slots, earliest first.
 */
export function freeSlots(busy: { start: string; end: string }[], opts: {
  fromDate: string; toDate: string; minutes: number; earliest?: string; latest?: string
  weekdays?: number[] | null; now?: Date; limit?: number; tz?: string
}): Slot[] {
  const tz = opts.tz ?? HOME_TZ
  const earliest = opts.earliest ?? '08:00', latest = opts.latest ?? '21:00'
  const now = (opts.now ?? new Date()).getTime()
  const need = opts.minutes * 60000
  const blocks = busy.map(b => [new Date(b.start).getTime(), new Date(b.end).getTime()] as const).sort((a, b) => a[0] - b[0])
  const out: Slot[] = []
  for (let day = opts.fromDate; day <= opts.toDate && out.length < (opts.limit ?? 8); day = addDaysYmd(day, 1)) {
    const wd = new Date(`${day}T12:00:00Z`).getUTCDay()
    if (opts.weekdays && opts.weekdays.length && !opts.weekdays.includes(wd)) continue
    let cursor = Math.max(zoned(day, earliest, tz).getTime(), now)
    // Round a "now" start up to the next quarter hour.
    cursor = Math.ceil(cursor / 900000) * 900000
    const stop = zoned(day, latest, tz).getTime()
    for (const [s, e] of [...blocks.filter(([s, e]) => e > cursor && s < stop), [stop, stop] as const]) {
      if (s - cursor >= need) {
        out.push({ date: day, start: wallClock(new Date(cursor), tz).time, end: wallClock(new Date(Math.min(s, stop)), tz).time })
        if (out.length >= (opts.limit ?? 8)) break
      }
      cursor = Math.max(cursor, e)
      if (cursor >= stop) break
    }
  }
  return out
}
