'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// The wall-mounted-iPad "Shared" login is meant to sit untouched for hours —
// a digital picture frame, not a dashboard someone left open. After
// `timeoutMs` of no interaction, `ambient` flips true so the caller can hide
// its own chrome (nav bars, customize buttons, widget docks) and let the
// Village scene stand alone. Any pointer/touch/key/scroll clears it
// immediately — there's no "wake up" gesture beyond just touching the
// screen, matching how a real picture frame behaves.
//
// enabled=false (anything other than shared/kiosk mode) installs no
// listeners and never goes ambient — a personal login should never have its
// own nav randomly disappear.
//
// Returns a `resetIdleTimer` the caller can invoke directly for interaction
// this hook's own window listeners wouldn't catch on their own — a drag
// gesture is pointerdown once, then a stream of pointermove with no further
// pointerdown, and ambient shouldn't creep back on mid-swipe (see
// VillageHomeSheet).
export function useIdleAmbient(enabled: boolean, timeoutMs = 60_000) {
  const [ambient, setAmbient] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetIdleTimer = useCallback(() => {
    setAmbient(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setAmbient(true), timeoutMs)
  }, [timeoutMs])

  useEffect(() => {
    if (!enabled) { setAmbient(false); return }
    resetIdleTimer()
    const events = ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const
    events.forEach(e => window.addEventListener(e, resetIdleTimer))
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enabled, resetIdleTimer])

  return [ambient, resetIdleTimer] as const
}
