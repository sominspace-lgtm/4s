'use client'

import { useEffect, useState } from 'react'
import Sheet from '@/components/ui/Sheet'
import { createClient } from '@/lib/supabase/client'
import type { Meal } from '@/lib/hooks/useHousehold'
import type { Recipe } from '@/lib/recipes/types'

// Tonight's dinner, from the chalkboard by the door (2026-10-29). What it
// is, who's cooking, and the recipe's ingredients when the meal plan links
// one, without opening the whole kitchen. "Cook it" opens the kitchen.

export default function DinnerCard({ meal, open, onClose, onCook }: {
  meal: Meal | null
  open: boolean
  onClose: () => void
  onCook: () => void
}) {
  const recipeId = meal?.recipe_id ?? null
  const [recipe, setRecipe] = useState<{ id: string; r: Recipe | null } | null>(null)

  useEffect(() => {
    if (!open || !recipeId || recipe?.id === recipeId) return
    let alive = true
    createClient().from('recipes').select('*').eq('id', recipeId).maybeSingle()
      .then(({ data }) => { if (alive) setRecipe({ id: recipeId, r: (data as Recipe | null) ?? null }) })
    return () => { alive = false }
  }, [open, recipeId, recipe?.id])

  const r = recipe?.id === recipeId ? recipe.r : null
  const cook = meal?.cook ? (meal.cook === 'Together' ? 'Cooking together' : `${meal.cook} cooks`) : null
  const minutes = (r?.prep_minutes ?? 0) + (r?.cook_minutes ?? 0)

  return (
    <Sheet open={open && !!meal} title="Tonight" onClose={onClose}>
      {meal && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text)', lineHeight: 1.2 }}>{meal.title}</div>
            {(cook || minutes > 0) && (
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                {[cook, minutes > 0 ? `about ${minutes} min` : null].filter(Boolean).join(' · ')}
              </div>
            )}
          </div>
          {meal.notes && <div style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.5 }}>{meal.notes}</div>}
          {r && r.ingredients.length > 0 && (
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>You&rsquo;ll need</div>
              <ul style={{ margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                {r.ingredients.slice(0, 14).map(i => (
                  <li key={i.id} style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{i.text}</li>
                ))}
              </ul>
              {r.ingredients.length > 14 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.3rem' }}>and {r.ingredients.length - 14} more</div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
            <button className="btn btn-primary press" style={{ minHeight: 44 }} onClick={() => { onClose(); onCook() }}>Cook it</button>
            {meal.recipe_url && (
              <a className="btn btn-secondary press" style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center' }}
                href={meal.recipe_url} target="_blank" rel="noopener noreferrer">Open the recipe</a>
            )}
          </div>
        </div>
      )}
    </Sheet>
  )
}
