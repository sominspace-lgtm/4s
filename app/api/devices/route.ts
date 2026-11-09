import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { spacesFor } from '@/lib/devices/members'

// The screens paired to your households (2026-11-08). Never returns key hashes.
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const spaces = await spacesFor(user.id)
  if (spaces.length === 0) return NextResponse.json({ devices: [], spaces })
  const { data, error } = await createAdminClient().from('home_devices')
    .select('id, space_id, name, mode, created_at, last_seen_at')
    .in('space_id', spaces.map(s => s.id))
    .is('revoked_at', null)
    .not('token_hash', 'is', null)
    .order('created_at')
  if (error) return NextResponse.json({ devices: [], spaces, setupNeeded: error.code === '42P01' || error.code === 'PGRST205' })
  return NextResponse.json({ devices: data ?? [], spaces })
}
