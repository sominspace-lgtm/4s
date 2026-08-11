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

  // household_rules is the only resource here carrying updated_at.
  if (spec.table === 'household_rules') fields.updated_at = new Date().toISOString()

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
