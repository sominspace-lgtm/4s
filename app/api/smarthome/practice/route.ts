import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callerFor } from '@/lib/smarthome/auth'
import { PRACTICE_DEVICES, isOn } from '@/lib/smarthome/capabilities'

// Set up or clear the Practice home (2026-11-08): pretend devices across a
// few rooms, so the Controller can be tried before any hub is connected.
// Clearing only ever removes devices marked as practice in this household.
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({})) as { spaceId?: unknown; action?: unknown }
  const caller = await callerFor(b.spaceId, false)
  if ('error' in caller) return NextResponse.json({ error: caller.error }, { status: caller.status })
  if (caller.as !== 'member' || !caller.spaceId) return NextResponse.json({ error: 'The practice home needs a household.' }, { status: 400 })

  const admin = createAdminClient()
  const mine = admin.from('household_smarthome_devices')

  if (b.action === 'add') {
    const { count } = await admin.from('household_smarthome_devices').select('id', { count: 'exact', head: true })
      .eq('space_id', caller.spaceId).eq('provider', 'practice')
    if ((count ?? 0) > 0) return NextResponse.json({ ok: true })
    const rows = PRACTICE_DEVICES.map(d => ({
      user_id: caller.userId, space_id: caller.spaceId, name: d.name, room: d.room, kind: d.kind,
      provider: 'practice', state: d.state, on_state: isOn(d.kind, d.state), category: d.room,
    }))
    const { error } = await mine.insert(rows)
    if (error) return NextResponse.json({ error: error.code === '42703' || error.code === 'PGRST204' ? 'The Controller needs its database update first.' : 'Could not set it up.' }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (b.action === 'remove') {
    await mine.delete().eq('space_id', caller.spaceId).eq('provider', 'practice')
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
