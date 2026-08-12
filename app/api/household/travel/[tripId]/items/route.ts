import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'
import { assertTripInSpace, assertPlaceInSpace } from '@/lib/household/travel'

interface Props {
  params: Promise<{ tripId: string }>
}

export async function POST(request: Request, { params }: Props) {
  const { tripId } = await params
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const trip = await assertTripInSpace(admin, tripId, caller)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  // A place_id from the request body is untrusted until it's confirmed to be
  // in the caller's own space — never trust it just because it parses as a uuid.
  const placeId = typeof body.place_id === 'string' ? body.place_id : null
  if (placeId && !(await assertPlaceInSpace(admin, placeId, caller))) {
    return NextResponse.json({ error: 'place_id not found in this household' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('itinerary_items')
    .insert({
      user_id: caller.userId,
      space_id: caller.spaceId,
      trip_id: tripId,
      place_id: placeId,
      title,
      item_date: typeof body.item_date === 'string' ? body.item_date : null,
      time_label: typeof body.time_label === 'string' ? body.time_label : null,
      kind: typeof body.kind === 'string' ? body.kind : 'activity',
      notes: typeof body.notes === 'string' ? body.notes : null,
    })
    .select('id, trip_id, place_id, title, item_date, time_label, sort_order, kind, notes, done, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
