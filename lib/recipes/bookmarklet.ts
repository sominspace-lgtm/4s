// "Save to 4S" from any page (2026-10-13). Plenty of recipe sites (and every
// social site) turn away a server that tries to read them, but the page is
// already open and readable in the person's own browser. A bookmarklet runs
// there: it pulls the page's recipe markup (or, failing that, its visible
// text), packs it into a link, and opens 4S with it. No server ever has to
// get past the site's bot check, and recipe markup needs no AI at all.

import type { RecipeDraft } from './types'
import { parseRecipeJsonLd } from './import'

export type Incoming =
  | { kind: 'ld'; blocks: string[]; url: string }
  | { kind: 'text'; text: string; url: string }

export const INCOMING_KEY = '4s:recipe-import'
const MAX_PARAM = 90_000

/** The code to save as a bookmark. Runs on the recipe page, opens 4S with the result. */
export function buildBookmarklet(origin: string): string {
  const code = `(()=>{try{
var ld=[].slice.call(document.querySelectorAll('script[type="application/ld+json"]')).map(function(s){return s.textContent||''}).filter(function(t){return /"Recipe"/.test(t)}).slice(0,3).map(function(t){return t.slice(0,30000)});
var p=ld.length?{k:'ld',v:ld,u:location.href}:{k:'text',v:(document.title+'\\n'+document.body.innerText).slice(0,9000),u:location.href};
var b=btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
window.open(${JSON.stringify(origin)}+'/dashboard?recipe='+b,'_blank')
}catch(e){alert('Could not read this page.')}})()`
  return 'javascript:' + code.replace(/\n/g, '')
}

/** Reads the ?recipe= value back into what the bookmarklet packed. null if it is not ours or is malformed. */
export function decodeIncoming(param: string): Incoming | null {
  if (!param || param.length > MAX_PARAM || !/^[A-Za-z0-9_-]+$/.test(param)) return null
  try {
    const b64 = param.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
    const o = JSON.parse(new TextDecoder().decode(bytes)) as { k?: string; v?: unknown; u?: unknown }
    const url = typeof o.u === 'string' && /^https?:\/\//i.test(o.u) ? o.u : ''
    if (o.k === 'ld' && Array.isArray(o.v)) return { kind: 'ld', blocks: o.v.filter((x): x is string => typeof x === 'string'), url }
    if (o.k === 'text' && typeof o.v === 'string') return { kind: 'text', text: o.v, url }
  } catch { /* not ours */ }
  return null
}

/** A page's recipe markup, parsed in the browser. */
export function draftFromBlocks(blocks: string[], url: string): RecipeDraft | null {
  for (const b of blocks) {
    const d = parseRecipeJsonLd(`<script type="application/ld+json">${b}</script>`, url || null)
    if (d) return d
  }
  return null
}
