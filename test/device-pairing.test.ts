import { describe, expect, it } from 'vitest'
import { newPairCode, normalizeCode, formatCode, newSecret, hashSecret, isExpired, CODE_LENGTH } from '@/lib/devices/token'

describe('screen pairing codes', () => {
  it('makes codes that are easy to read and always valid', () => {
    for (let i = 0; i < 200; i++) {
      const c = newPairCode()
      expect(c).toHaveLength(CODE_LENGTH)
      expect(c).not.toMatch(/[01OIL]/)
      expect(normalizeCode(c)).toBe(c)
    }
  })

  it('accepts a code typed loosely and rejects junk', () => {
    expect(normalizeCode('k7qm-3xpd')).toBe('K7QM3XPD')
    expect(normalizeCode(' K7QM 3XPD ')).toBe('K7QM3XPD')
    expect(normalizeCode('K7QM3XP')).toBeNull()
    expect(normalizeCode('K7QM3XP0')).toBeNull()
    expect(normalizeCode("'; drop table--")).toBeNull()
    expect(normalizeCode(42)).toBeNull()
    expect(formatCode('K7QM3XPD')).toBe('K7QM-3XPD')
  })

  it('keeps secrets long and unique, and stores only a hash', () => {
    const a = newSecret(), b = newSecret()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(40)
    expect(hashSecret(a)).toMatch(/^[0-9a-f]{64}$/)
    expect(hashSecret(a)).toBe(hashSecret(a))
    expect(hashSecret(a)).not.toContain(a)
  })

  it('knows when a code has run out', () => {
    const now = new Date('2026-11-08T12:00:00Z')
    expect(isExpired('2026-11-08T11:59:59Z', now)).toBe(true)
    expect(isExpired('2026-11-08T12:00:00Z', now)).toBe(true)
    expect(isExpired('2026-11-08T12:05:00Z', now)).toBe(false)
  })
})
