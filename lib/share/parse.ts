// Something shared to 4S from the phone's share sheet (2026-10-13). Android
// often puts the link in `text` rather than `url`, so the first link found in
// any of the three fields is the link, and what is left is the words.

export interface SharedItem { title: string; text: string; url: string | null }

const LINK = /https?:\/\/[^\s<>"')]+/i

export function parseShared(raw: { title?: string | null; text?: string | null; url?: string | null }): SharedItem | null {
  const title = (raw.title ?? '').trim()
  const text = (raw.text ?? '').trim()
  const url = (raw.url ?? '').trim()
  const raw0 = (LINK.exec(url) ?? LINK.exec(text) ?? LINK.exec(title))?.[0] ?? null
  const found = raw0 ? raw0.replace(/[.,;]+$/, '') : null
  const strip = (s: string) => (raw0 ? s.split(raw0).join('') : s).replace(/\s+/g, ' ').trim()
  const words = [strip(title), strip(text)].filter((s, i, a) => s && a.indexOf(s) === i)
  if (!found && !words.length) return null
  return { title: words[0] ?? '', text: words.slice(1).join(' ') , url: found }
}

export const SHARE_PARAM = 'share'

export function encodeShared(item: { title: string; text: string; url: string }): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(item)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeShared(param: string): SharedItem | null {
  try {
    const b = param.replace(/-/g, '+').replace(/_/g, '/')
    const o = JSON.parse(decodeURIComponent(escape(atob(b)))) as { title?: string; text?: string; url?: string }
    return parseShared(o)
  } catch { return null }
}

export const RECIPE_URL_KEY = '4s:recipe-url'
