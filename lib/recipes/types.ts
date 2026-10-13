import type { Ingredient } from './ingredients'

/** What an import (link, pasted text, or photo) hands back, before it is saved. */
export interface RecipeDraft {
  title: string
  source_url: string | null
  source_name: string | null
  image_url: string | null
  servings: number
  prep_minutes: number | null
  cook_minutes: number | null
  ingredients: Ingredient[]
  steps: string[]
  notes: string | null
  tags: string[]
  /** Per serving, when the source states it. */
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

export interface Recipe extends RecipeDraft {
  id: string
  user_id: string
  space_id: string | null
  rating: number | null
  favorite: boolean
  times_cooked: number
  last_cooked: string | null
  created_at: string
  updated_at: string
}

export const EMPTY_DRAFT: RecipeDraft = {
  title: '', source_url: null, source_name: null, image_url: null, servings: 2,
  prep_minutes: null, cook_minutes: null, ingredients: [], steps: [], notes: null, tags: [],
  calories: null, protein: null, carbs: null, fat: null,
}
