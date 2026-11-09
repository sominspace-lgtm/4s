import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentDevice } from '@/lib/devices/session'
import { DEVICE_COOKIE } from '@/lib/devices/token'

// What this paired screen is (2026-11-08): its name and its household's
// name, nothing else. DELETE forgets the pairing on this screen only.
export async function GET() {
  const device = await currentDevice()
  if (!device) return NextResponse.json({ paired: false }, { status: 401 })
  const { data: space } = await createAdminClient().from('shared_spaces').select('name').eq('id', device.spaceId).maybeSingle()
  return NextResponse.json({ paired: true, name: device.name, mode: device.mode, household: space?.name ?? null })
}

export async function DELETE() {
  const device = await currentDevice()
  if (device) {
    await createAdminClient().from('home_devices').update({ revoked_at: new Date().toISOString(), token_hash: null }).eq('id', device.id)
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(DEVICE_COOKIE)
  return res
}
