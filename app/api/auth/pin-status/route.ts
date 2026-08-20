import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isProfile } from '@/lib/auth/pin'

// Tells the login page whether to show "enter your PIN" or "create your
// PIN" for a tile. A null pin_hash means nobody has claimed this profile's
// PIN yet — see pin_login_attempts.sql for why that's the "not set up"
// signal rather than a separate boolean.

export async function GET(request: Request) {
  const profile = new URL(request.url).searchParams.get('profile')
  if (!isProfile(profile)) return NextResponse.json({ error: 'Unknown profile.' }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin.from('pin_login_attempts').select('pin_hash').eq('profile', profile).maybeSingle()
  return NextResponse.json({ needsSetup: !data?.pin_hash })
}
