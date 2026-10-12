import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// A pasted link (Instagram, TikTok, a blog, a restaurant's own site) gets a
// title the same way iMessage/Discord/Slack already show you one when you
// paste it there: og:title/og:image are meta tags a page sets specifically
// so link-sharing tools can unfurl it, server-rendered even on JS-heavy
// platforms — no AI call needed, and it works generically for ANY url, not
// just recognized social platforms. Deterministic regex, not the AI
// extract-link task (that one's for scraping a whole PRODUCT page's fields;
// this just wants the one line a page already publishes for exactly this
// purpose). Saving the link never depends on this succeeding — see
// LinksSection.tsx, which saves the raw url with a null title on failure.
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url') ?? ''
  if (!/^https?:\/\//.test(url)) return NextResponse.json({ error: 'Expected an http(s) URL' }, { status: 400 })

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 4S-Home/1.0; link-preview)' },
    })
    if (!res.ok) return NextResponse.json({ title: null, image: null })
    // Only the <head> needs scanning for meta tags — reading the whole body
    // of a heavy page just to throw it away is wasted bandwidth.
    const head = (await res.text()).slice(0, 60_000)

    const meta = (prop: string) =>
      head.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))?.[1]
      ?? head.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))?.[1]
      ?? null

    const title = meta('og:title') ?? head.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? null
    const image = meta('og:image')
    // A shop page often publishes its price for the same reason it publishes
    // a title: so link unfurlers can show it. Meta tags first, then JSON-LD.
    const rawPrice = meta('product:price:amount') ?? meta('og:price:amount')
      ?? head.match(/"price"\s*:\s*"?([0-9]+(?:[.,][0-9]{1,2})?)"?/)?.[1] ?? null
    const price = rawPrice ? Number(rawPrice.replace(',', '.')) : null
    const siteName = meta('og:site_name')

    return NextResponse.json({
      title: title ? decodeHtmlEntities(title.trim()).slice(0, 200) : null,
      image,
      price: price != null && Number.isFinite(price) && price > 0 && price < 1_000_000 ? price : null,
      siteName: siteName ? decodeHtmlEntities(siteName.trim()).slice(0, 80) : null,
    })
  } catch {
    return NextResponse.json({ title: null, image: null })
  }
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}
