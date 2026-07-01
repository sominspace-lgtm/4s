import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: rows, error } = await supabase
    .from('companions')
    .select('id, inviter_id, shared_sections')
    .eq('invitee_id', user.id)
    .eq('status', 'accepted')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const admin = createAdminClient()
  const items = await Promise.all((rows ?? []).map(async r => {
    const { data } = await admin.auth.admin.getUserById(r.inviter_id)
    return {
      id: r.id,
      inviterEmail: data?.user?.email ?? 'unknown',
      sharedSections: r.shared_sections ?? [],
    }
  }))

  return NextResponse.json({ items })
}
