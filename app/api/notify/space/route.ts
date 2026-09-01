import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from '@/lib/push/send'

// Event-driven push to the OTHER members of the caller's shared space —
// today just "your partner left a fridge note". Session-authed (the caller
// is a real user); the admin client is only used to look up the other
// members' notifyPrefs and deliver. Each recipient can mute the kind.

const BODY: Record<string, (preview: string) => string> = {
  'fridge-note': p => (p ? `New fridge note: “${p}”` : 'Your partner left a fridge note.'),
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { kind?: string; preview?: string }
  const kind = typeof body.kind === 'string' ? body.kind : ''
  if (!BODY[kind]) return NextResponse.json({ error: 'Unknown kind' }, { status: 400 })
  const preview = typeof body.preview === 'string' ? body.preview.slice(0, 80) : ''
  const prefKey = kind === 'fridge-note' ? 'fridgeNote' : kind

  const admin = createAdminClient()

  // The caller's accepted spaces (RLS: they can see their own membership rows).
  const { data: mine } = await supabase
    .from('shared_space_members').select('space_id').eq('member_id', user.id).eq('status', 'accepted')
  const spaceIds = [...new Set((mine ?? []).map(r => r.space_id as string))]
  if (spaceIds.length === 0) return NextResponse.json({ notified: 0 })

  const { data: members } = await admin
    .from('shared_space_members').select('member_id').in('space_id', spaceIds).eq('status', 'accepted')
  const targets = [...new Set((members ?? []).map(r => r.member_id as string).filter(id => id && id !== user.id))]

  let notified = 0
  for (const targetId of targets) {
    const { data: prefsRow } = await admin.from('user_prefs').select('layout').eq('user_id', targetId).maybeSingle()
    const prefs = ((prefsRow?.layout as { notifyPrefs?: Record<string, boolean> } | null)?.notifyPrefs) ?? {}
    if (prefs[prefKey] === false) continue
    const n = await sendPushToUser(admin, targetId, { title: '4S', body: BODY[kind](preview), url: '/dashboard' })
    if (n > 0) notified++
  }

  return NextResponse.json({ notified })
}
