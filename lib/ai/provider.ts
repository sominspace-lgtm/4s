import Anthropic from '@anthropic-ai/sdk'

// Which AI 4S uses (2026-10-19). Free first: Groq, then Google Gemini when
// Groq is at its daily limit or down, then Claude only if a key for it is set.
// Groq and Gemini both speak the OpenAI chat format, so one adapter covers
// them. Order can be changed with AI_PROVIDERS (e.g. "gemini,groq").
// Server-only: it reads API keys.

export type ProviderId = 'groq' | 'gemini' | 'anthropic'

interface OpenAiLike { id: 'groq' | 'gemini'; base: string; key: string; model: string; visionModel: string }

function openAiLike(id: 'groq' | 'gemini'): OpenAiLike | null {
  if (id === 'groq') {
    const key = process.env.GROQ_API_KEY
    return key ? {
      id, key, base: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      visionModel: process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
    } : null
  }
  const key = process.env.GEMINI_API_KEY
  return key ? {
    id, key, base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    visionModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  } : null
}

export function providerOrder(): ProviderId[] {
  const wanted = (process.env.AI_PROVIDERS || 'groq,gemini,anthropic').split(',').map(s => s.trim()) as ProviderId[]
  return wanted.filter(p => (p === 'anthropic' ? !!process.env.ANTHROPIC_API_KEY : !!openAiLike(p as 'groq' | 'gemini')))
}

/** Is any AI set up on the server? */
export function aiConfigured(): boolean { return providerOrder().length > 0 }

const ANTHROPIC_MODEL = process.env.AI_MODEL ?? 'claude-haiku-4-5'

export class AiError extends Error {
  constructor(message: string, public retryable: boolean) { super(message) }
}

