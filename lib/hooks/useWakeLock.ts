'use client'

import { useEffect } from 'react'

// Keep the screen on (2026-10-16) — the shared iPad is a picture frame of the
// village, and it should not go dark on its own. The browser drops the lock
// whenever the page is hidden, so it is asked for again on return. Safari
// 16.4+ and Chrome support this; elsewhere it quietly does nothing.
type Lock = { release: () => Promise<void> }

export function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<Lock> } }
    if (!nav.wakeLock) return
    let lock: Lock | null = null
    let live = true
    const ask = () => {
      if (document.visibilityState !== 'visible') return
      nav.wakeLock!.request('screen').then(l => { if (live) lock = l; else void l.release() }).catch(() => {})
    }
    ask()
    document.addEventListener('visibilitychange', ask)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', ask)
      void lock?.release().catch(() => {})
    }
  }, [enabled])
}
