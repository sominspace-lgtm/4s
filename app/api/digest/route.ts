import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────────────────────
// AI DIGEST — Session 11 stub
//
// TO ACTIVATE:
// 1. Add ANTHROPIC_API_KEY to .env.local and Vercel env vars
// 2. npm install @anthropic-ai/sdk
// 3. Replace the stub below with:
//
//    import Anthropic from '@anthropic-ai/sdk'
//    const ai = new Anthropic()
//
//    Then build a prompt from the user's data and call:
//    const msg = await ai.messages.create({
//      model: 'claude-haiku-4-5-20251001',
//      max_tokens: 400,
//      messages: [{ role: 'user', content: prompt }],
//    })
//    return NextResponse.json({ digest: msg.content[0].text })
//
// Suggested prompt structure:
//   "You are a personal advisor reviewing a week of life data.
//    Habits: {habit summary}
//    Subscriptions: {spending summary}
//    Captures: {inbox count}
//    Write 3-4 sentences: what stood out, one risk, one win."
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Stub response — replace with AI call above when API key is ready
  return NextResponse.json({
    digest: null,
    stub: true,
    message: 'Connect your Anthropic API key to activate the AI digest.',
  })
}
