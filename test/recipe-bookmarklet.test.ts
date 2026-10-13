import { describe, it, expect } from 'vitest'
import { buildBookmarklet, decodeIncoming, draftFromBlocks } from '@/lib/recipes/bookmarklet'

// What the bookmarklet does in the browser: JSON -> utf8 -> base64url.
const pack = (o: unknown) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

describe('decodeIncoming', () => {
  it('reads recipe markup blocks', () => {
    const r = decodeIncoming(pack({ k: 'ld', v: ['{"a":1}'], u: 'https://x.test/r' }))
    expect(r).toEqual({ kind: 'ld', blocks: ['{"a":1}'], url: 'https://x.test/r' })
  })
  it('reads page text, with accents and emoji intact', () => {
    const r = decodeIncoming(pack({ k: 'text', v: 'Crème brûlée 🍮\n2 eggs', u: 'https://www.tiktok.com/@a/video/1' }))
    expect(r).toEqual({ kind: 'text', text: 'Crème brûlée 🍮\n2 eggs', url: 'https://www.tiktok.com/@a/video/1' })
  })
  it('drops a source that is not a web link', () => {
    expect(decodeIncoming(pack({ k: 'text', v: 'x', u: 'javascript:alert(1)' }))).toEqual({ kind: 'text', text: 'x', url: '' })
  })
  it('refuses anything that is not ours', () => {
    expect(decodeIncoming('')).toBeNull()
    expect(decodeIncoming('not base64 !!')).toBeNull()
    expect(decodeIncoming(pack({ k: 'weird', v: 1 }))).toBeNull()
    expect(decodeIncoming('A'.repeat(100_000))).toBeNull()
    expect(decodeIncoming(Buffer.from('plain words', 'utf8').toString('base64url'))).toBeNull()
  })
})

describe('draftFromBlocks', () => {
  const ld = JSON.stringify({ '@type': 'Recipe', name: 'Soup', recipeIngredient: ['1 onion'], recipeInstructions: ['Cook.'] })
  it('parses the first block that holds a recipe', () => {
    expect(draftFromBlocks(['{"@type":"Article"}', ld], 'https://food.test/soup')?.title).toBe('Soup')
  })
  it('returns null when none do', () => {
    expect(draftFromBlocks(['{"@type":"Article"}'], '')).toBeNull()
  })
})

describe('buildBookmarklet', () => {
  it('is one javascript: line aimed at the given origin', () => {
    const b = buildBookmarklet('https://4s.example')
    expect(b.startsWith('javascript:')).toBe(true)
    expect(b).not.toContain('\n')
    expect(b).toContain('https://4s.example')
    expect(b).toContain('/dashboard?recipe=')
  })
  it('runs: packs a page and produces a link our decoder accepts', () => {
    // Evaluate the bookmarklet body against a stand-in document/window.
    const ldBlock = JSON.stringify({ '@type': 'Recipe', name: 'Pasta', recipeIngredient: ['1 lb pasta'], recipeInstructions: ['Boil.'] })
    const opened: string[] = []
    const doc = { querySelectorAll: () => [{ textContent: ldBlock }], title: 'Pasta', body: { innerText: 'body text' } }
    const win = { open: (u: string) => { opened.push(u) } }
    const loc = { href: 'https://food.test/pasta' }
    const body = buildBookmarklet('https://4s.example').slice('javascript:'.length)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    new Function('document', 'window', 'location', 'btoa', 'unescape', 'encodeURIComponent', 'alert', `return ${body}`)(
      doc, win, loc, (s: string) => Buffer.from(s, 'binary').toString('base64'), unescape, encodeURIComponent, () => { throw new Error('alert') },
    )
    expect(opened).toHaveLength(1)
    const param = opened[0].split('?recipe=')[1]
    const incoming = decodeIncoming(param)
    expect(incoming?.kind).toBe('ld')
    expect(draftFromBlocks((incoming as { blocks: string[] }).blocks, 'https://food.test/pasta')?.title).toBe('Pasta')
  })
})
