import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveGathering, resolveHostRecipients, clip } from '@/lib/guest/portal'
import { sendPushToUser } from '@/lib/push/send'

// "Find a host" — a guest taps Sylvia or Harry (on the wall or their
// phone) and that host's phone buzzes. NOT a contribution: nothing is
// written to guest_contributions, nothing reaches the keepsake. The
// gathering token is the only credential.
//
// GET returns { hosts: [{name}] } so the wall can label the picker
// (symmetry with the vote route's GET).

const recent = new Map<string, number[]>()
const COOLDOWN_MS = 8000
const PER_MIN = 6

function throttled(key: string): boolean {
  const now = Date.now()
  const hits = (recent.get(key) ?? []).filter(t => now - t < 60_000)
  if (hits.length && now - hits[hits.length - 1] < COOLDOWN_MS) return true
  if (hits.length >= PER_MIN) return true
  hits.push(now)
  recent.set(key, hits)
  return false
}

interface Props { params: Promise<{ token: string }> }

export async function GET(_request: Request, { params }: Props) {
  const { token } = await params
  const g = await resolveGathering(token, { full: true })
  if (!g) return NextResponse.json({ error: 'This gathering link is not valid.' }, { status: 404 })
  return NextResponse.json({ hosts: g.hosts })
}

export async function POST(request: Request, { params }: Props) {
  const { token } = await params
  const g = await resolveGathering(token)
  if (!g) return NextResponse.json({ error: 'This gathering link is not valid.' }, { status: 404 })
  if (!g.active) return NextResponse.json({ error: 'This gathering has ended.' }, { status: 410 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }

  const who = body.who === 'host1' || body.who === 'host2' ? body.who : 'both'
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon'
  if (throttled(`${g.id}:${ip}:${who}`)) {
    return NextResponse.json({ error: 'They know — give them a moment.' }, { status: 429 })
  }

  const guestName = clip(body.guest_name, 40)
  const reason = clip(body.reason, 60)
  const note = clip(body.note, 140)
  const from = typeof body.from === 'string' ? body.from : null

  let recipients = await resolveHostRecipients(g.spaceId)
  if (who === 'host1') recipients = recipients.slice(0, 1)
  else if (who === 'host2') recipients = recipients.slice(1, 2)
  // Don't ping the person who tapped (the wall runs as a host session).
  recipients = recipients.filter(id => id !== from)
  if (recipients.length === 0) {
    // Fall back to everyone but the tapper.
    recipients = (await resolveHostRecipients(g.spaceId)).filter(id => id !== from)
  }

  const bodyText = [guestName ? `${guestName}:` : 'A guest:', reason || 'is looking for you', note ? `— ${note}` : '']
    .filter(Boolean)
    .join(' ')

  const admin = createAdminClient()
  let sent = 0
  for (const id of recipients) {
    try {
      sent += await sendPushToUser(admin, id, {
        title: 'A guest is looking for you',
        body: bodyText,
        url: '/dashboard?section=village',
      })
    } catch {
      // VAPID unset or a delivery error — the guest still hears "on their way".
    }
  }

  return NextResponse.json({ ok: true, sent })
}
