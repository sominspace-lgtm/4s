import { createClient } from '@/lib/supabase/client'

const BUCKET = 'thing-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60

export async function uploadThingPhoto(thingId: string, file: Blob): Promise<string> {
  const supabase = createClient()
  const path = `${thingId}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(error.message)
  return path
}

export async function deleteThingPhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await createClient().storage.from(BUCKET).remove(paths)
}

export async function getThingPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const clean = paths.filter(Boolean)
  if (clean.length === 0) return {}
  const { data, error } = await createClient().storage.from(BUCKET).createSignedUrls(clean, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const row of data) if (row.signedUrl && row.path) out[row.path] = row.signedUrl
  return out
}
