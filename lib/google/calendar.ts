import { googleFetch } from './server'
import { HOME_TZ } from '@/lib/jarvis/time'

// Google Calendar, primary calendar (2026-10-18). Shared by the Calendar API
// route and Jarvis, so both speak to Google the same way. Server-only: it
// reaches tokens through ./server.

const BASE = 'https://www.googleapis.com/calendar/v3'

export interface CalEvent {
  id: string; title: string; start: string; end: string; allDay: boolean
  location: string | null; link: string | null
  /** The event's description (2026-10-24, for the event sheet). */
  notes?: string | null
}

interface GEvent {
  id: string; summary?: string; location?: string; htmlLink?: string; description?: string
  start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }
}

export class GoogleError extends Error {
  constructor(public code: 'not-connected' | 'missing-scope' | 'rate-limited' | 'failed', message: string) { super(message) }
}

/** Turn a Google response status into one plain error. */
export async function checked(res: Response): Promise<Response> {
  if (res.ok) return res
  if (res.status === 403) {
    const t = await res.text().catch(() => '')
    // An API never switched on in the Google Cloud project (2026-10-24).
    if (/accessNotConfigured|SERVICE_DISABLED|has not been used|is disabled/i.test(t)) {
      const api = /gmail/i.test(t) ? 'Gmail API' : /drive/i.test(t) ? 'Google Drive API' : /tasks/i.test(t) ? 'Google Tasks API' : /photospicker/i.test(t) ? 'Google Photos Picker API' : 'Google Calendar API'
      throw new GoogleError('failed', `The ${api} is switched off in your Google Cloud project. Turn it on in APIs & Services → Library, then try again.`)
    }
    if (/insufficient|scope/i.test(t)) throw new GoogleError('missing-scope', 'Google has not given 4S permission for this yet. Reconnect Google in Connect.')
    if (/rate|quota/i.test(t)) throw new GoogleError('rate-limited', 'Google says to slow down. Try again in a minute.')
  }
  if (res.status === 429) throw new GoogleError('rate-limited', 'Google says to slow down. Try again in a minute.')
  if (res.status === 401) throw new GoogleError('not-connected', 'Google needs you to connect again in Connect.')
  throw new GoogleError('failed', `Google returned an error (${res.status}).`)
}

export async function gfetch(userId: string, url: string, init?: RequestInit): Promise<Response> {
  try {
    return await checked(await googleFetch(userId, url, init))
  } catch (e) {
    if (e instanceof GoogleError) throw e
    if (e instanceof Error && e.message === 'not-connected') throw new GoogleError('not-connected', 'Google is not connected. Connect it from the ⋯ menu, then Connect.')
    throw new GoogleError('failed', 'Could not reach Google.')
  }
}

export async function listEvents(userId: string, from: Date, to: Date): Promise<CalEvent[]> {
  const q = new URLSearchParams({
    timeMin: from.toISOString(), timeMax: to.toISOString(),
    singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
  })
  const res = await gfetch(userId, `${BASE}/calendars/primary/events?${q}`)
  const j = await res.json() as { items?: GEvent[] }
  return (j.items ?? []).map(e => ({
    id: e.id,
    title: e.summary ?? '(no title)',
    start: e.start?.dateTime ?? e.start?.date ?? '',
    end: e.end?.dateTime ?? e.end?.date ?? '',
    allDay: !e.start?.dateTime,
    location: e.location ?? null,
    link: e.htmlLink ?? null,
    notes: e.description ? e.description.slice(0, 2000) : null,
  })).filter(e => e.start)
}

export interface NewEvent { title: string; date: string; time?: string | null; endTime?: string | null; notes?: string | null; location?: string | null }

export function eventBody(b: NewEvent) {
  const timed = !!b.time && /^\d{2}:\d{2}$/.test(b.time)
  const end = timed && b.endTime && /^\d{2}:\d{2}$/.test(b.endTime) ? b.endTime : null
  const nextDay = new Date(`${b.date}T12:00:00Z`); nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const hourLater = (t: string) => { const [h, m] = t.split(':').map(Number); return `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
  return {
    summary: b.title.trim().slice(0, 200),
    description: (b.notes ?? '').slice(0, 2000) || undefined,
    location: (b.location ?? '').slice(0, 300) || undefined,
    start: timed ? { dateTime: `${b.date}T${b.time}:00`, timeZone: HOME_TZ } : { date: b.date },
    end: timed
      ? { dateTime: `${b.date}T${end ?? hourLater(b.time!)}:00`, timeZone: HOME_TZ }
      : { date: nextDay.toISOString().slice(0, 10) },
  }
}

export async function createEvent(userId: string, b: NewEvent): Promise<{ id: string; link: string | null }> {
  if (!b.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) throw new GoogleError('failed', 'An event needs a title and a date.')
  const res = await gfetch(userId, `${BASE}/calendars/primary/events`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(eventBody(b)),
  })
  const j = await res.json() as GEvent
  if (!j.id) throw new GoogleError('failed', 'Google did not confirm the event.')
  return { id: j.id, link: j.htmlLink ?? null }
}

/** Change an event (2026-10-24): the whole event is rewritten from the form. */
export async function updateEvent(userId: string, id: string, b: NewEvent): Promise<void> {
  if (!/^[a-zA-Z0-9_-]{5,1024}$/.test(id)) throw new GoogleError('failed', 'That is not an event id.')
  if (!b.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(b.date)) throw new GoogleError('failed', 'An event needs a title and a date.')
  await gfetch(userId, `${BASE}/calendars/primary/events/${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(eventBody(b)),
  })
}

/** Busy blocks on the primary calendar between two instants. */
export async function busyBlocks(userId: string, from: Date, to: Date): Promise<{ start: string; end: string }[]> {
  const res = await gfetch(userId, `${BASE}/freeBusy`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: HOME_TZ, items: [{ id: 'primary' }] }),
  })
  const j = await res.json() as { calendars?: Record<string, { busy?: { start: string; end: string }[] }> }
  return j.calendars?.primary?.busy ?? []
}
