import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Issues a short pairing code for a household. Same shape as
// app/api/alexa/link-code/route.ts — the person runs /connect <code> once in
// Discord and their account is bound.
//
// Owner-only (spec §13): shared_space_members has no role column, so the
// household admin is shared_spaces.owner_id. Members can use the integration;
// only the owner can create or revoke the connection.

const CODE_TTL_MINUTES = 15

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 })
    }

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const spaceId = (body.spaceId as string ?? '').trim()
    if (!spaceId) return NextResponse.json({ error: 'spaceId is required' }, { status: 400 })

    // RLS would let any member read the space; ownership is the check that
    // matters here, so assert it explicitly rather than relying on the policy.
    const { data: space } = await supabase
      .from('shared_spaces')
      .select('id, name, owner_id')
      .eq('id', spaceId)
      .maybeSingle()
    if (!space) return NextResponse.json({ error: 'Household not found' }, { status: 404 })
    if (space.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only the household owner can connect Discord.' }, { status: 403 })
    }

    const admin = createAdminClient()
    await admin.from('household_link_codes').delete().eq('space_id', spaceId)

    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString()
    let lastError = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = String(Math.floor(100000 + Math.random() * 900000))
      const { error } = await admin
        .from('household_link_codes')
        .insert({ code, space_id: spaceId, created_by: user.id, expires_at: expiresAt })
      if (!error) return NextResponse.json({ code, expiresAt, space: space.name })
      lastError = error.message
      // A schema error won't be fixed by retrying — only collisions are worth another go.
      if (!/duplicate key|unique/i.test(error.message)) break
    }
    return NextResponse.json({ error: lastError || 'Could not generate a code, try again.' }, { status: 500 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
