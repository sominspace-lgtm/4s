import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHostRecipients } from '@/lib/guest/portal'
import { sendPushToUser } from '@/lib/push/send'

// Partners pinging each other in home mode (2026-09-04) — tap the other
// figure in the village, send a push ("pick up flour" etc). Session-authed,
// unlike the guest ping route: no token, the caller IS one of the two
// people in the space. Same cooldown/per-minute throttle so it stays a
// light touch, not a doorbell either of you can lean on.

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

function clip(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t.slice(0, max) : null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }

  const reason = clip(body.reason, 60)
  const note = clip(body.note, 140)
  if (!reason && !note) return NextResponse.json({ error: 'Nothing to send' }, { status: 400 })

  // The caller's own space — same "first accepted membership" resolution
  // useSharedSpaces uses client-side, done here under the user's own RLS.
  const { data: memberRows } = await supabase
    .from('shared_space_members')
    .select('space_id, status')
    .eq('status', 'accepted')
  const { data: ownedSpaces } = await supabase.from('shared_spaces').select('id').eq('owner_id', user.id)
  const spaceId = (memberRows ?? []).map(m => m.space_id as string)[0] ?? (ownedSpaces ?? [])[0]?.id
  if (!spaceId) return NextResponse.json({ error: 'No shared space' }, { status: 404 })

  if (throttled(`${spaceId}:${user.id}`)) {
    return NextResponse.json({ error: 'They know — give it a moment.' }, { status: 429 })
  }

  const recipients = (await resolveHostRecipients(spaceId)).filter(id => id !== user.id)
  if (recipients.length === 0) return NextResponse.json({ ok: true, sent: 0 })

  const bodyText = [reason, note].filter(Boolean).join(' — ') || 'is thinking of you'

  const admin = createAdminClient()
  let sent = 0
  for (const id of recipients) {
    try {
      sent += await sendPushToUser(admin, id, {
        title: 'A message from home',
        body: bodyText,
        url: '/dashboard?section=village',
      })
    } catch {
      // VAPID unset or a delivery error — the card still says "on their way".
    }
  }

  return NextResponse.json({ ok: true, sent })
}
