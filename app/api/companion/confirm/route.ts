import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CONFIRMABLE_ITEM_TYPES } from '../summary/route'

// Confirms one Companion-synced item as the current user. Upsert on the
// (item_type, item_id, user_id) unique constraint, so double-clicking or a
// retry after a flaky connection never errors or duplicates.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const itemType = body.itemType as string
  const itemId = body.itemId as string
  if (!itemId || !CONFIRMABLE_ITEM_TYPES.includes(itemType as typeof CONFIRMABLE_ITEM_TYPES[number])) {
    return NextResponse.json({ error: 'Invalid item_type or missing item_id' }, { status: 400 })
  }

  const { error } = await supabase
    .from('relationship_sync_confirmations')
    .upsert({ item_type: itemType, item_id: itemId, user_id: user.id }, { onConflict: 'item_type,item_id,user_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
