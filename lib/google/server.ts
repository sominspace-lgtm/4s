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

// --- tokens ----------------------------------------------------------------
interface Row {
  access_token: string; refresh_token: string | null; expires_at: string
  google_email: string | null; scopes: string | null
}

export async function saveTokens(userId: string, t: {
  access_token: string; refresh_token?: string | null; expires_in: number; scope?: string; email?: string | null
}) {
  const admin = createAdminClient()
  const { data: existing } = await admin.from('google_connections').select('refresh_token').eq('user_id', userId).maybeSingle()
  // Google only sends a refresh token on the first consent; keep the stored
  // (already sealed) one when a refresh response has none.
  const refreshSealed = t.refresh_token ? seal(t.refresh_token) : ((existing?.refresh_token as string | null) ?? null)
  const { error } = await admin.from('google_connections').upsert({
    user_id: userId,
    google_email: t.email ?? null,
    scopes: t.scope ?? null,
    access_token: seal(t.access_token),
    refresh_token: refreshSealed,
    expires_at: new Date(Date.now() + (t.expires_in - 60) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function getConnection(userId: string): Promise<{ email: string | null; scopes: string | null } | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('google_connections').select('google_email, scopes').eq('user_id', userId).maybeSingle()
  return data ? { email: (data.google_email as string | null) ?? null, scopes: (data.scopes as string | null) ?? null } : null
}

/** Deletes the stored connection and returns a token to revoke at Google. */
export async function deleteConnection(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('google_connections').select('access_token, refresh_token').eq('user_id', userId).maybeSingle()
  const token = data ? open((data.refresh_token as string | null) ?? (data.access_token as string)) : null
  await admin.from('google_connections').delete().eq('user_id', userId)
  return token
}

/** A usable access token, refreshed when it is about to expire. null = not connected / refresh failed. */
export async function getAccessToken(userId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('google_connections')
    .select('access_token, refresh_token, expires_at, google_email, scopes').eq('user_id', userId).maybeSingle()
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
  await saveTokens(userId, { access_token: j.access_token, expires_in: j.expires_in, scope: j.scope ?? row.scopes ?? undefined, email: row.google_email })
  return j.access_token
}

/** Authenticated fetch against a Google API. Throws 'not-connected' when there is no usable token. */
export async function googleFetch(userId: string, url: string, init?: RequestInit): Promise<Response> {
  const token = await getAccessToken(userId)
  if (!token) throw new Error('not-connected')
  return fetch(url, { ...init, headers: { ...(init?.headers ?? {}), authorization: `Bearer ${token}` } })
}
