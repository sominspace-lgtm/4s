import { describe, it, expect } from 'vitest'
import { parseControl } from '@/lib/spotify/server'

describe('parseControl', () => {
  it('accepts the simple buttons', () => {
    for (const a of ['play', 'pause', 'next', 'previous']) expect(parseControl({ action: a })).toEqual({ action: a })
  })
  it('accepts a playlist with or without a speaker', () => {
    const uri = 'spotify:playlist:37i9dQZF1DXcBWIGoYBM5M'
    expect(parseControl({ action: 'playlist', uri })).toEqual({ action: 'playlist', uri })
    expect(parseControl({ action: 'playlist', uri, deviceId: 'abcdef1234567890' })).toEqual({ action: 'playlist', uri, deviceId: 'abcdef1234567890' })
  })
  it('drops a bad speaker id instead of passing it on', () => {
    expect(parseControl({ action: 'playlist', uri: 'spotify:album:37i9dQZF1DXcBWIGoYBM5M', deviceId: '../x?y' })).toEqual({ action: 'playlist', uri: 'spotify:album:37i9dQZF1DXcBWIGoYBM5M' })
  })
  it('rejects anything else', () => {
    expect(parseControl({ action: 'playlist', uri: 'https://evil.example/x' })).toBeNull()
    expect(parseControl({ action: 'playlist', uri: 'spotify:track:37i9dQZF1DXcBWIGoYBM5M' })).toBeNull()
    expect(parseControl({ action: 'transfer', deviceId: 'a/b' })).toBeNull()
    expect(parseControl({ action: 'volume' })).toBeNull()
    expect(parseControl({})).toBeNull()
  })
})
