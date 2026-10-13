import { parseIngredient } from './ingredients'
import type { RecipeDraft } from './types'

// Turning a web page into a recipe (2026-10-13). Most recipe sites publish a
// schema.org "Recipe" block (JSON-LD) so search engines can read them; that
// is the first and most accurate source. When a page has none (a blog post,
// a social caption), the text goes to the AI to read instead, see the
// import route. Everything here is pure so the odd shapes are tested.

/** "PT1H20M" -> 80. Also tolerates "20 minutes" and plain numbers. */
export function parseDuration(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : null
  if (typeof v !== 'string') return null
  const iso = v.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/i)
  if (iso && (iso[1] || iso[2] || iso[3])) return Number(iso[1] ?? 0) * 1440 + Number(iso[2] ?? 0) * 60 + Number(iso[3] ?? 0)
  const plain = v.match(/(\d+)\s*(hour|hr|h|minute|min|m)/gi)
  if (plain) {
    let total = 0
    for (const part of plain) {
      const m = part.match(/(\d+)\s*([a-z]+)/i)!
      total += /^h/i.test(m[2]) ? Number(m[1]) * 60 : Number(m[1])
    }
    return total || null
  }
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

/** recipeYield comes as 4, "4", "4 servings", ["4", "4 servings"], "Makes 12 cookies". */
export function parseServings(v: unknown): number | null {
  const first = Array.isArray(v) ? v[0] : v
  if (typeof first === 'number') return first > 0 ? first : null
  if (typeof first !== 'string') return null
  const m = first.match(/\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

/** "320 calories", "320 kcal", 320 -> 320. */
export function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const m = v.replace(',', '').match(/\d+(?:\.\d+)?/)
  return m ? Number(m[0]) : null
}

const decode = (s: string) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))

const clean = (s: unknown): string => (typeof s === 'string' ? decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() : '')

function stepsOf(instr: unknown): string[] {
  if (!instr) return []
  if (typeof instr === 'string') {
    // One block of text, steps split by line breaks or numbered lines.
    return instr.split(/\n+|(?<=\.)\s+(?=\d+\.\s)/).map(clean).map(s => s.replace(/^\d+[.)]\s*/, '')).filter(Boolean)
  }
  if (Array.isArray(instr)) return instr.flatMap(stepsOf)
  if (typeof instr === 'object') {
    const o = instr as { text?: unknown; name?: unknown; itemListElement?: unknown }
    if (o.itemListElement) return stepsOf(o.itemListElement) // a HowToSection
    const t = clean(o.text) || clean(o.name)
    return t ? [t] : []
  }
  return []
}

function imageOf(img: unknown): string | null {
  if (!img) return null
  if (typeof img === 'string') return img
  if (Array.isArray(img)) return imageOf(img[0])
  if (typeof img === 'object') return imageOf((img as { url?: unknown }).url)
  return null
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) { for (const n of node) { const r = findRecipeNode(n); if (r) return r } return null }
  const o = node as Record<string, unknown>
  const t = o['@type']
  if (t === 'Recipe' || (Array.isArray(t) && t.includes('Recipe'))) return o
  if (o['@graph']) return findRecipeNode(o['@graph'])
  return null
}

/** The Recipe block from a page's JSON-LD, or null if the page has none. */
export function parseRecipeJsonLd(html: string, sourceUrl: string | null = null): RecipeDraft | null {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const b of blocks) {
    let json: unknown
    try { json = JSON.parse(b[1].trim()) } catch { continue }
    const r = findRecipeNode(json)
    if (!r) continue
    const ingredients = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : []).map(clean).filter(Boolean).map(t => parseIngredient(t))
    const steps = stepsOf(r.recipeInstructions)
    if (!clean(r.name) || (ingredients.length === 0 && steps.length === 0)) continue
    const nutrition = (r.nutrition ?? {}) as Record<string, unknown>
    const author = r.author as { name?: unknown } | { name?: unknown }[] | string | undefined
    const authorName = typeof author === 'string' ? author : Array.isArray(author) ? clean(author[0]?.name) : clean(author?.name)
    const keywords = typeof r.keywords === 'string' ? r.keywords.split(',') : Array.isArray(r.keywords) ? r.keywords : []
    let host: string | null = null
    try { host = sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, '') : null } catch { /* no usable url */ }
    return {
      title: clean(r.name),
      source_url: sourceUrl,
      source_name: authorName || host,
      image_url: imageOf(r.image),
      servings: parseServings(r.recipeYield) ?? 2,
      prep_minutes: parseDuration(r.prepTime),
      cook_minutes: parseDuration(r.cookTime) ?? (parseDuration(r.totalTime) && parseDuration(r.prepTime) ? parseDuration(r.totalTime)! - parseDuration(r.prepTime)! : parseDuration(r.totalTime)),
      ingredients,
      steps,
      notes: null,
      tags: keywords.map(k => clean(k).toLowerCase()).filter(k => k && k.length < 30).slice(0, 8),
      calories: parseNumber(nutrition.calories),
      protein: parseNumber(nutrition.proteinContent),
      carbs: parseNumber(nutrition.carbohydrateContent),
      fat: parseNumber(nutrition.fatContent),
    }
  }
  return null
}

export function metaContent(html: string, prop: string): string | null {
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'))
  const b = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))
  const v = a?.[1] ?? b?.[1]
  return v ? decode(v).trim() : null
}

/** Visible text of a page, scripts and styles dropped, for the AI to read. */
export function htmlToText(html: string, max = 14000): string {
  return decode(
    html.replace(/<(script|style|noscript|svg|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, '\n').replace(/<[^>]+>/g, ' '),
  ).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim().slice(0, max)
}

/** YouTube puts the full video description in the page's player data. */
export function youtubeDescription(html: string): string | null {
  const m = html.match(/"shortDescription":"((?:\\.|[^"\\])*)"/)
  if (!m) return null
  try { return JSON.parse(`"${m[1]}"`) as string } catch { return null }
}

/** Social pages rarely hold a recipe in markup; the caption is the useful part. */
export function isSocialUrl(url: string): boolean {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '')
    return /(^|\.)(instagram\.com|tiktok\.com|facebook\.com|fb\.watch|pinterest\.com|pin\.it|youtube\.com|youtu\.be|x\.com|twitter\.com|threads\.net|reddit\.com)$/.test(h)
  } catch { return false }
}

/** Shapes an AI result (or any loose object) into a RecipeDraft the app can save. */
export function draftFromLoose(o: Record<string, unknown>, sourceUrl: string | null): RecipeDraft {
  const lines = (v: unknown) => (Array.isArray(v) ? v : []).map(x => (typeof x === 'string' ? x : '')).map(s => s.trim()).filter(Boolean)
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null)
  let host: string | null = null
  try { host = sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./, '') : null } catch { /* no usable url */ }
  return {
    title: typeof o.title === 'string' ? o.title.trim() : '',
    source_url: sourceUrl,
    source_name: typeof o.source_name === 'string' && o.source_name.trim() ? o.source_name.trim() : host,
    image_url: typeof o.image_url === 'string' ? o.image_url : null,
    servings: num(o.servings) || 2,
    prep_minutes: num(o.prep_minutes),
    cook_minutes: num(o.cook_minutes),
    ingredients: lines(o.ingredients).map(t => parseIngredient(t)),
    steps: lines(o.steps),
    notes: typeof o.notes === 'string' && o.notes.trim() ? o.notes.trim() : null,
    tags: lines(o.tags).map(t => t.toLowerCase()).slice(0, 8),
    calories: num(o.calories), protein: num(o.protein), carbs: num(o.carbs), fat: num(o.fat),
  }
}
