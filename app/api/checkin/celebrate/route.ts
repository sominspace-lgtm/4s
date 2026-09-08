import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHostRecipients } from '@/lib/guest/portal'
import { sendPushToUser } from '@/lib/push/send'
import { weekOfSunday } from '@/lib/utils/checkinQuestions'

// Called after a check-in is submitted (2026-09-08). If that completes the
// pair — everyone in the space has checked in this week — push both people
// a little "you're both done" note. Deduped per week via push_notify_state
// so the second person's submit is the only one that ever sends, and it
// sends exactly once.

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: memberRows } = await supabase
    .from('shared_space_members').select('space_id, status').eq('status', 'accepted')
  const { data: ownedSpaces } = await supabase.from('shared_spaces').select('id').eq('owner_id', user.id)
  const spaceId = (memberRows ?? []).map(m => m.space_id as string)[0] ?? (ownedSpaces ?? [])[0]?.id
  if (!spaceId) return NextResponse.json({ ok: true, sent: 0 })

  const week = weekOfSunday()
  const admin = createAdminClient()

  const people = await resolveHostRecipients(spaceId)
  if (people.length < 2) return NextResponse.json({ ok: true, sent: 0 }) // solo — nothing to celebrate together

  const { data: rows } = await admin
    .from('checkins').select('user_id').eq('space_id', spaceId).gte('week_of', week)
    .in('user_id', people)
  const done = new Set((rows ?? []).map(r => r.user_id as string))
  if (!people.every(id => done.has(id))) return NextResponse.json({ ok: true, sent: 0, pending: true })

  // Dedupe on one shared key stored against the caller — the pair only
  // completes once per week, and the second submit is what runs this.
  const dedupeKey = `checkin-both:${week}`
  const { data: stateRow } = await admin
    .from('push_notify_state').select('last_sent').eq('user_id', user.id).maybeSingle()
  const sent: Record<string, string> = (stateRow?.last_sent as Record<string, string> | null) ?? {}
  if (sent[dedupeKey]) return NextResponse.json({ ok: true, sent: 0, already: true })

  let count = 0
  for (const id of people) {
    try {
      count += await sendPushToUser(admin, id, {
        title: '4S',
        body: "You've both checked in this week.",
        url: '/dashboard',
      })
    } catch { /* VAPID unset / delivery error — not fatal */ }
  }

  const today = new Date().toISOString().slice(0, 10)
  await admin.from('push_notify_state').upsert({ user_id: user.id, last_sent: { ...sent, [dedupeKey]: today } })

  return NextResponse.json({ ok: true, sent: count })
}
