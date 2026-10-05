import { NextResponse } from 'next/server'
import { googleFetch, requireGoogleUser } from '@/lib/google/server'

// Google Calendar, primary calendar (2026-10-05). GET lists a window of
// events, POST creates one, DELETE removes one. Every call is the signed-in
// person's own Google account; there is no way to name another user.
const BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

interface GEvent {
  id: string; summary?: string; description?: string; location?: string; htmlLink?: string
  start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string }
}

function fail(e: unknown) {
  if (e instanceof Error && e.message === 'not-connected') return NextResponse.json({ error: 'not-connected' }, { status: 409 })
  return NextResponse.json({ error: 'Google request failed' }, { status: 502 })
}

export async function GET(request: Request) {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const sp = new URL(request.url).searchParams
  const from = new Date(sp.get('from') ?? '')
  const to = new Date(sp.get('to') ?? '')
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  // Cap the window so a bad caller cannot page through years of events.
  if (to.getTime() - from.getTime() > 100 * 86_400_000) return NextResponse.json({ error: 'Range too large' }, { status: 400 })
  try {
    const q = new URLSearchParams({
      timeMin: from.toISOString(), timeMax: to.toISOString(),
      singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
    })
    const res = await googleFetch(who.userId, `${BASE}?${q}`)
    if (!res.ok) return NextResponse.json({ error: 'Google request failed' }, { status: 502 })
    const j = await res.json() as { items?: GEvent[] }
    const events = (j.items ?? []).map(e => ({
      id: e.id,
      title: e.summary ?? '(no title)',
      start: e.start?.dateTime ?? e.start?.date ?? '',
      end: e.end?.dateTime ?? e.end?.date ?? '',
      allDay: !e.start?.dateTime,
      location: e.location ?? null,
      link: e.htmlLink ?? null,
    })).filter(e => e.start)
    return NextResponse.json({ events })
  } catch (e) { return fail(e) }
}

export async function POST(request: Request) {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const b = await request.json().catch(() => ({})) as { title?: string; date?: string; time?: string; endTime?: string; notes?: string; location?: string }
  const title = (b.title ?? '').trim().slice(0, 200)
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(b.date ?? '')) return NextResponse.json({ error: 'title and date (yyyy-mm-dd) are required' }, { status: 400 })
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const timed = !!b.time && /^\d{2}:\d{2}$/.test(b.time)
  const end = timed && b.endTime && /^\d{2}:\d{2}$/.test(b.endTime) ? b.endTime : null
  const nextDay = new Date(`${b.date}T12:00:00`); nextDay.setDate(nextDay.getDate() + 1)
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const hourLater = (t: string) => { const [h, m] = t.split(':').map(Number); return `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}` }
  const body = {
    summary: title,
    description: (b.notes ?? '').slice(0, 2000) || undefined,
    location: (b.location ?? '').slice(0, 300) || undefined,
    start: timed ? { dateTime: `${b.date}T${b.time}:00`, timeZone: process.env.TZ || 'America/Los_Angeles' } : { date: b.date },
    end: timed
      ? { dateTime: `${b.date}T${end ?? hourLater(b.time!)}:00`, timeZone: process.env.TZ || 'America/Los_Angeles' }
      : { date: ymd(nextDay) },
  }
  void tz
  try {
    const res = await googleFetch(who.userId, BASE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) return NextResponse.json({ error: 'Google rejected the event' }, { status: 502 })
    const j = await res.json() as GEvent
    return NextResponse.json({ ok: true, id: j.id, link: j.htmlLink ?? null })
  } catch (e) { return fail(e) }
}

export async function DELETE(request: Request) {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[a-zA-Z0-9_-]{5,1024}$/.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  try {
    const res = await googleFetch(who.userId, `${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 410) return NextResponse.json({ error: 'Google request failed' }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e) { return fail(e) }
}
