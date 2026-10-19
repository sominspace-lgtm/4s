// Settings that belong to one device, not an account (2026-10-19): the
// shared iPad's guest view, older-iPad mode, screen staying on, and the
// bedtime dim. Kept in this browser; a change tells every open screen.

export const DEVICE_EVENT = '4s:device-settings'

export const DEVICE_KEYS = {
  guestView: '4s:guest-view',
  lite: '4s:village-lite',
  keepAwake: '4s:keep-awake',
  bedtime: '4s:bedtime-dim',
} as const

export function readDevice(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function writeDevice(key: string, value: string | null) {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value) } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent(DEVICE_EVENT, { detail: key }))
}
