import crypto from 'node:crypto'

// A change Jarvis wants to make, waiting for a yes (2026-10-18). Jarvis never
// writes anything by itself: a tool that changes something (an event, a task,
// an email draft) comes back to the browser as one of these, signed by the
// server. Tapping Confirm sends it back; the server checks the signature, that
// it belongs to the person confirming, and that it is less than ten minutes
// old, and only then runs it. The browser can show it but cannot alter it.

export interface PendingAction {
  tool: string
  input: Record<string, unknown>
  /** Plain words shown on the confirm card. */
  summary: string
  userId: string
  exp: number
}

function secret(): string {
  const s = process.env.JARVIS_ACTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!s) throw new Error('No signing key on the server')
  return s
}

const b64 = (b: Buffer) => b.toString('base64url')

export function signAction(a: Omit<PendingAction, 'exp'>, ttlMs = 10 * 60_000): string {
  const body = b64(Buffer.from(JSON.stringify({ ...a, exp: Date.now() + ttlMs })))
  const mac = b64(crypto.createHmac('sha256', secret()).update(body).digest())
  return `${body}.${mac}`
}

export function verifyAction(token: string, userId: string): PendingAction | null {
  const [body, mac] = token.split('.')
  if (!body || !mac) return null
  const want = crypto.createHmac('sha256', secret()).update(body).digest()
  const got = Buffer.from(mac, 'base64url')
  if (got.length !== want.length || !crypto.timingSafeEqual(got, want)) return null
  try {
    const a = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as PendingAction
    if (a.userId !== userId || a.exp < Date.now()) return null
    return a
  } catch { return null }
}
