import { createClient } from '@/lib/supabase/client'

const BUCKET = 'date-idea-photos'
const SIGNED_URL_TTL_SECONDS = 60 * 60

function extFromName(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot === -1 ? 'jpg' : name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
}

export async function uploadDateIdeaPhoto(ideaId: string, file: File): Promise<string> {
  const supabase = createClient()
  const path = `${ideaId}/${crypto.randomUUID()}.${extFromName(file.name)}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg', upsert: false,
  })
  if (error) throw new Error(error.message)
  return path
}

export async function deleteDateIdeaPhoto(path: string): Promise<void> {
  const supabase = createClient()
  await supabase.storage.from(BUCKET).remove([path])
}

export async function getDateIdeaPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const clean = paths.filter(Boolean)
  if (clean.length === 0) return {}
  const supabase = createClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(clean, SIGNED_URL_TTL_SECONDS)
  if (error || !data) return {}
  const out: Record<string, string> = {}
  for (const row of data) if (row.signedUrl && row.path) out[row.path] = row.signedUrl
  return out
}
