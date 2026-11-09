import { NextResponse } from 'next/server'
import { currentDevice } from '@/lib/devices/session'
import { homeSnapshot } from '@/lib/home/snapshot'

// The paired wall screen refreshes its picture from here (2026-11-08). The
// screen's own key picks the household; nothing in the request can name
// another one. `today` is the screen's local date, used for tonight's dinner.
export async function GET(request: Request) {
  const device = await currentDevice()
  if (!device) return NextResponse.json({ error: 'This screen is not paired.' }, { status: 401 })
  const today = new URL(request.url).searchParams.get('today') ?? ''
  const snap = await homeSnapshot(device.spaceId, today)
  return NextResponse.json(snap, { headers: { 'Cache-Control': 'no-store' } })
}
