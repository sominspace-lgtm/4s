import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

// One AI endpoint for the whole app: refill label/link extraction and
// natural-language task parsing. Haiku keeps per-call cost negligible for a
// personal dashboard; override with AI_MODEL in env if you want more depth.
// If ANTHROPIC_API_KEY is not set, every task returns 503 and the client
// falls back to its rule-based behavior.
const MODEL = process.env.AI_MODEL ?? 'claude-haiku-4-5'

const REFILL_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Short product name, e.g. "Vitamin D3 2000 IU"' },
    category: { type: 'string', enum: ['supplements', 'medicine', 'pet-care', 'personal-care', 'household', 'groceries', 'other'] },
    quantity: { type: ['number', 'null'], description: 'Units in the package, e.g. 120 capsules → 120' },
    servingCount: { type: ['number', 'null'], description: 'Servings per container if stated' },
    servingSize: { type: ['string', 'null'], description: 'e.g. "2 capsules"' },
    usagePerDay: { type: ['number', 'null'], description: 'Servings used per day if stated or clearly implied' },
    estimatedDaysSupply: { type: ['number', 'null'], description: 'Days the package lasts at the stated usage' },
    price: { type: ['number', 'null'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
  },
  required: ['name', 'category', 'quantity', 'servingCount', 'servingSize', 'usagePerDay', 'estimatedDaysSupply', 'price', 'confidence'],
  additionalProperties: false,
} as const

const TASK_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Short imperative task title with all date/time words removed' },
    dueDate: { type: ['string', 'null'], description: 'yyyy-MM-dd, or null if no date is implied' },
    energy: { type: ['string', 'null'], enum: ['light', 'medium', 'deep', null], description: 'deep = focused/creative work; light = a quick errand; medium otherwise; null if unclear' },
  },
  required: ['title', 'dueDate', 'energy'],
  additionalProperties: false,
} as const

const SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    answer: { type: ['string', 'null'], description: 'One plain sentence answering the question from the items, or null if the items do not contain an answer' },
    matchIds: { type: 'array', items: { type: 'string' }, description: 'Ids of the most relevant items, best match first, at most 8' },
  },
  required: ['answer', 'matchIds'],
  additionalProperties: false,
} as const

function firstText(content: Anthropic.ContentBlock[]): string {
  const block = content.find(b => b.type === 'text')
  return block && block.type === 'text' ? block.text : ''
}

async function fetchPageText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; 4S-Home/1.0)' },
    })
    if (!res.ok) return null
    const html = await res.text()
    // Crude tag strip — enough signal for the model to find name/quantity/price.
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .slice(0, 16000)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'not-configured' }, { status: 503 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.task) return NextResponse.json({ error: 'Missing task' }, { status: 400 })

  const client = new Anthropic()

  try {
    switch (body.task) {
      case 'extract-label': {
        const dataUrl: string = body.image ?? ''
        const match = dataUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/)
        if (!match) return NextResponse.json({ error: 'Expected a base64 image data URL' }, { status: 400 })
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 1024,
          output_config: { format: { type: 'json_schema', schema: REFILL_SCHEMA } },
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: match[1] as 'image/png', data: match[2] } },
              { type: 'text', text: 'Read this product label and extract the fields. Use null for anything not visible. Set confidence based on how clearly the label shows quantity and usage.' },
            ],
          }],
        })
        return NextResponse.json({ result: JSON.parse(firstText(response.content)) })
      }

      case 'extract-link': {
        const url: string = body.url ?? ''
        if (!/^https?:\/\//.test(url)) return NextResponse.json({ error: 'Expected an http(s) URL' }, { status: 400 })
        const pageText = await fetchPageText(url)
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 1024,
          output_config: { format: { type: 'json_schema', schema: REFILL_SCHEMA } },
          messages: [{
            role: 'user',
            content: pageText
              ? `This is text from a product page (${url}). Extract the product fields; null for anything not stated. Confidence "low" if the page text is ambiguous.\n\n${pageText}`
              : `I could not fetch this product page, so infer what you can from the URL alone (usually just an approximate name): ${url}. Set confidence to "low" and null for unknown fields.`,
          }],
        })
        return NextResponse.json({ result: JSON.parse(firstText(response.content)) })
      }

      // Natural-language quick-add (2026-09-01) — the caller shows the
      // result as a suggestion chip before anything is saved, and falls
      // back to lib/utils/parseTask.ts' pure-string rules if this 503s.
      case 'parse-task': {
        const text: string = (body.text ?? '').slice(0, 300)
        if (!text.trim()) return NextResponse.json({ error: 'Missing text' }, { status: 400 })
        const today = new Date().toISOString().slice(0, 10)
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 200,
          output_config: { format: { type: 'json_schema', schema: TASK_SCHEMA } },
          system: `Today is ${today}. Turn a quick task note into structured fields for a personal to-do list. The title must be short and imperative with every date, time, and "due" word stripped out. Resolve relative dates ("tomorrow", "next thursday", "in 2 weeks") against today.`,
          messages: [{ role: 'user', content: text }],
        })
        return NextResponse.json({ result: JSON.parse(firstText(response.content)) })
      }

      // Semantic search over the user's own items (2026-09-01) — the client
      // has already done a literal ILIKE pass; this handles the questions
      // that don't match a substring ("what did I say I'd do about the car").
      // Falls back to the literal results if it 503s.
      case 'search': {
        const query: string = (body.query ?? '').slice(0, 200)
        const items = Array.isArray(body.items) ? (body.items as { id?: unknown; title?: unknown; type?: unknown }[]) : []
        const clean = items
          .filter(i => typeof i.id === 'string' && typeof i.title === 'string')
          .slice(0, 40)
          .map(i => ({ id: i.id as string, title: (i.title as string).slice(0, 160), type: typeof i.type === 'string' ? i.type : '' }))
        if (!query.trim() || clean.length === 0) return NextResponse.json({ error: 'Missing query or items' }, { status: 400 })
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 300,
          output_config: { format: { type: 'json_schema', schema: SEARCH_SCHEMA } },
          system: 'You help someone search their own notes, tasks, and habits. Given their query and a list of their items (id, title, type), return the ids of the items that best answer or match the query, best first, at most 8. If the query is a question the item titles actually answer, also give a one-sentence plain answer; otherwise answer must be null. Never invent items or ids.',
          messages: [{ role: 'user', content: `Query: ${query}\n\nItems:\n${clean.map(i => `${i.id} [${i.type}] ${i.title}`).join('\n')}` }],
        })
        return NextResponse.json({ result: JSON.parse(firstText(response.content)) })
      }

      default:
        return NextResponse.json({ error: `Unknown task: ${body.task}` }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed'
    // Rate limits / overload / bad key all land here — clients fall back.
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
