import { describe, it, expect } from 'vitest'
import {
  newSalt, deriveKey, makeVerifier, checkVerifier, encryptJson, decryptJson,
  generatePassword, strengthOf, entropyBits, DEFAULT_GEN,
} from '@/lib/vault/crypto'

// Low iteration count only to keep the suite fast; the app uses 600k.
const ITER = 1000

describe('vault crypto', () => {
  it('round-trips an entry with the right key', async () => {
    const salt = newSalt()
    const key = await deriveKey('correct horse battery', salt, ITER)
    const sealed = await encryptJson(key, { title: 'Bank', password: 'p@ss' }, 'id-1')
    expect(sealed).not.toContain('Bank')
    expect(await decryptJson(key, sealed, 'id-1')).toEqual({ title: 'Bank', password: 'p@ss' })
  })

  it('rejects the wrong passphrase', async () => {
    const salt = newSalt()
    const good = await deriveKey('correct horse battery', salt, ITER)
    const bad = await deriveKey('wrong horse battery', salt, ITER)
    const verifier = await makeVerifier(good)
    expect(await checkVerifier(good, verifier)).toBe(true)
    expect(await checkVerifier(bad, verifier)).toBe(false)
    const sealed = await encryptJson(good, { a: 1 }, 'id-1')
    expect(await decryptJson(bad, sealed, 'id-1')).toBeNull()
  })

  it('refuses a row moved onto a different entry id', async () => {
    const key = await deriveKey('correct horse battery', newSalt(), ITER)
    const sealed = await encryptJson(key, { a: 1 }, 'id-1')
    expect(await decryptJson(key, sealed, 'id-2')).toBeNull()
  })

  it('uses a fresh IV every time', async () => {
    const key = await deriveKey('correct horse battery', newSalt(), ITER)
    const a = await encryptJson(key, { a: 1 }, 'id-1')
    const b = await encryptJson(key, { a: 1 }, 'id-1')
    expect(a).not.toBe(b)
  })

  it('tampering fails closed', async () => {
    const key = await deriveKey('correct horse battery', newSalt(), ITER)
    const sealed = await encryptJson(key, { a: 1 }, 'id-1')
    const [iv, ct] = sealed.split('.')
    const flipped = ct.slice(0, -4) + (ct.slice(-4) === 'AAAA' ? 'BBBB' : 'AAAA')
    expect(await decryptJson(key, `${iv}.${flipped}`, 'id-1')).toBeNull()
  })
})

describe('password generator', () => {
  it('honours length and always includes each chosen class', () => {
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword({ ...DEFAULT_GEN, length: 12 })
      expect(pw).toHaveLength(12)
      expect(pw).toMatch(/[a-z]/); expect(pw).toMatch(/[A-Z]/); expect(pw).toMatch(/\d/); expect(pw).toMatch(/[^A-Za-z0-9]/)
    }
  })
  it('respects turned-off classes', () => {
    const pw = generatePassword({ length: 30, lower: true, upper: false, digits: true, symbols: false })
    expect(pw).toMatch(/^[a-z0-9]+$/)
  })
  it('does not repeat itself', () => {
    expect(generatePassword()).not.toBe(generatePassword())
  })
})

describe('strength', () => {
  it('flags the obvious ones', () => {
    expect(strengthOf('password')).toBe('weak')
    expect(strengthOf('aaaaaaaa')).toBe('weak')
    expect(strengthOf('12345678')).toBe('weak')
  })
  it('likes long random ones', () => {
    expect(strengthOf(generatePassword())).toBe('strong')
    expect(entropyBits(generatePassword())).toBeGreaterThan(90)
  })
})
