import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { resolveHouseholdToken } from '@/lib/household/resources'

// Travel recommendations for the Discord bot — deliberately NOT the full
// tool-calling agent the original Pin/Travel design sketched (propose/
// confirm loop, per-tool actor permissions, a travel_proposals table). That
// architecture is real future work; this ships something honest and useful
// now: a single read-only, no-write recommendation call, grounded first in
// the household's own saved places and falling back to general knowledge
// only when asked about, clearly labeled either way. Nothing here writes to
// the database — recommending is not the same claim as remembering.
const MODEL = process.env.AI_MODEL ?? 'claude-haiku-4-5'

const RECS_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          reason: { type: 'string', description: '1 sentence, specific to the household\'s stated ask' },
          source: { type: 'string', enum: ['saved', 'general_knowledge'], description: '"saved" only if this is one of the places listed in the prompt' },
        },
        required: ['name', 'reason', 'source'],
        additionalProperties: false,
      },
    },
    note: { type: 'string', description: 'One honest caveat, e.g. if saved places are thin for this ask. Empty string if none.' },
  },
  required: ['recommendations', 'note'],
  additionalProperties: false,
} as const

export async function POST(request: Request) {
  const caller = await resolveHouseholdToken(request)
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'not-configured' }, { status: 503 })
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const ask = typeof body.query === 'string' ? body.query.slice(0, 300).trim() : ''
  if (!ask) return NextResponse.json({ error: 'query is required' }, { status: 400 })

  const admin = createAdminClient()
  const { data: places } = await admin
    .from('places')
    .select('name, kind, city, status, tags, note')
    .eq('space_id', caller.spaceId)
    .order('created_at', { ascending: false })
    .limit(80)

  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      output_config: { format: { type: 'json_schema', schema: RECS_SCHEMA } },
      system: 'You are a travel/places recommender for a household using a personal life app. Recommend from the SAVED PLACES list first — those are real places this household already cares about. Only reach for general knowledge if the saved list has nothing relevant to the ask, and when you do, say so plainly in `note` and mark those items source:"general_knowledge". Never invent specific prices, hours, or availability. Keep reasons short and concrete. 3-5 recommendations, fewer if that\'s all that fits.',
      messages: [{
        role: 'user',
        content: `Household's saved places (name · kind · city · status · tags · note):\n${
          (places ?? []).map(p => `- ${p.name} · ${p.kind} · ${p.city ?? '?'} · ${p.status} · ${(p.tags ?? []).join(',')} · ${p.note ?? ''}`).join('\n') || '(none saved yet)'
        }\n\nAsk: ${ask}`,
      }],
    })
    const text = response.content.find(b => b.type === 'text')
    const result = text && text.type === 'text' ? JSON.parse(text.text) : { recommendations: [], note: 'No response.' }
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
