import { describe, it, expect, beforeAll } from 'vitest'
import { signAction, verifyAction } from '@/lib/jarvis/actions'

beforeAll(() => { process.env.JARVIS_ACTION_KEY = 'test-key-for-signing' })

describe('pending actions', () => {
  const a = { tool: 'calendar_create_event', input: { title: 'Tennis', date: '2026-10-21' }, summary: 'Add Tennis', userId: 'u1' }
  it('round trips for the same person', () => {
    expect(verifyAction(signAction(a), 'u1')?.input).toEqual(a.input)
  })
  it('refuses another person', () => expect(verifyAction(signAction(a), 'u2')).toBeNull())
  it('refuses a tampered action', () => {
    const [body, mac] = signAction(a).split('.')
    const changed = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), input: { title: 'Something else' } })).toString('base64url')
    expect(verifyAction(`${changed}.${mac}`, 'u1')).toBeNull()
  })
  it('refuses an expired action', () => expect(verifyAction(signAction(a, -1), 'u1')).toBeNull())
})
