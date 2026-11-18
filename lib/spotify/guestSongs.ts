import { createAdminClient } from '@/lib/supabase/admin'

// Who added which song (2026-11-18). Spotify's queue does not say, so a
// guest's song is also kept as a 'song' contribution with its track uri.
export async function guestNamesFor(filter: { gatheringId?: string; spaceIds?: string[] }): Promise<Map<string, string>> {
  const admin = createAdminClient()
  let q = admin.from('guest_contributions').select('guest_name, meta')
    .eq('kind', 'song').eq('status', 'visible')
    .gte('created_at', new Date(Date.now() - 12 * 3600_000).toISOString())
  if (filter.gatheringId) q = q.eq('gathering_id', filter.gatheringId)
  else if (filter.spaceIds?.length) q = q.in('space_id', filter.spaceIds)
  else return new Map()
  const { data } = await q
  const names = new Map<string, string>()
  for (const r of data ?? []) {
    const uri = (r.meta as Record<string, unknown> | null)?.uri
    if (typeof uri === 'string') names.set(uri, (r.guest_name as string | null) || 'a guest')
  }
  return names
}
