// The password vault's cryptography (2026-10-12). Everything here runs in the
// browser with WebCrypto; the server and the database only ever see
// ciphertext. There is no recovery: the key exists only while the vault is
// unlocked, derived from a passphrase that is never sent anywhere.
//
//   passphrase --PBKDF2-SHA256 (600k rounds, per-user salt)--> AES-256-GCM key
//   entry JSON --AES-GCM (fresh 12-byte IV, entry id as AAD)--> "iv.ciphertext"
//
// Binding the entry id as additional authenticated data means a row copied
// onto a different id fails to decrypt instead of showing the wrong site.

export const PBKDF2_ITERATIONS = 600_000
const VERIFIER_TEXT = '4s-vault-v1'

const enc = new TextEncoder()
const dec = new TextDecoder()

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(s.length))
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i)
  return out
}
function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(n))
  crypto.getRandomValues(out)
  return out
}

export function newSalt(): string {
  return toB64(randomBytes(16))
}

/** Derives the vault key. `iterations` is stored per user so it can be raised later. */
export async function deriveKey(passphrase: string, saltB64: string, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(saltB64), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable: the raw key bytes can never be read back out
    ['encrypt', 'decrypt'],
  )
}

async function seal(key: CryptoKey, plain: string, aad: string): Promise<string> {
  const iv = randomBytes(12)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, enc.encode(plain))
  return `${toB64(iv)}.${toB64(ct)}`
}

async function open(key: CryptoKey, sealed: string, aad: string): Promise<string> {
  const [iv, ct] = sealed.split('.')
  if (!iv || !ct) throw new Error('malformed')
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv), additionalData: enc.encode(aad) }, key, fromB64(ct))
  return dec.decode(pt)
}

/** Proof the passphrase is right, stored beside the salt. */
export function makeVerifier(key: CryptoKey): Promise<string> {
  return seal(key, VERIFIER_TEXT, 'verifier')
}
export async function checkVerifier(key: CryptoKey, verifier: string): Promise<boolean> {
  try { return (await open(key, verifier, 'verifier')) === VERIFIER_TEXT } catch { return false }
}

export function encryptJson(key: CryptoKey, value: unknown, entryId: string): Promise<string> {
  return seal(key, JSON.stringify(value), entryId)
}
export async function decryptJson<T>(key: CryptoKey, sealed: string, entryId: string): Promise<T | null> {
  try { return JSON.parse(await open(key, sealed, entryId)) as T } catch { return null }
}

// --- generator ---------------------------------------------------------------
export interface GenOptions { length: number; lower: boolean; upper: boolean; digits: boolean; symbols: boolean }
export const DEFAULT_GEN: GenOptions = { length: 20, lower: true, upper: true, digits: true, symbols: true }

const SETS = {
  lower: 'abcdefghijkmnopqrstuvwxyz', // no l: easy to misread
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',  // no I or O
  digits: '23456789',                 // no 0, 1
  symbols: '!@#$%^&*-_=+?',
}

// Unbiased pick: reject values that would skew the modulo.
function pick(n: number): number {
  const limit = Math.floor(0x1_0000_0000 / n) * n
  const buf = new Uint32Array(1)
  do { crypto.getRandomValues(buf) } while (buf[0] >= limit)
  return buf[0] % n
}

export function generatePassword(opts: GenOptions = DEFAULT_GEN): string {
  const classes = (['lower', 'upper', 'digits', 'symbols'] as const).filter(k => opts[k])
  if (classes.length === 0) classes.push('lower')
  const length = Math.max(classes.length, Math.min(64, Math.floor(opts.length)))
  const pool = classes.map(c => SETS[c]).join('')
  // One from every chosen class first, so the result always satisfies "needs a number".
  const chars = classes.map(c => SETS[c][pick(SETS[c].length)])
  while (chars.length < length) chars.push(pool[pick(pool.length)])
  for (let i = chars.length - 1; i > 0; i--) { // Fisher-Yates shuffle
    const j = pick(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

// --- strength -----------------------------------------------------------------
export type Strength = 'weak' | 'okay' | 'strong'

/** A rough entropy estimate in bits. Honest enough for a nudge, not a guarantee. */
export function entropyBits(pw: string): number {
  if (!pw) return 0
  let pool = 0
  if (/[a-z]/.test(pw)) pool += 26
  if (/[A-Z]/.test(pw)) pool += 26
  if (/\d/.test(pw)) pool += 10
  if (/[^A-Za-z0-9]/.test(pw)) pool += 32
  let bits = pw.length * Math.log2(Math.max(pool, 2))
  // Repeats and runs ("aaaa", "1234") carry almost no information.
  const unique = new Set(pw).size
  if (unique < pw.length * 0.5) bits *= 0.6
  if (/(.)\1{2,}/.test(pw)) bits -= 10
  if (/(0123|1234|2345|3456|4567|5678|6789|abcd|qwer|asdf|password)/i.test(pw)) bits -= 20
  return Math.max(0, bits)
}

export function strengthOf(pw: string): Strength {
  const b = entropyBits(pw)
  return b < 45 ? 'weak' : b < 70 ? 'okay' : 'strong'
}
