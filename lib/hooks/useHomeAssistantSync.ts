'use client'

import { useEffect } from 'react'

// Keep the house's real state fresh while the Village is on screen
// (2026-11-18). Home Assistant does not push to SS, so every 30 seconds
// the Village asks the server to read it again; the new states then reach
// every screen through the smart home's own live updates. Does nothing
// when Home Assistant is not connected.
export function useHomeAssistantSync(spaceId: string | null, enabled = true) {
  useEffect(() => {
    if (!spaceId || !enabled) return
    let live = true
    let id: ReturnType<typeof setInterval> | null = null
    const sync = () => {
      if (document.visibilityState !== 'visible') return
      fetch('/api/smarthome/hass', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spaceId, action: 'sync' }),
      }).catch(() => null)
    }
    fetch(`/api/smarthome/hass?spaceId=${encodeURIComponent(spaceId)}`, { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(s => {
        if (!live || !s?.connected) return
        sync()
        id = setInterval(sync, 30_000)
      })
      .catch(() => null)
    return () => { live = false; if (id) clearInterval(id) }
  }, [spaceId, enabled])
}
