import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { DEVICE_COOKIE, hashSecret } from './token'

// Who is this screen? (2026-11-08). The paired iPad sends its key in an
// httpOnly cookie. We hash it, look it up with the service role, and get
// back exactly one household and one mode, or nothing. A removed screen
// stops working on its very next request.

export interface PairedDevice {
  id: string
  spaceId: string
  name: string
  mode: 'ambient'
}

const SEEN_EVERY_MS = 5 * 60_000

export async function deviceFromToken(token: string | undefined | null): Promise<PairedDevice | null> {
  if (!token || token.length < 20 || token.length > 200) return null
  const admin = createAdminClient()
  const { data } = await admin.from('home_devices')
    .select('id, space_id, name, mode, last_seen_at')
    .eq('token_hash', hashSecret(token))
    .is('revoked_at', null)
    .maybeSingle()
  if (!data) return null
  const seen = data.last_seen_at ? new Date(data.last_seen_at).getTime() : 0
  if (Date.now() - seen > SEEN_EVERY_MS) {
    await admin.from('home_devices').update({ last_seen_at: new Date().toISOString() }).eq('id', data.id)
  }
  return { id: data.id, spaceId: data.space_id, name: data.name, mode: 'ambient' }
}

/** The paired screen making this request, read from its cookie. */
export async function currentDevice(): Promise<PairedDevice | null> {
  const store = await cookies()
  return deviceFromToken(store.get(DEVICE_COOKIE)?.value)
}
