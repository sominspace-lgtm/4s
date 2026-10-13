import { describe, it, expect } from 'vitest'
import { validToken } from '@/lib/wishlist/share'

describe('wishlist share tokens', () => {
  it('accepts the url-safe tokens the app makes', () => {
    expect(validToken('Zm9vYmFyYmF6cXV4MTIzNDU2')).toBe(true)
    expect(validToken('a-b_c-d_e-f_g-h_i-j_k')).toBe(true)
  })
  it('rejects short, long, and unsafe ones', () => {
    expect(validToken('short')).toBe(false)
    expect(validToken('x'.repeat(65))).toBe(false)
    expect(validToken('abcdefghijklmnopqrstu%20')).toBe(false)
    expect(validToken("abcdefghijklmnopqrstu'--")).toBe(false)
    expect(validToken('')).toBe(false)
  })
})
