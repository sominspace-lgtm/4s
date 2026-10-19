import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeFetchHtml } from '@/lib/recipes/safeFetch'
import { parseRecipeJsonLd, metaContent, htmlToText, youtubeDescription, isSocialUrl } from '@/lib/recipes/import'
import { aiRecipe } from '@/lib/recipes/ai'
import { aiConfigured } from '@/lib/ai/provider'
import type { RecipeDraft } from '@/lib/recipes/types'

// Save a recipe from a link, pasted text, or a photo (2026-10-13). Links try
// the page's own recipe markup first (exact, no AI), then the AI reads the
// page text or a social caption. Returns a draft; nothing is saved here.

const MAX_IMAGE_B64 = 6_000_000
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

// A light per-person limit so a stuck loop cannot run up AI cost.
const recent = new Map<string, number[]>()
function limited(userId: string): boolean {
  const now = Date.now()
  const hits = (recent.get(userId) ?? []).filter(t => now - t < 3_600_000)
  hits.push(now)
  recent.set(userId, hits)
  return hits.length > 40
}

const BLOCKED = "That site won't let 4S read it automatically. Use \"Save from any page\" below, which reads the page in your own browser, or paste the recipe text."
const NEEDS_TEXT = "That site would not let me read the recipe. Paste the caption or the recipe text instead, or upload a screenshot."

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (limited(user.id)) return NextResponse.json({ error: 'That is a lot of imports. Try again in a while.' }, { status: 429 })

  const body = await request.json().catch(() => ({})) as { url?: string; text?: string; image?: string; mime?: string }
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  const aiReady = aiConfigured()
  const notReady = () => NextResponse.json({ error: 'Reading recipes with AI is not set up on the server yet.', code: 'not-configured' }, { status: 503 })
  const done = (draft: RecipeDraft, via: string) => NextResponse.json({ draft, via })

  try {
    // --- a photo or screenshot
    if (typeof body.image === 'string' && body.image) {
      if (!aiReady) return notReady()
      const mime = (IMAGE_TYPES as readonly string[]).includes(body.mime ?? '') ? body.mime as (typeof IMAGE_TYPES)[number] : 'image/jpeg'
      if (body.image.length > MAX_IMAGE_B64) return NextResponse.json({ error: 'That picture is too big.' }, { status: 413 })
      const draft = await aiRecipe({ image: body.image, mime }, null)
      return draft ? done(draft, 'photo') : NextResponse.json({ error: 'I could not find a recipe in that picture.', code: 'no-recipe' }, { status: 422 })
    }

    // --- pasted text (a caption, an email, anything)
    if (typeof body.text === 'string' && body.text.trim() && !url) {
      if (!aiReady) return notReady()
      const draft = await aiRecipe({ text: body.text.slice(0, 14000) }, null)
      return draft ? done(draft, 'text') : NextResponse.json({ error: 'I could not find a recipe in that text.', code: 'no-recipe' }, { status: 422 })
    }

    // --- a link
    if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: 'Paste a link that starts with http.' }, { status: 400 })
    let page
    try { page = await safeFetchHtml(url) }
    catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not open that link.', code: 'fetch-failed' }, { status: 422 }) }

    // A bot wall or error page (403, 429, 5xx) holds no recipe, and sending it to the AI would only cost money.
    if (page.status >= 400) return NextResponse.json({ error: BLOCKED, code: 'blocked' }, { status: 422 })

    const fromSchema = parseRecipeJsonLd(page.html, url)
    if (fromSchema) {
      if (!fromSchema.image_url) fromSchema.image_url = metaContent(page.html, 'og:image')
      return done(fromSchema, 'schema')
    }

    // No recipe markup: gather whatever text the page gives.
    const title = metaContent(page.html, 'og:title') ?? ''
    const desc = metaContent(page.html, 'og:description') ?? metaContent(page.html, 'description') ?? ''
    const yt = youtubeDescription(page.html)
    const text = [title, yt ?? desc, isSocialUrl(url) ? '' : htmlToText(page.html)].filter(Boolean).join('\n\n').slice(0, 14000)
    if (text.replace(/\s+/g, ' ').length < 120) return NextResponse.json({ error: NEEDS_TEXT, code: 'needs-text' }, { status: 422 })
    if (!aiReady) {
      return NextResponse.json({ error: 'This page has no recipe markup, and reading it with AI is not set up on the server yet. Paste the recipe text instead.', code: 'not-configured' }, { status: 503 })
    }
    const draft = await aiRecipe({ text }, url)
    if (!draft) {
      return NextResponse.json({ error: isSocialUrl(url) ? NEEDS_TEXT : 'I could not find a recipe on that page.', code: isSocialUrl(url) ? 'needs-text' : 'no-recipe' }, { status: 422 })
    }
    if (!draft.image_url) draft.image_url = metaContent(page.html, 'og:image')
    return done(draft, yt ? 'youtube' : 'page')
  } catch {
    return NextResponse.json({ error: 'Something went wrong reading that. Try again.' }, { status: 502 })
  }
}
