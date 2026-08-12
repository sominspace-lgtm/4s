import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'
import { assertTripInSpace } from '@/lib/household/travel'

interface Props {
  params: Promise<{ tripId: string }>
}

// `source` is NEVER read from the request body — it is hardcoded to 'user'
// below. The bot has no path to writing an 'ai-estimate' row; only the (not
// yet built) AI assistant executor can do that, and even it can only reach
// this data through its own validated write path, never this route. That is
// what stops a bot bug or a stolen token from putting a machine-guessed
// number in front of someone labeled as if they'd typed it themselves.
export async function POST(request: Request, { params }: Props) {
  const { tripId } = await params
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const trip = await assertTripInSpace(admin, tripId, caller)
  if (!trip) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const label = typeof body.label === 'string' ? body.label.trim() : ''
  const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount)
  if (!label || !Number.isFinite(amount)) {
    return NextResponse.json({ error: 'label and amount are required' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('trip_budget_items')
    .insert({
      user_id: caller.userId,
      space_id: caller.spaceId,
      trip_id: tripId,
      label,
      category: typeof body.category === 'string' ? body.category : 'other',
      amount,
      currency: typeof body.currency === 'string' ? body.currency : 'USD',
      source: 'user',
      paid: body.paid === true,
    })
    .select('id, trip_id, label, category, amount, currency, source, confidence, estimate_basis, paid, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
