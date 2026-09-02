import { createAdminClient } from '@/lib/supabase/admin'
import type { GatheringMemory } from '@/lib/hooks/useGathering'

// Public read-only view of a "Tonight at the Village" keepsake, shared by
// link. Same boundary model as lib/guest/portal.ts: the random token is the
// only credential, resolved with the admin client, and hidden keepsakes
// never resolve.

export type PublicKeepsake = Pick<GatheringMemory, 'title' | 'happened_on' | 'series' | 'summary'>

export async function resolveKeepsake(token: string): Promise<PublicKeepsake | null> {
  if (!token || token.length < 12 || token.length > 64) return null
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('gathering_memories')
    .select('title, happened_on, series, summary, status')
    .eq('token', token)
    .maybeSingle()
  if (error || !data || data.status === 'hidden') return null
  return {
    title: data.title,
    happened_on: data.happened_on,
    series: data.series ?? null,
    summary: (data.summary as PublicKeepsake['summary']) ?? {},
  }
}
