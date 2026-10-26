// Open one thing, not just its page (2026-10-26). Search leaves a note of
// what to open; the page picks it up once it has loaded its rows, whether it
// was already on screen or is opening now.

export type OpenKind = 'note' | 'place'
const KEY = '4s:open-item'
export const OPEN_ITEM_EVENT = '4s:open-item'

export function requestOpen(kind: OpenKind, id: string) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ kind, id })) } catch { /* private mode */ }
  setTimeout(() => window.dispatchEvent(new CustomEvent(OPEN_ITEM_EVENT)), 120)
}

/** The id waiting to be opened for this kind, if `has` says it is loaded. Taken once. */
export function takeOpen(kind: OpenKind, has: (id: string) => boolean): string | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as { kind: OpenKind; id: string }
    if (v.kind !== kind || !has(v.id)) return null
    sessionStorage.removeItem(KEY)
    return v.id
  } catch { return null }
}
