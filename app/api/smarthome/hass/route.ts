import { NextResponse } from 'next/server'
import { callerFor } from '@/lib/smarthome/auth'
import { linkFor, connectHA, syncHA, disconnectHA } from '@/lib/smarthome/hass'

// Home Assistant for one household (2026-11-10). Members only.
//   GET     is it connected, which address, when it last synced (never the key)
//   POST    { action: 'connect', url, token }  or  { action: 'sync' }
//   DELETE  disconnect: forget the key and take its devices off

async function member(spaceId: unknown) {
  const caller = await callerFor(spaceId, false)
  if ('error' in caller) return { res: NextResponse.json({ error: caller.error }, { status: caller.status }) }
  if (caller.as !== 'member' || !caller.spaceId) return { res: NextResponse.json({ error: 'Home Assistant needs a household.' }, { status: 400 }) }
  return { spaceId: caller.spaceId, userId: caller.userId }
}

export async function GET(request: Request) {
  const m = await member(new URL(request.url).searchParams.get('spaceId'))
  if ('res' in m) return m.res
  const link = await linkFor(m.spaceId)
  return NextResponse.json({ connected: !!link, address: link?.base_url ?? null, syncedAt: link?.synced_at ?? null })
}

export async function POST(request: Request) {
  const b = await request.json().catch(() => ({})) as { spaceId?: unknown; action?: unknown; url?: unknown; token?: unknown }
  const m = await member(b.spaceId)
  if ('res' in m) return m.res
  if (b.action === 'connect') {
    if (typeof b.url !== 'string' || typeof b.token !== 'string') return NextResponse.json({ error: 'Fill in the address and the key.' }, { status: 400 })
    const err = await connectHA(m.spaceId, m.userId, b.url, b.token)
    if (err) return NextResponse.json({ error: err }, { status: 400 })
  } else if (b.action !== 'sync') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
  const r = await syncHA(m.spaceId)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 502 })
  return NextResponse.json({ ok: true, count: r.count })
}

export async function DELETE(request: Request) {
  const m = await member(new URL(request.url).searchParams.get('spaceId'))
  if ('res' in m) return m.res
  await disconnectHA(m.spaceId)
  return NextResponse.json({ ok: true })
}
