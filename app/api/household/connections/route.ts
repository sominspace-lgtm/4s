import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Lists who's linked a Discord account to a household (spec §12's "Connected
// Services → Discord" panel). Any member can see who's connected; only the
// owner can edit notification prefs or disconnect (see [id]/route.ts).
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spaceId = new URL(request.url).searchParams.get('spaceId')
  if (!spaceId) return NextResponse.json({ error: 'spaceId is required' }, { status: 400 })

  // RLS on shared_spaces/shared_space_members already scopes this browser
  // session to spaces the caller actually belongs to.
  const { data: space } = await supabase.from('shared_spaces').select('id').eq('id', spaceId).maybeSingle()
  if (!space) return NextResponse.json({ error: 'Household not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data: links, error } = await admin
    .from('household_discord_links')
    .select('id, discord_user_id, user_id, notify, created_at, last_used_at')
    .eq('space_id', spaceId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Discord usernames aren't known to 4S (the bot never sends them) — show
  // whose 4S account it is instead, which is the identifying detail that
  // actually matters here.
  const withEmail = await Promise.all(
    (links ?? []).map(async (l) => {
      const { data } = await admin.auth.admin.getUserById(l.user_id)
      return { ...l, email: data.user?.email ?? null }
    }),
  )
  return NextResponse.json({ connections: withEmail })
}