async function postJson(p: OpenAiLike, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  let res: Response
  try {
    res = await fetch(`${p.base}/chat/completions`, {
      method: 'POST', signal: AbortSignal.timeout(45_000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${p.key}` },
      body: JSON.stringify(body),
    })
  } catch { throw new AiError(`${p.id} did not answer`, true) }
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    // Limits, outages, and "this model cannot do that" all move on to the next provider.
    throw new AiError(`${p.id} ${res.status}: ${t.slice(0, 200)}`, true)
  }
  return res.json() as Promise<Record<string, unknown>>
}

// ── Structured answers (JSON) ───────────────────────────────────────────────

export interface JsonRequest {
  system?: string
  text?: string
  image?: { mime: string; data: string }
  schema: Record<string, unknown>
  maxTokens?: number
}

/** Fill in any required field the model left out, so callers get the full shape. */
export function fillRequired(value: unknown, schema: Record<string, unknown>): unknown {
  if (schema.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    const o = value as Record<string, unknown>
    const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>
    for (const k of (schema.required ?? []) as string[]) {
      if (!(k in o)) o[k] = props[k]?.type === 'array' ? [] : null
      else if (props[k]) o[k] = fillRequired(o[k], props[k])
    }
    return o
  }
  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    return value.map(v => fillRequired(v, schema.items as Record<string, unknown>))
  }
  return value
}

export function parseLooseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try { return JSON.parse(t) } catch { /* fall through */ }
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1))
  throw new Error('not json')
}

async function jsonOpenAi(p: OpenAiLike, r: JsonRequest): Promise<unknown> {
  const system = `${r.system ?? ''}\n\nAnswer with one JSON object and nothing else. It must follow this JSON Schema exactly, using null where a value is unknown:\n${JSON.stringify(r.schema)}`.trim()
  const user = r.image
    ? [{ type: 'text', text: r.text || 'Read this image.' }, { type: 'image_url', image_url: { url: `data:${r.image.mime};base64,${r.image.data}` } }]
    : (r.text ?? '')
  const j = await postJson(p, {
    model: r.image ? p.visionModel : p.model,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    max_tokens: r.maxTokens ?? 1200, temperature: 0.2,
    response_format: { type: 'json_object' },
  })
  const content = ((j.choices as { message?: { content?: string } }[] | undefined)?.[0]?.message?.content) ?? ''
  try { return fillRequired(parseLooseJson(content), r.schema) } catch { throw new AiError(`${p.id} sent something that was not JSON`, true) }
}

async function jsonAnthropic(r: JsonRequest): Promise<unknown> {
  const client = new Anthropic()
  const content: Anthropic.ContentBlockParam[] = r.image
    ? [{ type: 'image', source: { type: 'base64', media_type: r.image.mime as 'image/jpeg', data: r.image.data } }, { type: 'text', text: r.text || 'Read this image.' }]
    : [{ type: 'text', text: r.text ?? '' }]
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL, max_tokens: r.maxTokens ?? 1200,
    ...(r.system ? { system: r.system } : {}),
    output_config: { format: { type: 'json_schema', schema: r.schema } },
    messages: [{ role: 'user', content }],
  })
  const block = res.content.find(b => b.type === 'text')
  return JSON.parse(block && block.type === 'text' ? block.text : '{}')
}

/** One structured answer, from the first provider that can give it. */
export async function generateJson<T = unknown>(r: JsonRequest): Promise<T> {
  const order = providerOrder()
  if (!order.length) throw new AiError('No AI is set up on the server.', false)
  let last: unknown = null
  for (const id of order) {
    try {
      return (id === 'anthropic' ? await jsonAnthropic(r) : await jsonOpenAi(openAiLike(id)!, r)) as T
    } catch (e) { last = e }
  }
  throw last instanceof Error ? last : new AiError('The AI could not answer.', true)
}

// ── Tool use (Jarvis) ───────────────────────────────────────────────────────

export interface ToolSpec { name: string; description: string; input_schema: Record<string, unknown> }
export interface ToolCall { id: string; name: string; input: Record<string, unknown> }
export interface ToolResult { id: string; content: string; isError?: boolean }

/** One conversation with tools. `next` asks the model; `answer` feeds tool results back. */
export interface ToolSession {
  provider: ProviderId
  next(): Promise<{ text: string; calls: ToolCall[] }>
  answer(results: ToolResult[]): void
}

function openAiSession(p: OpenAiLike, system: string, turns: { role: 'user' | 'assistant'; content: string }[], tools: ToolSpec[]): ToolSession {
  const messages: Record<string, unknown>[] = [{ role: 'system', content: system }, ...turns]
  const fns = tools.map(t => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.input_schema } }))
  return {
    provider: p.id,
    async next() {
      const j = await postJson(p, { model: p.model, messages, tools: fns, tool_choice: 'auto', max_tokens: 1200, temperature: 0.3 })
      const msg = ((j.choices as { message?: Record<string, unknown> }[] | undefined)?.[0]?.message) ?? {}
      const raw = (msg.tool_calls as { id: string; function: { name: string; arguments: string } }[] | undefined) ?? []
      // With tool calls the text is often empty; send null, which every OpenAI-style API accepts.
      messages.push({ role: 'assistant', content: (msg.content as string | null) || (raw.length ? null : ''), ...(raw.length ? { tool_calls: raw } : {}) })
      const calls = raw.map(c => {
        let input: Record<string, unknown> = {}
        try { input = JSON.parse(c.function.arguments || '{}') } catch { /* leave empty; the tool reports what is missing */ }
        return { id: c.id, name: c.function.name, input }
      })
      return { text: ((msg.content as string | null) ?? '').trim(), calls }
    },
    answer(results) {
      for (const r of results) messages.push({ role: 'tool', tool_call_id: r.id, content: r.isError ? `Error: ${r.content}` : r.content })
    },
  }
}

function anthropicSession(system: string, turns: { role: 'user' | 'assistant'; content: string }[], tools: ToolSpec[]): ToolSession {
  const client = new Anthropic()
  const messages: Anthropic.MessageParam[] = turns.map(t => ({ role: t.role, content: t.content }))
  const specs = tools.map(t => ({ name: t.name, description: t.description, input_schema: t.input_schema as Anthropic.Tool['input_schema'] }))
  return {
    provider: 'anthropic',
    async next() {
      const res = await client.messages.create({ model: ANTHROPIC_MODEL, max_tokens: 1200, system, tools: specs, messages })
      messages.push({ role: 'assistant', content: res.content })
      const text = res.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('\n').trim()
      const calls = res.stop_reason === 'tool_use'
        ? res.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use').map(b => ({ id: b.id, name: b.name, input: (b.input ?? {}) as Record<string, unknown> }))
        : []
      return { text, calls }
    },
    answer(results) {
      messages.push({ role: 'user', content: results.map(r => ({ type: 'tool_result' as const, tool_use_id: r.id, content: r.content, is_error: r.isError })) })
    },
  }
}

/** Sessions to try, in order. The caller starts over with the next one if the first fails. */
export function toolSessions(system: string, turns: { role: 'user' | 'assistant'; content: string }[], tools: ToolSpec[]): (() => ToolSession)[] {
  return providerOrder().map(id => () => (id === 'anthropic' ? anthropicSession(system, turns, tools) : openAiSession(openAiLike(id)!, system, turns, tools)))
}
