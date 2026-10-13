import { createAdminClient } from '@/lib/supabase/admin'
import type { Recipe } from './types'

// A recipe shared by link (2026-10-13). The random token is the only
// credential and it resolves to exactly one recipe.

export interface SharedRecipe extends Pick<Recipe, 'title' | 'source_url' | 'source_name' | 'image_url' | 'servings' | 'prep_minutes' | 'cook_minutes' | 'ingredients' | 'steps' | 'notes' | 'tags' | 'calories' | 'protein' | 'carbs' | 'fat'> {
  ownerName: string | null
}

export function validToken(token: string): boolean {
  return typeof token === 'string' && token.length >= 16 && token.length <= 64 && /^[A-Za-z0-9_-]+$/.test(token)
}

export async function sharedRecipe(token: string): Promise<SharedRecipe | null> {
  if (!validToken(token)) return null
  const admin = createAdminClient()
  const { data: share } = await admin.from('recipe_shares').select('recipe_id, user_id').eq('token', token).maybeSingle()
  if (!share) return null
  const { data: r } = await admin.from('recipes')
    .select('title, source_url, source_name, image_url, servings, prep_minutes, cook_minutes, ingredients, steps, notes, tags, calories, protein, carbs, fat')
    .eq('id', share.recipe_id).maybeSingle()
  if (!r) return null
  const { data: prefs } = await admin.from('user_prefs').select('display_name').eq('user_id', share.user_id).maybeSingle()
  return { ...(r as Omit<SharedRecipe, 'ownerName'>), ownerName: ((prefs?.display_name as string | null) ?? '').trim() || null }
}
