import { createAdminClient } from '@/lib/supabase/admin'

// The households a signed-in person belongs to (owner or accepted member).
// Used to decide who may approve or remove a screen. Checked on the server
// with the service role, never trusted from the browser.
export async function spacesFor(userId: string): Promise<{ id: string; name: string }[]> {
  const admin = createAdminClient()
  const [{ data: owned }, { data: joined }] = await Promise.all([
    admin.from('shared_spaces').select('id, name').eq('owner_id', userId),
    admin.from('shared_space_members').select('space_id, shared_spaces(id, name)').eq('member_id', userId).eq('status', 'accepted'),
  ])
  const out = new Map<string, string>()
  for (const s of owned ?? []) out.set(s.id, s.name)
  for (const m of (joined ?? []) as unknown as { shared_spaces: { id: string; name: string } | null }[]) {
    if (m.shared_spaces) out.set(m.shared_spaces.id, m.shared_spaces.name)
  }
  return [...out].map(([id, name]) => ({ id, name }))
}
