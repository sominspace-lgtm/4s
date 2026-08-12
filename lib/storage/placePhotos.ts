import { createClient } from '@/lib/supabase/client'

const BUCKET = 'place-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1 hour — long enough for one viewing session

function extFromName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? 'jpg' : name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
}

// Uploads a photo under `{placeId}/{random}.{ext}` and returns the storage
// path to save on the place row (not a URL — see getPlacePhotoUrls).
export async function uploadPlacePhoto(placeId: string, file: File): Promise<string> {
  const supabase = createClient()
  const path = `${placeId}/${crypto.randomUUID()}.${extFromName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return path
}

export async function deletePlacePhoto(path: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([path])
}

// The bucket is private, so display needs short-lived signed URLs rather
// than the stored path directly.
export async function getPlacePhotoUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const row of data) {
    if (row.signedUrl && row.path) out[row.path] = row.signedUrl
  }
  return out
}
