import { createAdminClient } from '@/lib/supabase/admin'
import { googleFetch, householdOwner } from '@/lib/google/server'

// The old Google Form's check-in photos (2026-10-27), server side only.
// Whoever made the form owns the uploads in Drive, so a photo is read with
// your own Google first, then your partner's, then the shared account's.

const BASE = 'https://www.googleapis.com/drive/v3/files'

/** The file id in a Drive link ("open?id=…" or "/file/d/…/"). */
export function driveIdOf(url: string): string | null {
  const m = url.match(/[?&]id=([A-Za-z0-9_-]{10,})/) ?? url.match(/\/d\/([A-Za-z0-9_-]{10,})/)
  return m ? m[1] : null
}

/** Your spaces, and everyone whose Google may hold the photo, in order. */
export async function photoReaders(userId: string): Promise<{ spaceIds: string[]; readers: string[] }> {
  const admin = createAdminClient()
  const [{ data: own }, { data: joined }] = await Promise.all([
    admin.from('shared_spaces').select('id').eq('owner_id', userId),
    admin.from('shared_space_members').select('space_id').eq('member_id', userId).eq('status', 'accepted'),
  ])
  const spaceIds = [...new Set([...(own ?? []).map(s => s.id as string), ...(joined ?? []).map(m => m.space_id as string)])]
  if (!spaceIds.length) return { spaceIds, readers: [userId] }
  const [{ data: owners }, { data: members }] = await Promise.all([
    admin.from('shared_spaces').select('owner_id').in('id', spaceIds),
    admin.from('shared_space_members').select('member_id').in('space_id', spaceIds).eq('status', 'accepted'),
  ])
  const shared = await householdOwner(userId)
  const readers = [...new Set([
    userId,
    ...(owners ?? []).map(o => o.owner_id as string),
    ...(members ?? []).map(m => m.member_id as string),
    ...(shared ? [shared] : []),
  ])]
  return { spaceIds, readers }
}

/** The photo itself, or null if no one's Google can open it. */
export async function fetchDrivePhoto(id: string, readers: string[]): Promise<Response | null> {
  if (!/^[A-Za-z0-9_-]{10,200}$/.test(id)) return null
  for (const owner of readers) {
    try {
      const meta = await googleFetch(owner, `${BASE}/${id}?fields=mimeType,size,thumbnailLink&supportsAllDrives=true`)
      if (!meta.ok) continue
      const m = await meta.json() as { mimeType?: string; size?: string; thumbnailLink?: string }
      if (!m.mimeType?.startsWith('image/')) return null
      // A big phone photo comes back resized; small ones as they are.
      const url = Number(m.size ?? 0) > 4_000_000 && m.thumbnailLink ? m.thumbnailLink.replace(/=s\d+$/, '=s1600') : `${BASE}/${id}?alt=media&supportsAllDrives=true`
      const img = await googleFetch(owner, url)
      if (img.ok) return img
    } catch { /* that person has no Google connected; try the next */ }
  }
  return null
}
