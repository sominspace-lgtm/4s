import { createClient } from '@/lib/supabase/client'

const BUCKET = 'checkin-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60

function extFromName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? 'jpg' : name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
}

// Path `{spaceId}/{weekOf}/{userId}.{ext}` — the RLS policy checks the
// space id in the first segment (see checkin_photo_note.sql). `upsert` so a
// retried submit in the same week overwrites rather than erroring.
export async function uploadCheckinPhoto(spaceId: string, weekOf: string, userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const path = `${spaceId}/${weekOf}/${userId}.${extFromName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: true,
  })
  if (error) throw new Error(error.message)
  return path
}

export async function getCheckinPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const clean = paths.filter(Boolean)
  if (clean.length === 0) return {}
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(clean, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const row of data) if (row.signedUrl && row.path) out[row.path] = row.signedUrl
  return out
}
