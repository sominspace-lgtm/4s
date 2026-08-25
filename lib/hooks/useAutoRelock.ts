'use client'

import { useEffect, useRef } from 'react'

// "Personal sessions remain unlocked while actively being used and
// automatically lock when the user leaves/becomes inactive" (vision doc,
// Personal Privacy) — the gap this closes: UnlockPanel's PIN swap signs the
// WHOLE DEVICE into Harry's or Sylvia's real account and never signs back
// out. Once unlocked, the wall-mounted iPad would just stay logged in as
// whoever last unlocked it, indefinitely — exactly the "safe to leave on"
// promise broken.
//
// WAS_SHARED_KEY marks a specific browser as "this physical device is the
// shared kiosk" — set once, by UnlockPanel, the moment someone actually
// unlocks FROM shared mode. It's what lets this hook tell "Harry on the
// wall iPad" (relock after inactivity) apart from "Harry on his own phone"
// (never went through shared mode, never relock him out of his own device).
export const WAS_SHARED_DEVICE_KEY = '4s-was-shared-device'

export function useAutoRelock(sharedMode: boolean, timeoutMs = 3 * 60_000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (sharedMode) return // already shared — nothing to relock
    if (typeof window === 'undefined') return
    let wasShared = false
    try { wasShared = localStorage.getItem(WAS_SHARED_DEVICE_KEY) === '1' } catch { /* ignore */ }
    if (!wasShared) return

    async function relock() {
      try {
        await fetch('/api/auth/pin-login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: 'shared' }),
        })
      } finally {
        // A hard reload, not router.refresh() — this needs a completely
        // clean client state, not a re-render that might still be holding
        // personal data in memory from the session that just ended.
        window.location.href = '/dashboard'
      }
    }
    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(relock, timeoutMs)
    }

    reset()
    const events = ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const
    events.forEach(e => window.addEventListener(e, reset))
    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sharedMode, timeoutMs])
}
