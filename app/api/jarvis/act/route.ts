import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { toolByName, ToolInputError } from '@/lib/jarvis/tools'
import { verifyAction } from '@/lib/jarvis/actions'
import { GoogleError } from '@/lib/google/calendar'

// Carries out one change the person confirmed (2026-10-18). The action was
// signed by /api/jarvis for this person and is checked here before anything
// runs. It reports success only when the service itself confirmed it.
export async function POST(request: Request) {
  if ((await cookies()).get('4s-shared-mode')?.value === '1') {
    return NextResponse.json({ error: 'Not on the shared screen.' }, { status: 403 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await request.json().catch(() => ({})) as { token?: string }
  const action = typeof token === 'string' ? verifyAction(token, user.id) : null
  if (!action) return NextResponse.json({ error: 'That confirmation has expired. Ask Jarvis again.' }, { status: 400 })
  const tool = toolByName(action.tool)
  if (!tool?.write) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })

  try {
    const result = await tool.run({ userId: user.id, supabase }, action.input)
    return NextResponse.json({ ok: true, summary: action.summary, result })
  } catch (e) {
    const message = e instanceof GoogleError || e instanceof ToolInputError ? e.message : 'That may not have gone through. Check before trying again.'
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
