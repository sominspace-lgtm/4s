import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'
import { assertTripInSpace } from '@/lib/household/travel'

interface Props {
  params: Promise<{ tripId: string; id: string }>
}

// The PATCH/DELETE half of budget/route.ts's POST — needed for the bot's
// /trip pay and /trip remove-cost commands (toggling paid, correcting an
// amount, deleting a line). `source` is deliberately not in the allowed
// field list below, same reasoning as the POST route: a bot token can never
// turn a real entry into an 'ai-estimate' or vice versa.
export async function PATCH(request: Request, { params }: Props) {
  const { tripId, id } = await params
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const trip = await assertTripInSpace(admin, tripId, caller)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const fields: Record<string, unknown> = {}
  for (const key of ['label', 'category', 'amount', 'paid'] as const) {
    if (body[key] !== undefined) fields[key] = body[key]
  }
  if (Object.keys(fields).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  // Scoped through trip_id AND space_id, same pattern as itinerary items/[id]
  // — an entry's scope is its trip's scope, already proven above.
  const { data, error } = await admin
    .from('trip_budget_items')
    .update(fields)
    .eq('id', id)
    .eq('trip_id', tripId)
    .eq('space_id', caller.spaceId)
    .select('id, trip_id, label, category, amount, currency, source, confidence, estimate_basis, paid, created_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: Request, { params }: Props) {
  const { tripId, id } = await params
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const trip = await assertTripInSpace(admin, tripId, caller)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { error, count } = await admin
    .from('trip_budget_items')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('trip_id', tripId)
    .eq('space_id', caller.spaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
