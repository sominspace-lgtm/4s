import { NextResponse } from 'next/server'
import { googleFetch, requireGoogleUser } from '@/lib/google/server'
import { listEvents, createEvent, GoogleError } from '@/lib/google/calendar'

// Google Calendar, primary calendar (2026-10-05). GET lists a window of
// events, POST creates one, DELETE removes one. Every call is the signed-in
// person's own Google account; there is no way to name another user. The
// Google calls themselves live in lib/google/calendar.ts (2026-10-18), shared
// with Jarvis.
const BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

function fail(e: unknown) {
  if (e instanceof GoogleError && e.code === 'not-connected') return NextResponse.json({ error: 'not-connected' }, { status: 409 })
  if (e instanceof Error && e.message === 'not-connected') return NextResponse.json({ error: 'not-connected' }, { status: 409 })
  if (e instanceof GoogleError && e.code === 'rate-limited') return NextResponse.json({ error: e.message }, { status: 429 })
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
    return NextResponse.json({ events: await listEvents(who.userId, from, to) })
  } catch (e) { return fail(e) }
}

export async function POST(request: Request) {
  const who = await requireGoogleUser()
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const b = await request.json().catch(() => ({})) as { title?: string; date?: string; time?: string; endTime?: string; notes?: string; location?: string }
  const title = (b.title ?? '').trim().slice(0, 200)
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(b.date ?? '')) return NextResponse.json({ error: 'title and date (yyyy-mm-dd) are required' }, { status: 400 })
  try {
    const r = await createEvent(who.userId, { title, date: b.date!, time: b.time ?? null, endTime: b.endTime ?? null, notes: b.notes ?? null, location: b.location ?? null })
    return NextResponse.json({ ok: true, id: r.id, link: r.link })
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
