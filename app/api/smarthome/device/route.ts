import { NextResponse } from 'next/server'
import { callerFor } from '@/lib/smarthome/auth'
import { setDevice } from '@/lib/smarthome/command'

// Change one device (2026-11-08). Members only: a wall screen can run scenes
// but never reach into a single device.
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({})) as { spaceId?: unknown; deviceId?: unknown; change?: unknown }
  const caller = await callerFor(b.spaceId, false)
  if ('error' in caller) return NextResponse.json({ error: caller.error }, { status: caller.status })
  if (caller.as !== 'member') return NextResponse.json({ error: 'Not allowed.' }, { status: 403 })
  if (typeof b.deviceId !== 'string' || !/^[0-9a-f-]{36}$/i.test(b.deviceId)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const scope = caller.spaceId ? { spaceId: caller.spaceId } : { userId: caller.userId }
  const r = await setDevice(scope, b.deviceId, b.change)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  return NextResponse.json({ ok: true, state: r.state })
}
