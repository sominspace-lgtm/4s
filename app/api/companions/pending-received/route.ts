import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Pending invites addressed to me, with the INVITER's email resolved server-side
// (the companions row only stores inviter_id, a uuid — resolving it to an
// email requires the admin client, same pattern as shared-with-me/route.ts).
export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user || !user.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows, error } = await supabase
    .from('companions')
    .select('id, inviter_id, created_at')
    .eq('invitee_email', user.email.toLowerCase())
    .eq('status', 'pending')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const admin = createAdminClient()
  const items = await Promise.all((rows ?? []).map(async r => {
    const { data } = await admin.auth.admin.getUserById(r.inviter_id)
    return {
      id: r.id,
      inviterEmail: data?.user?.email ?? 'unknown',
      createdAt: r.created_at,
    }
  }))

  return NextResponse.json({ items })
}
