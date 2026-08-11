import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RESOURCES, isResource, pick, resolveHouseholdToken } from '@/lib/household/resources'

// Household read/write for the Discord bot. One space, one resource, nothing
// else — see lib/household/resources.ts for why the table list is hardcoded.

interface Props {
  params: Promise<{ resource: string }>
}

export async function GET(request: Request, { params }: Props) {
  const { resource } = await params
  if (!isResource(resource)) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })

  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spec = RESOURCES[resource]
  const admin = createAdminClient()
  const { data, error } = await admin
    .from(spec.table)
    .select(spec.columns)
    .eq('space_id', caller.spaceId)
    .order(spec.order, { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

export async function POST(request: Request, { params }: Props) {
  const { resource } = await params
  if (!isResource(resource)) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 })

  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spec = RESOURCES[resource]
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const fields = pick(body, spec.insert)
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Nothing to save' }, { status: 400 })
  }

  // space_id and user_id come from the token, never from the request body —
  // otherwise a bot bug (or a stolen token) could write into another household.
  const admin = createAdminClient()
  const { data, error } = await admin
    .from(spec.table)
    .insert({ ...fields, space_id: caller.spaceId, user_id: caller.userId })
    .select(spec.columns)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ item: data }, { status: 201 })
}
