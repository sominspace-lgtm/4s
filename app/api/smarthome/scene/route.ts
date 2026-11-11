import { NextResponse } from 'next/server'
import { callerFor } from '@/lib/smarthome/auth'
import { runScene } from '@/lib/smarthome/command'

// Run a saved scene (2026-11-08). Members, or a paired wall screen for its
// own household (the spaceId in the body is ignored for a screen).
export async function POST(request: Request) {
  const b = await request.json().catch(() => ({})) as { spaceId?: unknown; sceneId?: unknown }
  const caller = await callerFor(b.spaceId, true)
  if ('error' in caller) return NextResponse.json({ error: caller.error }, { status: caller.status })
  if (!caller.spaceId) return NextResponse.json({ error: 'Scenes need a household.' }, { status: 400 })
  if (typeof b.sceneId !== 'string' || b.sceneId.length > 64) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const r = await runScene(caller.spaceId, b.sceneId)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 404 })
  return NextResponse.json({ ok: true, failed: r.failed })
}
