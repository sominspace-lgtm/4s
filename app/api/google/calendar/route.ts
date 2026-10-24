import { NextResponse } from 'next/server'
import { googleFetch, inSharedMode, requireGoogleAccess } from '@/lib/google/server'
import { sharedCalendarEvents } from '@/lib/google/shares'
import { createClient } from '@/lib/supabase/server'
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
  if (e instanceof GoogleError) return NextResponse.json({ error: e.message }, { status: 502 })
  return NextResponse.json({ error: 'Google request failed' }, { status: 502 })
}

export async function GET(request: Request) {
  // Calendars someone chose to share (2026-10-24): ?account=partner is the
  // other person's (when signed in as yourself); ?account=members is what
  // each of you shows on the shared screen (only on the shared screen).
  const acc = new URL(request.url).searchParams.get('account')
  if (acc === 'partner' || acc === 'members') {
    const { data: { user } } = await (await createClient()).auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const shared = await inSharedMode()
    if ((acc === 'partner') === shared) return NextResponse.json({ events: [] })
    const sp0 = new URL(request.url).searchParams
    const f0 = new Date(sp0.get('from') ?? ''), t0 = new Date(sp0.get('to') ?? '')
    if (Number.isNaN(f0.getTime()) || Number.isNaN(t0.getTime()) || t0.getTime() - f0.getTime() > 100 * 86_400_000) return NextResponse.json({ error: 'Bad range' }, { status: 400 })
    try {
      return NextResponse.json({ events: await sharedCalendarEvents(user.id, acc === 'partner' ? 'partner' : 'household', f0, t0) })
    } catch { return NextResponse.json({ events: [] }) }
  }
  const who = await requireGoogleAccess(acc)
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const gid = who.owner
  const sp = new URL(request.url).searchParams
  const from = new Date(sp.get('from') ?? '')
  const to = new Date(sp.get('to') ?? '')
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  // Cap the window so a bad caller cannot page through years of events.
  if (to.getTime() - from.getTime() > 100 * 86_400_000) return NextResponse.json({ error: 'Range too large' }, { status: 400 })
  try {
    return NextResponse.json({ events: await listEvents(gid, from, to) })
  } catch (e) { return fail(e) }
}

export async function POST(request: Request) {
  const who = await requireGoogleAccess(new URL(request.url).searchParams.get('account'))
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const gid = who.owner
  const b = await request.json().catch(() => ({})) as { title?: string; date?: string; time?: string; endTime?: string; notes?: string; location?: string }
  const title = (b.title ?? '').trim().slice(0, 200)
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(b.date ?? '')) return NextResponse.json({ error: 'title and date (yyyy-mm-dd) are required' }, { status: 400 })
  try {
    const r = await createEvent(gid, { title, date: b.date!, time: b.time ?? null, endTime: b.endTime ?? null, notes: b.notes ?? null, location: b.location ?? null })
    return NextResponse.json({ ok: true, id: r.id, link: r.link })
  } catch (e) { return fail(e) }
}

export async function DELETE(request: Request) {
  const who = await requireGoogleAccess(new URL(request.url).searchParams.get('account'))
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status })
  const gid = who.owner
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[a-zA-Z0-9_-]{5,1024}$/.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  try {
    const res = await googleFetch(gid, `${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 410) return NextResponse.json({ error: 'Google request failed' }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch (e) { return fail(e) }
}
