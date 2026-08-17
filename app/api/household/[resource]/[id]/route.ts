import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RESOURCES, isResource, pick, resolveHouseholdToken } from '@/lib/household/resources'

// Updating one household row from Discord: ticking a shopping item off, marking
// a chore done, retiring a house rule.

interface Props {
  params: Promise<{ resource: string; id: string }>
}

export async function PATCH(request: Request, { params }: Props) {
  const { resource, id } = await params
  if (!isResource(resource)) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })

  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spec = RESOURCES[resource]
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const fields = pick(body, spec.update)
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  // Only these resources carry updated_at.
  if (spec.table === 'household_rules' || spec.table === 'household_watchlist' || spec.table === 'places' || spec.table === 'preferences') {
    fields.updated_at = new Date().toISOString()
  }

  // The space_id filter is what stops a token for one household from editing
  // another's row by guessing a uuid. Without it, a valid token plus any id
  // would be enough.
  const admin = createAdminClient()
  const { data, error } = await admin
    .from(spec.table)
    .update(fields)
    .eq('id', id)
    .eq('space_id', caller.spaceId)
    .select(spec.columns)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ item: data })
}

// Removing a row entirely — used for watchlist/date-idea deletes from Discord,
// which don't have a 4S soft-delete concept the way rules go inactive.
export async function DELETE(request: Request, { params }: Props) {
  const { resource, id } = await params
  if (!isResource(resource)) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })

  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spec = RESOURCES[resource]
  const admin = createAdminClient()
  const { error, count } = await admin
    .from(spec.table)
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('space_id', caller.spaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!count) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
