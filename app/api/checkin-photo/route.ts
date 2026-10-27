import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { googleFetch, householdOwner, inSharedMode } from '@/lib/google/server'

// The old check-in photos (2026-10-27). Before 4S had its own check-in, the
// Google Form saved each week's photo to Drive, and the row keeps that
// link. This streams the picture so it shows in the check-in itself.
//
// Only a photo that is in one of your space's check-ins can be asked for.
// It is read with your own Google first, then your partner's, then the
// shared account's: whoever made the form owns the uploads, and both of
// you can already see these check-ins. Read only.

const BASE = 'https://www.googleapis.com/drive/v3/files'

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (await inSharedMode()) return NextResponse.json({ error: 'Not on the shared screen' }, { status: 403 })

  const admin = createAdminClient()
  const [{ data: own }, { data: joined }] = await Promise.all([
    admin.from('shared_spaces').select('id, owner_id').eq('owner_id', user.id),
    admin.from('shared_space_members').select('space_id').eq('member_id', user.id).eq('status', 'accepted'),
  ])
  const spaceIds = [...new Set([...(own ?? []).map(s => s.id as string), ...(joined ?? []).map(m => m.space_id as string)])]
  if (spaceIds.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // The photo has to belong to a check-in you can see.
  const { data: rows } = await admin.from('checkins').select('answers').in('space_id', spaceIds)
  if (!(rows ?? []).some(r => JSON.stringify(r.answers ?? []).includes(id))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // You, then everyone else in your space, then the shared account.
  const [{ data: owners }, { data: members }] = await Promise.all([
    admin.from('shared_spaces').select('owner_id').in('id', spaceIds),
    admin.from('shared_space_members').select('member_id').in('space_id', spaceIds).eq('status', 'accepted'),
  ])
  const shared = await householdOwner(user.id)
  const tryOrder = [...new Set([
    user.id,
    ...(owners ?? []).map(o => o.owner_id as string),
    ...(members ?? []).map(m => m.member_id as string),
    ...(shared ? [shared] : []),
  ])]

  for (const owner of tryOrder) {
    try {
      const meta = await googleFetch(owner, `${BASE}/${id}?fields=mimeType,size,thumbnailLink&supportsAllDrives=true`)
      if (!meta.ok) continue
      const m = await meta.json() as { mimeType?: string; size?: string; thumbnailLink?: string }
      if (!m.mimeType?.startsWith('image/')) return NextResponse.json({ error: 'Not a photo' }, { status: 400 })
      // A big phone photo comes back resized; small ones as they are.
      const url = Number(m.size ?? 0) > 4_000_000 && m.thumbnailLink ? m.thumbnailLink.replace(/=s\d+$/, '=s1600') : `${BASE}/${id}?alt=media&supportsAllDrives=true`
      const img = await googleFetch(owner, url)
      if (!img.ok) continue
      return new NextResponse(img.body, { headers: { 'content-type': img.headers.get('content-type') ?? m.mimeType, 'cache-control': 'private, max-age=86400' } })
    } catch { /* that person has no Google connected; try the next */ }
  }
  return NextResponse.json({ error: 'Could not load' }, { status: 404 })
}
