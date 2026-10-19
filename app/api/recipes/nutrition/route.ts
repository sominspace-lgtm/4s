import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { aiNutrition } from '@/lib/recipes/ai'
import { aiConfigured } from '@/lib/ai/provider'

// A rough per-serving calorie and macro estimate for a recipe (2026-10-13).
// It is an estimate from typical values, and the app says so.
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!aiConfigured()) return NextResponse.json({ error: 'Estimating needs AI, which is not set up on the server yet.', code: 'not-configured' }, { status: 503 })

  const b = await request.json().catch(() => ({})) as { title?: string; servings?: number; ingredients?: string[] }
  const ingredients = (Array.isArray(b.ingredients) ? b.ingredients : []).filter(x => typeof x === 'string').map(x => x.trim()).filter(Boolean).slice(0, 60)
  if (ingredients.length === 0) return NextResponse.json({ error: 'Add some ingredients first.' }, { status: 400 })
  const servings = typeof b.servings === 'number' && b.servings > 0 && b.servings < 100 ? b.servings : 2
  try {
    const n = await aiNutrition(String(b.title ?? 'Recipe').slice(0, 120), servings, ingredients)
    return NextResponse.json({ nutrition: n })
  } catch {
    return NextResponse.json({ error: 'Could not estimate that. Try again.' }, { status: 502 })
  }
}
