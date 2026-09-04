// The two standalone reference apps the household keeps its know-how in.
// 4S links out to them from the village (a scene shortcut, the meals
// cards, the Kitchen overlay) rather than duplicating their content.
//
// Kitchen Cheat Sheet reads ?q= (jump straight to a search) and ?view=
// (open a view) as of 2026-09-03. Home Cheat Sheet is one static page —
// the base URL is all there is.

export const KITCHEN_URL = 'https://kitchencheatsheet.vercel.app'
export const HOME_URL = 'https://home-cheat-sheet-deploy.vercel.app/'

/** Kitchen Cheat Sheet, optionally pre-searched for a dish or a question. */
export function kitchenLookup(q?: string): string {
  const t = q?.trim()
  return t ? `${KITCHEN_URL}/?q=${encodeURIComponent(t)}` : KITCHEN_URL
}

export type KitchenView = 'convert' | 'swaps' | 'timers' | 'cookbook'

/** Kitchen Cheat Sheet opened straight to one of its views. */
export function kitchenView(v: KitchenView): string {
  return `${KITCHEN_URL}/?view=${v}`
}

/** Open a URL in a new tab, guarded for SSR. */
export function openExternal(url: string): void {
  if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener')
}
