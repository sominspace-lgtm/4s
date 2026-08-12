import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'
import { assertTripInSpace, loadTripBundle } from '@/lib/household/travel'

interface Props {
  params: Promise<{ tripId: string }>
}

// The full bundle in one response — trip + shortlisted places + itinerary +
// budget — because Discord renders a trip as a single embed and the bot's
// default 8s timeout can't absorb four sequential round trips.
export async function GET(request: Request, { params }: Props) {
  const { tripId } = await params
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bundle = await loadTripBundle(createAdminClient(), tripId, caller)
  if (!bundle) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(bundle)
}

export async function PATCH(request: Request, { params }: Props) {
  const { tripId } = await params
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const trip = await assertTripInSpace(admin, tripId, caller)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const fields: Record<string, unknown> = {}
  for (const key of ['title', 'destination', 'start_date', 'end_date', 'status', 'notes'] as const) {
    if (body[key] !== undefined) fields[key] = body[key]
  }
  if (Object.keys(fields).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  fields.updated_at = new Date().toISOString()

  const { data, error } = await admin
    .from('trips')
    .update(fields)
    .eq('id', tripId)
    .eq('space_id', caller.spaceId)
    .select('id, title, destination, start_date, end_date, status, notes, created_at')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ item: data })
}

export async function DELETE(request: Request, { params }: Props) {
  const { tripId } = await params
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { error, count } = await admin
    .from('trips')
    .delete({ count: 'exact' })
    .eq('id', tripId)
    .eq('space_id', caller.spaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
