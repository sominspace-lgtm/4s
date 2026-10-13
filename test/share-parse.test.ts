import { describe, it, expect } from 'vitest'
import { parseShared, encodeShared, decodeShared } from '@/lib/share/parse'

describe('parseShared', () => {
  it('finds a link that arrived in the text field', () => {
    const s = parseShared({ title: 'Best pasta', text: 'Try this https://example.com/pasta.', url: '' })
    expect(s?.url).toBe('https://example.com/pasta')
    expect(s?.title).toBe('Best pasta')
    expect(s?.text).toBe('Try this')
  })
  it('uses the url field', () => {
    expect(parseShared({ url: 'https://a.com/x' })?.url).toBe('https://a.com/x')
  })
  it('returns null for nothing', () => {
    expect(parseShared({ title: ' ', text: '' })).toBeNull()
  })
  it('keeps plain words with no link', () => {
    expect(parseShared({ text: 'buy oat milk' })).toEqual({ title: 'buy oat milk', text: '', url: null })
  })
  it('round trips', () => {
    const s = decodeShared(encodeShared({ title: 'Crème brûlée', text: '', url: 'https://a.com' }))
    expect(s?.title).toBe('Crème brûlée')
    expect(s?.url).toBe('https://a.com')
  })
})
