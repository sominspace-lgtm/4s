import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeCode, isExpired } from '@/lib/devices/token'
import { spacesFor } from '@/lib/devices/members'

// A signed-in member says yes to the screen showing this code (2026-11-08).
// The household is checked on the server against their real membership.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  const b = await request.json().catch(() => ({})) as { code?: unknown; name?: unknown; spaceId?: unknown }
  const code = normalizeCode(b.code)
  const name = (typeof b.name === 'string' ? b.name.trim().slice(0, 40) : '') || 'Wall screen'
  const spaceId = typeof b.spaceId === 'string' ? b.spaceId : ''
  if (!code) return NextResponse.json({ error: 'That code does not look right.' }, { status: 400 })

  const spaces = await spacesFor(user.id)
  if (!spaces.some(s => s.id === spaceId)) return NextResponse.json({ error: 'You are not in that household.' }, { status: 403 })

  const admin = createAdminClient()
  const { data: req } = await admin.from('device_pair_requests')
    .select('id, expires_at, device_id').eq('code', code).maybeSingle()
  if (!req || isExpired(req.expires_at)) return NextResponse.json({ error: 'This code has expired. Refresh the screen for a new one.' }, { status: 410 })
  if (req.device_id) return NextResponse.json({ error: 'This screen is already approved.' }, { status: 409 })

  const { data: device, error } = await admin.from('home_devices')
    .insert({ space_id: spaceId, name, added_by: user.id }).select('id').single()
  if (error || !device) return NextResponse.json({ error: 'Could not add the screen.' }, { status: 500 })

  const { data: linked } = await admin.from('device_pair_requests')
    .update({ device_id: device.id, approved_by: user.id })
    .eq('id', req.id).is('device_id', null).select('id').maybeSingle()
  if (!linked) {
    await admin.from('home_devices').delete().eq('id', device.id)
    return NextResponse.json({ error: 'This screen is already approved.' }, { status: 409 })
  }
  return NextResponse.json({ ok: true })
}
