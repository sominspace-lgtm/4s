import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'
import { assertTripInSpace } from '@/lib/household/travel'

interface Props {
  params: Promise<{ tripId: string; id: string }>
}

export async function PATCH(request: Request, { params }: Props) {
  const { tripId, id } = await params
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const trip = await assertTripInSpace(admin, tripId, caller)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const fields: Record<string, unknown> = {}
  for (const key of ['title', 'item_date', 'time_label', 'sort_order', 'kind', 'notes', 'done'] as const) {
    if (body[key] !== undefined) fields[key] = body[key]
  }
  if (Object.keys(fields).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  // Scoped through trip_id AND space_id, not just id — an item's scope is
  // its trip's scope, and trip_id here has already been proven to belong to
  // this space above, so this pins the row to that exact trip too.
  const { data, error } = await admin
    .from('itinerary_items')
    .update(fields)
    .eq('id', id)
    .eq('trip_id', tripId)
    .eq('space_id', caller.spaceId)
    .select('id, trip_id, place_id, title, item_date, time_label, sort_order, kind, notes, done, created_at')
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
    .from('itinerary_items')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('trip_id', tripId)
    .eq('space_id', caller.spaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
