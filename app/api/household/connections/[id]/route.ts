import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Props {
  params: Promise<{ id: string }>
}

/** Confirms the caller owns the space this link belongs to — the same
 *  owner-only gate as issuing a pairing code (spec §13). */
async function assertOwner(supabase: Awaited<ReturnType<typeof createClient>>, linkId: string, userId: string) {
  const admin = createAdminClient()
  const { data: link } = await admin.from('household_discord_links').select('space_id').eq('id', linkId).maybeSingle()
  if (!link) return { ok: false as const, status: 404, error: 'Not found' }
  const { data: space } = await supabase.from('shared_spaces').select('owner_id').eq('id', link.space_id).maybeSingle()
  if (!space || space.owner_id !== userId) return { ok: false as const, status: 403, error: 'Only the household owner can manage this.' }
  return { ok: true as const }
}

// Editing one person's notification toggles.
export async function PATCH(request: Request, { params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, id, user.id)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const body = await request.json().catch(() => ({}))
  const notify = body.notify as Record<string, unknown> | undefined
  if (!notify || typeof notify !== 'object') return NextResponse.json({ error: 'notify object is required' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin.from('household_discord_links').update({ notify }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Disconnecting one person's Discord link (spec §12's "Disconnect" button).
export async function DELETE(request: Request, { params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const gate = await assertOwner(supabase, id, user.id)
  if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status })

  const admin = createAdminClient()
  const { error } = await admin.from('household_discord_links').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
