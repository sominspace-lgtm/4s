import type { SupabaseClient } from '@supabase/supabase-js'
import { listEvents, createEvent, busyBlocks } from '@/lib/google/calendar'
import { HOME_TZ, zoned, addDaysYmd, freeSlots, wallClock } from './time'

// What Jarvis can do (2026-10-18). Each tool is a small server function with
// a JSON schema the model sees. A `write` tool never runs straight from the
// model: the chat route turns it into a signed pending action and it only
// runs after the person taps Confirm (see actions.ts and /api/jarvis/act).
// Every tool works on the signed-in person's own data; nothing here takes a
// user id from the model.

export interface ToolCtx { userId: string; supabase: SupabaseClient }

export interface JarvisTool {
  name: string
  description: string
  input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
  write?: boolean
  /** Plain words for the confirm card (write tools). */
  summarize?: (input: Record<string, unknown>) => string
  run: (ctx: ToolCtx, input: Record<string, unknown>) => Promise<unknown>
}

export class ToolInputError extends Error {}

const ymd = (v: unknown, name: string): string => {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v
  throw new ToolInputError(`${name} must be a date like 2026-10-21`)
}
const hm = (v: unknown): string | null => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : null)
const str = (v: unknown, max = 500): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null)
const num = (v: unknown, lo: number, hi: number, dflt: number): number => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt
}

function niceDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
}
function niceTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

// ── Google Calendar ─────────────────────────────────────────────────────────
const calendarTools: JarvisTool[] = [
  {
    name: 'calendar_list_events',
    description: 'List events on the person\'s Google Calendar between two dates (inclusive), in the home time zone.',
    input_schema: { type: 'object', properties: {
      from: { type: 'string', description: 'First day, yyyy-MM-dd' },
      to: { type: 'string', description: 'Last day, yyyy-MM-dd (inclusive). At most 60 days after from.' },
    }, required: ['from', 'to'] },
    run: async ({ userId }, i) => {
      const from = ymd(i.from, 'from'), to = ymd(i.to, 'to')
      if (to < from) throw new ToolInputError('to is before from')
      if (to > addDaysYmd(from, 60)) throw new ToolInputError('Ask for 60 days or fewer at a time')
      const events = await listEvents(userId, zoned(from), zoned(addDaysYmd(to, 1)))
      return events.map(e => {
        const s = e.allDay ? { date: e.start.slice(0, 10), time: null } : wallClock(new Date(e.start))
        const en = e.allDay ? null : wallClock(new Date(e.end))
        return { title: e.title, date: s.date, start: s.time, end: en?.time ?? null, allDay: e.allDay, location: e.location }
      })
    },
  },
  {
    name: 'calendar_find_free_time',
    description: 'Find open stretches on the person\'s Google Calendar. Use before suggesting or booking a time.',
    input_schema: { type: 'object', properties: {
      from: { type: 'string', description: 'First day to look, yyyy-MM-dd' },
      to: { type: 'string', description: 'Last day to look, yyyy-MM-dd (inclusive), at most 31 days after from' },
      minutes: { type: 'number', description: 'How long the slot must be, in minutes' },
      earliest: { type: 'string', description: 'Earliest start each day, HH:MM 24-hour. Default 08:00' },
      latest: { type: 'string', description: 'Latest end each day, HH:MM 24-hour. Default 21:00' },
      weekdays: { type: 'array', items: { type: 'number' }, description: 'Only these days: 0 Sunday to 6 Saturday. Omit for any day.' },
    }, required: ['from', 'to', 'minutes'] },
    run: async ({ userId }, i) => {
      const from = ymd(i.from, 'from'), to = ymd(i.to, 'to')
      if (to < from) throw new ToolInputError('to is before from')
      if (to > addDaysYmd(from, 31)) throw new ToolInputError('Look at 31 days or fewer at a time')
      const busy = await busyBlocks(userId, zoned(from), zoned(addDaysYmd(to, 1)))
      const weekdays = Array.isArray(i.weekdays) ? (i.weekdays as unknown[]).map(Number).filter(n => n >= 0 && n <= 6) : null
      return freeSlots(busy, {
        fromDate: from, toDate: to, minutes: num(i.minutes, 15, 600, 60),
        earliest: hm(i.earliest) ?? '08:00', latest: hm(i.latest) ?? '21:00', weekdays, limit: 10,
      })
    },
  },
  {
    name: 'calendar_create_event',
    description: 'Add an event to the person\'s Google Calendar. The person confirms before it is added.',
    write: true,
    input_schema: { type: 'object', properties: {
      title: { type: 'string' },
      date: { type: 'string', description: 'yyyy-MM-dd' },
      start_time: { type: 'string', description: 'HH:MM 24-hour, omit for an all-day event' },
      end_time: { type: 'string', description: 'HH:MM 24-hour. Default one hour after start.' },
      location: { type: 'string' },
      notes: { type: 'string' },
    }, required: ['title', 'date'] },
    summarize: i => `Add "${str(i.title, 200)}" to Google Calendar on ${niceDate(String(i.date))}${hm(i.start_time) ? ` at ${niceTime(hm(i.start_time))}${hm(i.end_time) ? ` to ${niceTime(hm(i.end_time))}` : ''}` : ', all day'}${str(i.location) ? `, at ${str(i.location)}` : ''}`,
    run: async ({ userId }, i) => {
      const title = str(i.title, 200)
      if (!title) throw new ToolInputError('An event needs a title')
      const r = await createEvent(userId, {
        title, date: ymd(i.date, 'date'), time: hm(i.start_time), endTime: hm(i.end_time),
        location: str(i.location, 300), notes: str(i.notes, 2000),
      })
      return { added: true, link: r.link }
    },
  },
]

export const TOOLS: JarvisTool[] = [...calendarTools]

export function toolByName(name: string): JarvisTool | undefined {
  return TOOLS.find(t => t.name === name)
}

/** Facts the model needs every time: today, now, where home is. */
export function contextLine(now = new Date()): string {
  const w = wallClock(now)
  return `Today is ${w.weekday}, ${w.date}. The time is ${w.time} (${HOME_TZ}). Home is Redwood City, California.`
}
