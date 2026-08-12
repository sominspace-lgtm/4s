import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'

// List / create trips for the Discord bot's household. Bespoke rather than
// in RESOURCES because trips carry children (places, itinerary, budget) that
// a flat allowlist entry can't express safely — see lib/household/travel.ts.

export async function GET(request: Request) {
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('trips')
    .select('id, title, destination, start_date, end_date, status, created_at')
    .eq('space_id', caller.spaceId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request) {
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('trips')
    .insert({
      user_id: caller.userId,
      space_id: caller.spaceId,
      title,
      destination: typeof body.destination === 'string' ? body.destination : null,
      start_date: typeof body.start_date === 'string' ? body.start_date : null,
      end_date: typeof body.end_date === 'string' ? body.end_date : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
    })
    .select('id, title, destination, start_date, end_date, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
