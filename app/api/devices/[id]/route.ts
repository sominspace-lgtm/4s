import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { spacesFor } from '@/lib/devices/members'

// Remove a paired screen (2026-11-08). Its key stops working at once; the
// screen falls back to the pairing page on its next request.
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: device } = await admin.from('home_devices').select('id, space_id').eq('id', id).maybeSingle()
  const spaces = await spacesFor(user.id)
  if (!device || !spaces.some(s => s.id === device.space_id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await admin.from('home_devices').update({ revoked_at: new Date().toISOString(), token_hash: null }).eq('id', id)
  return NextResponse.json({ ok: true })
}
