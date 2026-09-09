import { createClient } from '@/lib/supabase/client'

const BUCKET = 'pet-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60

function ext(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? 'jpg' : name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
}

// One photo per space — path `{spaceId}/somi.{ext}`, `upsert` so a new
// upload replaces the old. RLS checks the space id in the first segment.
export async function uploadPetPhoto(spaceId: string, file: File): Promise<string> {
  const supabase = createClient()
  const path = `${spaceId}/somi.${ext(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: true,
  })
  if (error) throw new Error(error.message)
  return path
}

export async function getPetPhotoUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}
