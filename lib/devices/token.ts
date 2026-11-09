import crypto from 'node:crypto'

// Small, pure helpers for pairing a screen (2026-11-08). Server-only.

/** No 0/O, 1/I/L, so a code read off the screen can't be misread. */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 8
export const PAIR_TTL_MINUTES = 10
export const DEVICE_COOKIE = '4s_device'
/** About 13 months, the longest a browser will keep a cookie. */
export const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60

export function newPairCode(): string {
  let s = ''
  for (let i = 0; i < CODE_LENGTH; i++) s += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]
  return s
}

/** Uppercases, drops spaces and dashes, and rejects anything that can't be a code. */
export function normalizeCode(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const c = input.toUpperCase().replace(/[\s-]/g, '')
  if (c.length !== CODE_LENGTH) return null
  for (const ch of c) if (!CODE_ALPHABET.includes(ch)) return null
  return c
}

/** "K7QM3XPD" shown as "K7QM-3XPD". */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

/** A long random secret: the pairing poll secret and the screen's own key. */
export function newSecret(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** Only this is stored. The raw secret lives on the device alone. */
export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex')
}

export function isExpired(expiresAt: string, now = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime()
}
