import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { inSharedMode } from '@/lib/google/server'
import { driveIdOf, fetchDrivePhoto, photoReaders } from '@/lib/google/checkinPhoto'

// The old check-in photos (2026-10-27). Before 4S had its own check-in, the
// Google Form saved each week's photo to Drive, and the row kept that link.
//
// GET ?id= streams one, for a check-in that has not been moved yet.
// POST moves them all: each photo is copied into the check-in photos bucket
// (so it shows in the check-in and in Our photos), the row points at the
// copy, and the Drive link answer is dropped. Photos no one's Google can
// open are left as they are. Only check-ins in your own space are touched.

const BUCKET = 'checkin-photos'

async function caller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (await inSharedMode()) return { error: NextResponse.json({ error: 'Not on the shared screen' }, { status: 403 }) }
  return { user }
}

interface Row { id: string; space_id: string; user_id: string; week_of: string; photo_path: string | null; answers: { questionKey: string; questionText: string | null; answer: string }[] }
const driveAnswer = (r: Row) => (r.answers ?? []).find(a => /drive\.google\.com/.test(a.answer ?? ''))

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) return NextResponse.json({ error: 'Bad id' }, { status: 400 })
  const c = await caller()
  if (c.error) return c.error
  const { spaceIds, readers } = await photoReaders(c.user.id)
  if (!spaceIds.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  // The photo has to belong to a check-in you can see.
  const { data: rows } = await createAdminClient().from('checkins').select('answers').in('space_id', spaceIds)
  if (!(rows ?? []).some(r => JSON.stringify(r.answers ?? []).includes(id))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const img = await fetchDrivePhoto(id, readers)
  if (!img) return NextResponse.json({ error: 'Could not load' }, { status: 404 })
  return new NextResponse(img.body, { headers: { 'content-type': img.headers.get('content-type') ?? 'image/jpeg', 'cache-control': 'private, max-age=86400' } })
}

export async function POST() {
  const c = await caller()
  if (c.error) return c.error
  const { spaceIds, readers } = await photoReaders(c.user.id)
  if (!spaceIds.length) return NextResponse.json({ moved: 0, failed: 0 })
  const admin = createAdminClient()
  const { data } = await admin.from('checkins').select('id, space_id, user_id, week_of, photo_path, answers').in('space_id', spaceIds).is('photo_path', null)
  const todo = ((data as Row[] | null) ?? []).filter(r => driveAnswer(r))

  let moved = 0, failed = 0
  for (const r of todo) {
    const link = driveAnswer(r)!
    const id = driveIdOf(link.answer)
    const img = id ? await fetchDrivePhoto(id, readers) : null
    if (!img) { failed++; continue }
    const type = img.headers.get('content-type') ?? 'image/jpeg'
    const ext = type.includes('png') ? 'png' : type.includes('heic') ? 'heic' : type.includes('webp') ? 'webp' : 'jpg'
    // Same path shape the check-in form uses: {space}/{week}/{person}.{ext}
    const path = `${r.space_id}/${r.week_of.slice(0, 10)}/${r.user_id}.${ext}`
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, Buffer.from(await img.arrayBuffer()), { contentType: type, upsert: true })
    if (upErr) { failed++; continue }
    const answers = r.answers.filter(a => a !== link)
    const { error } = await admin.from('checkins').update({ photo_path: path, answers }).eq('id', r.id)
    if (error) { failed++; continue }
    moved++
  }
  return NextResponse.json({ moved, failed })
}
