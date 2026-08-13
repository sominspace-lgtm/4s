import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'

// A photo attached to a #pins Discord message → appended to that place's
// photo_paths (2026-08-13). Raw image bytes in the body, not multipart —
// the bot already has the bytes in hand from Discord's CDN, no form to
// parse. Same private 'place-photos' bucket the 4S web app's own photo
// upload uses (lib/storage/placePhotos.ts); this route just does it with a
// service-role client since the bot has no Supabase session of its own.
const MAX_BYTES = 8 * 1024 * 1024 // 8MB — generous for a phone photo, not for abuse

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Props) {
  const { id } = await params
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: place, error: placeError } = await admin
    .from('places')
    .select('id, photo_paths')
    .eq('id', id)
    .eq('space_id', caller.spaceId)
    .maybeSingle()
  if (placeError) return NextResponse.json({ error: placeError.message }, { status: 500 })
  if (!place) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'Content-Type must be an image/* type' }, { status: 400 })
  }

  const bytes = await request.arrayBuffer()
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: `Image must be 1 byte to ${MAX_BYTES} bytes` }, { status: 400 })
  }

  const ext = (contentType.split('/')[1] ?? 'jpg').split(';')[0].replace(/[^a-z0-9]/gi, '') || 'jpg'
  const path = `${id}/${crypto.randomUUID()}.${ext}`
  const uploaded = await admin.storage.from('place-photos').upload(path, Buffer.from(bytes), { contentType, upsert: false })
  if (uploaded.error) return NextResponse.json({ error: uploaded.error.message }, { status: 500 })

  const nextPaths = [...((place.photo_paths as string[] | null) ?? []), path]
  const { error: updateError } = await admin
    .from('places')
    .update({ photo_paths: nextPaths, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ ok: true, path })
}
