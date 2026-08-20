import { pbkdf2Sync, timingSafeEqual } from 'crypto'

export type Profile = 'harry' | 'sylvia' | 'shared'

export const PROFILES: Profile[] = ['harry', 'sylvia', 'shared']

export function isProfile(v: unknown): v is Profile {
  return v === 'harry' || v === 'sylvia' || v === 'shared'
}

export function hashPin(pin: string): string | null {
  const pepper = process.env.PIN_PEPPER
  if (!pepper) return null
  return pbkdf2Sync(pin, pepper, 100_000, 32, 'sha256').toString('hex')
}

export function pinsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

// Shared always signs in as Sylvia's real account — she owns the household
// space and has the active Discord link. What the human sees is still their
// own PIN and their own profile name; this is purely which Supabase session
// backs it, invisible past the login screen.
const BACKING: Record<Profile, 'harry' | 'sylvia'> = { harry: 'harry', sylvia: 'sylvia', shared: 'sylvia' }

export function backingCredentials(profile: Profile): { email: string | undefined; password: string | undefined } {
  const key = BACKING[profile]
  return key === 'harry'
    ? { email: process.env.HARRY_EMAIL, password: process.env.HARRY_PASSWORD }
    : { email: process.env.SYLVIA_EMAIL, password: process.env.SYLVIA_PASSWORD }
}
