import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

// One AI endpoint for the whole app: refill label/link extraction, Council
// reviews, and Ask Jarvis. Haiku keeps per-call cost negligible for a
// personal dashboard; override with AI_MODEL in env if you want more depth.
// If ANTHROPIC_API_KEY is not set, every task returns 503 and the client
// falls back to its previous mock / rule-based behavior.
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

const COUNCIL_DOMAIN_IDS = ['biz-active', 'biz-future', 'money', 'health', 'relationship', 'creative', 'home', 'self', 'sharing', 'planning'] as const

const COUNCIL_SCHEMA = {
  type: 'object',
  properties: {
    advisors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          domain: { type: 'string', enum: [...COUNCIL_DOMAIN_IDS] },
          verdict: { type: 'string', enum: ['fine', 'watch', 'quiet'] },
          advice: { type: 'string', description: '1-2 sentences, specific to the data, calm tone' },
        },
        required: ['domain', 'verdict', 'advice'],
        additionalProperties: false,
      },
    },
    suggestedAction: { type: 'string', description: 'One concrete next action, a single sentence' },
  },
  required: ['advisors', 'suggestedAction'],
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

      case 'council': {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 2048,
          output_config: { format: { type: 'json_schema', schema: COUNCIL_SCHEMA } },
          system: `You are the Council in 4S Home, a calm personal life dashboard. Ten advisors each review one life domain: biz-active (Business), biz-future (Pipeline), money (Finance), health (Health), relationship (Relationship), creative (Creative), home (Home), self (Self), sharing (Sharing), planning (Planning). Personality mode: ${body.mode ?? 'balanced'} — adjust tone accordingly but stay kind and never alarmist. Verdicts: "watch" only when the data shows something real to act on, "fine" when actively healthy, "quiet" when there is simply no data yet. For empty areas suggest gentle setup, never guilt. Return exactly one entry per domain.`,
          messages: [{
            role: 'user',
            content: `Here is my current dashboard data as JSON. Convene the council.\n\n${JSON.stringify(body.snapshot ?? {})}`,
          }],
        })
        return NextResponse.json({ result: JSON.parse(firstText(response.content)) })
      }

      case 'jarvis': {
        const question: string = (body.question ?? '').slice(0, 500)
        if (!question.trim()) return NextResponse.json({ error: 'Missing question' }, { status: 400 })
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 600,
          system: 'You are Jarvis, the assistant inside 4S Home, a calm personal life dashboard. Answer from the provided dashboard snapshot only — do not invent data that is not in it. Be brief (2-5 sentences), warm, and concrete. If the snapshot lacks the answer, say so and suggest where in the app to add it. Plain text, no markdown headers.',
          messages: [{
            role: 'user',
            content: `Dashboard snapshot:\n${JSON.stringify(body.snapshot ?? {})}\n\nQuestion: ${question}`,
          }],
        })
        return NextResponse.json({ result: firstText(response.content) })
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
