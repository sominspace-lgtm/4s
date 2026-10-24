import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Google Calendar + Gmail, read and write (2026-10-05). Everything that
// touches a token lives here, server-side only (it imports next/headers and
// the service-role client, so a client component can never pull it in).

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  // Jarvis (2026-10-18): Google Tasks, read-only Drive, and saving Gmail drafts.
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
]

export const STATE_COOKIE = '4s-google-state'

export function googleConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET
}

export function redirectUri(origin: string): string {
  return `${origin}/api/google/callback`
}

// --- token encryption at rest ----------------------------------------------
function key(): Buffer {
  const secret = process.env.GOOGLE_TOKEN_KEY || process.env.GOOGLE_CLIENT_SECRET || ''
  return crypto.createHash('sha256').update(secret).digest()
}
export function seal(plain: string): string {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map(b => b.toString('base64')).join('.')
}
export function open(sealed: string): string | null {
  try {
    const [iv, tag, enc] = sealed.split('.').map(p => Buffer.from(p, 'base64'))
    const d = crypto.createDecipheriv('aes-256-gcm', key(), iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8')
  } catch { return null }
}

// --- who is asking ---------------------------------------------------------
// A Shared login (no PIN) and a live gathering both run on a real account's
// session. Google data is personal, so those sessions never reach it.
export async function requireGoogleUser(): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
> {
  if ((await cookies()).get('4s-shared-mode')?.value === '1') {
    return { ok: false, status: 403, error: 'Google is not available in shared mode.' }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }
  return { ok: true, userId: user.id }
}

// --- whose Google ----------------------------------------------------------
// Since 2026-10-24 a connection belongs either to one person (their user id)
// or to the household ("space:<id>", the shared email). Everything below
// takes that owner string, so calendar, Gmail, Tasks and Drive work with
// either account without knowing which it is.
export const FOR_COOKIE = '4s-google-for'

function where(owner: string): { table: string; col: string; id: string } {
  return owner.startsWith('space:')
    ? { table: 'household_google_connections', col: 'space_id', id: owner.slice(6) }
    : { table: 'google_connections', col: 'user_id', id: owner }
}

/** The household's Google owner for this person, or null if they have no household. */
export async function householdOwner(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: m } = await admin.from('shared_space_members').select('space_id').eq('member_id', userId).eq('status', 'accepted').limit(1).maybeSingle()
  if (m?.space_id) return `space:${m.space_id as string}`
  const { data: own } = await admin.from('shared_spaces').select('id').eq('owner_id', userId).limit(1).maybeSingle()
  return own?.id ? `space:${own.id as string}` : null
}

/** Is this request from the shared screen (the iPad, signed in without a PIN)? */
export async function inSharedMode(): Promise<boolean> {
  return (await cookies()).get('4s-shared-mode')?.value === '1'
}

/**
 * Who is asking, and which Google account they may use (2026-10-24).
 * Personal accounts are never reachable from the shared screen. The
 * household's shared account is: it belongs to the house, and the shared
 * iPad is where it is most useful. Pass sharedOk=false for anything a guest
 * at the shared screen should not read (the shared inbox).
 */
export async function requireGoogleAccess(account: string | null | undefined, sharedOk = true): Promise<
  { ok: true; userId: string; owner: string; shared: boolean } | { ok: false; status: number; error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 401, error: 'Unauthorized' }
  const wantShared = account === 'shared' || account === 'household'
  if (await inSharedMode()) {
    if (!wantShared || !sharedOk) return { ok: false, status: 403, error: 'Only the shared Google account works on the shared screen.' }
  }
  const owner = wantShared
    ? (await householdOwner(user.id)) ?? 'space:00000000-0000-0000-0000-000000000000'
    : user.id
  return { ok: true, userId: user.id, owner, shared: wantShared }
}

/** "shared" means the household account; anything else is the person's own. */
export async function resolveOwner(userId: string, account: unknown): Promise<string> {
  if (account === 'shared' || account === 'household') {
    const h = await householdOwner(userId)
    if (!h) throw new Error('not-connected')
    return h
  }
  return userId
}

// --- tokens ----------------------------------------------------------------
interface Row {
  access_token: string; refresh_token: string | null; expires_at: string
  google_email: string | null; scopes: string | null
}

export async function saveTokens(owner: string, t: {
  access_token: string; refresh_token?: string | null; expires_in: number; scope?: string; email?: string | null
}, connectedBy?: string) {
  const admin = createAdminClient()
  const w = where(owner)
  const { data: existing } = await admin.from(w.table).select('refresh_token').eq(w.col, w.id).maybeSingle()
  // Google only sends a refresh token on the first consent; keep the stored
  // (already sealed) one when a refresh response has none.
  const refreshSealed = t.refresh_token ? seal(t.refresh_token) : ((existing?.refresh_token as string | null) ?? null)
  const { error } = await admin.from(w.table).upsert({
    [w.col]: w.id,
    ...(w.col === 'space_id' && connectedBy ? { connected_by: connectedBy } : {}),
    google_email: t.email ?? null,
    scopes: t.scope ?? null,
    access_token: seal(t.access_token),
    refresh_token: refreshSealed,
    expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function getConnection(owner: string): Promise<{ email: string | null; scopes: string | null } | null> {
  const admin = createAdminClient()
  const w = where(owner)
  const { data } = await admin.from(w.table).select('google_email, scopes').eq(w.col, w.id).maybeSingle()
  return data ? { email: (data.google_email as string | null) ?? null, scopes: (data.scopes as string | null) ?? null } : null
}

/** Deletes the stored connection and returns a token to revoke at Google. */
export async function deleteConnection(owner: string): Promise<string | null> {
  const admin = createAdminClient()
  const w = where(owner)
  const { data } = await admin.from(w.table).select('access_token, refresh_token').eq(w.col, w.id).maybeSingle()
  const token = data ? open((data.refresh_token as string | null) ?? (data.access_token as string)) : null
  await admin.from(w.table).delete().eq(w.col, w.id)
  return token
}

/** A usable access token, refreshed when it is about to expire. null = not connected / refresh failed. */
export async function getAccessToken(owner: string): Promise<string | null> {
  const admin = createAdminClient()
  const w = where(owner)
  const { data } = await admin.from(w.table)
    .select('access_token, refresh_token, expires_at, google_email, scopes').eq(w.col, w.id).maybeSingle()
  const row = data as Row | null
  if (!row) return null
  if (new Date(row.expires_at).getTime() > Date.now() + 30_000) return open(row.access_token)

  const refresh = row.refresh_token ? open(row.refresh_token) : null
  if (!refresh) return null
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refresh, grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const j = await res.json() as { access_token: string; expires_in: number; scope?: string }
  await saveTokens(owner, { access_token: j.access_token, expires_in: j.expires_in, scope: j.scope ?? row.scopes ?? undefined, email: row.google_email })
  return j.access_token
}

/** Authenticated fetch against a Google API. Throws 'not-connected' when there is no usable token. */
export async function googleFetch(owner: string, url: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken(owner)
  if (!token) throw new Error('not-connected')
  return fetch(url, { ...init, headers: { ...(init?.headers ?? {}), authorization: `Bearer ${token}` } })
}
