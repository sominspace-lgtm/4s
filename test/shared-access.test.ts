import { describe, it, expect } from 'vitest'
import { sharedSectionVisible } from '@/lib/utils/sharedAccess'

// The wall (a "Shared" login) must clamp down the moment a gathering goes
// live, and open back up when it ends.
describe('sharedSectionVisible', () => {
  const GUEST_SAFE = ['reference', 'village', 'places']
  const PLAIN_SHARED_EXTRA = ['home', 'upkeep', 'places-trips']
  const NEVER_SHARED = ['brief', 'tasks', 'habits', 'notes', 'money', 'people', 'smarthome']

  describe('plain shared view (no gathering)', () => {
    it('shows the household surfaces + village + places + trips', () => {
      for (const id of [...GUEST_SAFE, ...PLAIN_SHARED_EXTRA]) {
        expect(sharedSectionVisible(id, false)).toBe(true)
      }
    })
    it('still hides personal sections', () => {
      for (const id of NEVER_SHARED) expect(sharedSectionVisible(id, false)).toBe(false)
    })
  })

  describe('guest / host mode (a gathering is live)', () => {
    it('keeps only the guest-safe set', () => {
      for (const id of GUEST_SAFE) expect(sharedSectionVisible(id, true)).toBe(true)
    })
    it('locks down Home, Upkeep and Trips', () => {
      for (const id of PLAIN_SHARED_EXTRA) expect(sharedSectionVisible(id, true)).toBe(false)
    })
    it('still hides personal sections', () => {
      for (const id of NEVER_SHARED) expect(sharedSectionVisible(id, true)).toBe(false)
    })
  })

  it('every guest-safe section is a subset of plain shared view', () => {
    for (const id of GUEST_SAFE) {
      expect(sharedSectionVisible(id, true) && !sharedSectionVisible(id, false)).toBe(false)
    }
  })
})
