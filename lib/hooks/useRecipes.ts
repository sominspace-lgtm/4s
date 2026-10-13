'use client'

import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import type { Recipe, RecipeDraft } from '@/lib/recipes/types'

// The recipe book (2026-10-13). Your recipes plus any shared into the
// household (RLS decides what comes back); a shared recipe can be edited by
// either of you. New recipes are shared with the household by default, since
// the kitchen is a two-person place, with a private option on the editor.
export function useRecipes(spaceId: string | null) {
  const supabase = createClient()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('recipes').select('*').order('created_at', { ascending: false })
    if (e) setError('The recipe book is not set up on the server yet.')
    else { setError(null); setRecipes((data as Recipe[] | null) ?? []) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const on = () => load()
    window.addEventListener('4s:recipes-changed', on)
    return () => window.removeEventListener('4s:recipes-changed', on)
  }, [load])
  const notify = () => window.dispatchEvent(new CustomEvent('4s:recipes-changed'))

  async function add(d: RecipeDraft, opts: { shared?: boolean } = {}): Promise<{ id: string | null; error: string | null }> {
    const title = d.title.trim()
    if (!title) return { id: null, error: 'Give the recipe a name.' }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { id: null, error: 'Not signed in' }
    const { data, error: e } = await supabase.from('recipes').insert({
      ...d, title, user_id: user.id, space_id: (opts.shared ?? true) ? spaceId : null,
    }).select('id').single()
    if (e) return { id: null, error: e.message }
    await load(); notify()
    return { id: (data as { id: string }).id, error: null }
  }

  async function update(id: string, patch: Partial<RecipeDraft> & Partial<Pick<Recipe, 'rating' | 'favorite' | 'space_id'>>): Promise<string | null> {
    setRecipes(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
    const { error: e } = await supabase.from('recipes').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (e) { await load(); return e.message }
    notify()
    return null
  }

  async function remove(id: string): Promise<string | null> {
    const { error: e } = await supabase.from('recipes').delete().eq('id', id)
    if (e) return e.message
    await load(); notify()
    return null
  }

  /** "We made this": bumps the count and the date, so the book shows what you actually cook. */
  async function markCooked(r: Recipe): Promise<string | null> {
    return update(r.id, { times_cooked: r.times_cooked + 1, last_cooked: format(new Date(), 'yyyy-MM-dd') } as Partial<RecipeDraft>)
  }

  return { recipes, loading, error, add, update, remove, markCooked }
}
