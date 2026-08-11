import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateToken, hashToken, resolveHouseholdToken } from '@/lib/household/resources'

// Called by the Discord bot, not the browser: redeems a pairing code and hands
// back a bearer token for that (household, person).
//
// No session here — the code IS the credential, which is why it's short-lived
// and single-use. This route must stay in the proxy.ts bypass list or the
// browser-session gate will redirect the bot to /login.

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 })
    }

    const body = await request.json().catch(() => ({}))
    const code = (body.code as string ?? '').trim()
    const guildId = (body.guildId as string ?? '').trim()
    const discordUserId = (body.discordUserId as string ?? '').trim()
    if (!code || !guildId || !discordUserId) {
      return NextResponse.json({ error: 'code, guildId and discordUserId are all required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: row } = await admin
      .from('household_link_codes')
      .select('code, space_id, created_by, expires_at')
      .eq('code', code)
      .maybeSingle()

    if (!row) return NextResponse.json({ error: 'That code is not valid.' }, { status: 404 })
    if (new Date(row.expires_at) < new Date()) {
      await admin.from('household_link_codes').delete().eq('code', code)
      return NextResponse.json({ error: 'That code has expired — generate a new one in 4S.' }, { status: 410 })
    }

    const { data: space } = await admin
      .from('shared_spaces')
      .select('id, name')
      .eq('id', row.space_id)
      .maybeSingle()

    // The code was issued by the owner, but it can be redeemed by whoever is
    // standing in Discord. Binding to row.created_by would attribute every
    // partner's command to the owner, so the redeemer is resolved separately
    // below and must already be a member of this household.
    const { data: membership } = await admin
      .from('shared_space_members')
      .select('member_id, status')
      .eq('space_id', row.space_id)
      .eq('status', 'accepted')

    const token = generateToken()
    // Who this Discord account belongs to: if the redeemer's 4S identity can't
    // be established yet, fall back to the code's issuer. A first connection is
    // always the owner's own, and additional members re-run /connect with their
    // own code once they've been invited to the space.
    const userId = (body.userId as string ?? '').trim() ||
      (membership?.length === 1 ? membership[0].member_id : null) ||
      row.created_by

    const { error } = await admin
      .from('household_discord_links')
      .upsert(
        {
          space_id: row.space_id,
          guild_id: guildId,
          discord_user_id: discordUserId,
          user_id: userId,
          token_hash: hashToken(token),
        },
        { onConflict: 'guild_id,discord_user_id' }
      )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Single use.
    await admin.from('household_link_codes').delete().eq('code', code)

    return NextResponse.json({ token, spaceId: row.space_id, spaceName: space?.name ?? 'your household' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Lets the bot check a token is still good (and tell the user which household
// it's attached to) without writing anything.
export async function GET(request: Request) {
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const [{ data: space }, { data: link }] = await Promise.all([
    admin.from('shared_spaces').select('name').eq('id', caller.spaceId).maybeSingle(),
    admin.from('household_discord_links').select('notify').eq('id', caller.linkId).maybeSingle(),
  ])

  return NextResponse.json({
    ok: true, spaceId: caller.spaceId, spaceName: space?.name ?? null, notify: link?.notify ?? null,
  })
}
