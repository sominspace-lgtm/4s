import { NextResponse } from 'next/server'
import { callerFor } from '@/lib/smarthome/auth'
import { allOff } from '@/lib/smarthome/command'

// Turn everything off (2026-11-10): lights, plugs, switches, fans, speakers
// and TVs. A member, or the household's own wall screen, may ask.
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({})) as { spaceId?: unknown }
  const caller = await callerFor(b.spaceId, true)
  if ('error' in caller) return NextResponse.json({ error: caller.error }, { status: caller.status })
  if (!caller.spaceId) return NextResponse.json({ error: 'All off needs a household.' }, { status: 400 })
  return NextResponse.json(await allOff(caller.spaceId))
}
