import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'
import { assertTripInSpace, assertPlaceInSpace } from '@/lib/household/travel'

interface Props {
  params: Promise<{ tripId: string }>
}

// The shortlist — "places we might want on this trip", separate from the
// dated itinerary (see supabase/migrations/places_travel.sql for why).

export async function POST(request: Request, { params }: Props) {
  const { tripId } = await params
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const trip = await assertTripInSpace(admin, tripId, caller)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const placeId = typeof body.place_id === 'string' ? body.place_id : ''
  if (!placeId || !(await assertPlaceInSpace(admin, placeId, caller))) {
    return NextResponse.json({ error: 'place_id not found in this household' }, { status: 400 })
  }

  // Idempotent on purpose (unique(trip_id, place_id) in the schema) — "add
  // that restaurant to our trip" arriving twice, from Discord and the web at
  // once, should not error, just no-op the second time.
  const { data, error } = await admin
    .from('trip_places')
    .upsert(
      { user_id: caller.userId, space_id: caller.spaceId, trip_id: tripId, place_id: placeId, note: typeof body.note === 'string' ? body.note : null },
      { onConflict: 'trip_id,place_id' },
    )
    .select('id, trip_id, place_id, note, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}

export async function DELETE(request: Request, { params }: Props) {
  const { tripId } = await params
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const trip = await assertTripInSpace(admin, tripId, caller)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const placeId = typeof body.place_id === 'string' ? body.place_id : ''
  if (!placeId) return NextResponse.json({ error: 'place_id is required' }, { status: 400 })

  const { error, count } = await admin
    .from('trip_places')
    .delete({ count: 'exact' })
    .eq('trip_id', tripId)
    .eq('place_id', placeId)
    .eq('space_id', caller.spaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
