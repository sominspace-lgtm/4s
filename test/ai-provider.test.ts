import { describe, it, expect, afterEach } from 'vitest'
import { fillRequired, parseLooseJson, providerOrder } from '@/lib/ai/provider'

describe('parseLooseJson', () => {
  it('reads plain, fenced, and chatty JSON', () => {
    expect(parseLooseJson('{"a":1}')).toEqual({ a: 1 })
    expect(parseLooseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
    expect(parseLooseJson('Here you go: {"a":1} hope that helps')).toEqual({ a: 1 })
  })
})

describe('fillRequired', () => {
  it('adds missing required fields, deep', () => {
    const schema = { type: 'object', required: ['title', 'items', 'list'], properties: {
      title: { type: 'string' }, items: { type: 'array' },
      list: { type: 'array', items: { type: 'object', required: ['x', 'y'], properties: { x: { type: 'string' }, y: { type: ['number', 'null'] } } } },
    } }
    expect(fillRequired({ list: [{ x: 'a' }] }, schema)).toEqual({ title: null, items: [], list: [{ x: 'a', y: null }] })
  })
})

describe('providerOrder', () => {
  const saved = { ...process.env }
  afterEach(() => { process.env = { ...saved } })
  it('Groq first, then Gemini, Claude only with a key', () => {
    process.env.GROQ_API_KEY = 'g'; process.env.GEMINI_API_KEY = 'm'; delete process.env.ANTHROPIC_API_KEY; delete process.env.AI_PROVIDERS
    expect(providerOrder()).toEqual(['groq', 'gemini'])
    process.env.ANTHROPIC_API_KEY = 'a'
    expect(providerOrder()).toEqual(['groq', 'gemini', 'anthropic'])
  })
  it('skips a provider with no key', () => {
    delete process.env.GROQ_API_KEY; process.env.GEMINI_API_KEY = 'm'; delete process.env.ANTHROPIC_API_KEY; delete process.env.AI_PROVIDERS
    expect(providerOrder()).toEqual(['gemini'])
  })
})
