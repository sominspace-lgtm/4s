'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Note {
  id: string
  user_id: string
  space_id: string | null
  title: string
  body: string
  pinned: boolean
  created_at: string
  updated_at: string
}

// Same space-scoped shape as useHousehold: spaceId null reads/writes
// personal notes, a real spaceId reads/writes that household's shared
// notes. RLS (notes_own_or_space) already restricts rows to "mine, or a
// space I'm in" — the spaceId param here is just which VIEW you're looking
// at, same distinction useHousehold's own header comment makes.
export function useNotes(spaceId: string | null) {
  const supabase = createClient()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const scope = spaceId
      ? supabase.from('notes').select('*').eq('space_id', spaceId)
      : supabase.from('notes').select('*').is('space_id', null)
    // Pinned first, then most recently updated — a note you're mid-writing
    // stays at the top without needing to pin it.
    const { data } = await scope.order('pinned', { ascending: false }).order('updated_at', { ascending: false })
    setNotes((data as Note[] | null) ?? [])
    setLoading(false)
  }, [supabase, spaceId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const onChanged = () => load()
    window.addEventListener('4s:notes-changed', onChanged)
    return () => window.removeEventListener('4s:notes-changed', onChanged)
  }, [load])

  function notify() { window.dispatchEvent(new CustomEvent('4s:notes-changed')) }

  async function add(fields: { title?: string; body?: string } = {}): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase.from('notes')
      .insert({ user_id: user.id, space_id: spaceId, title: fields.title ?? '', body: fields.body ?? '' })
      .select('id').single()
    if (error) return null
    notify()
    return data.id
  }

  async function update(id: string, patch: Partial<Pick<Note, 'title' | 'body' | 'pinned' | 'space_id'>>) {
    const { error } = await supabase.from('notes')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return { error }
    notify()
    return { error: null }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) return { error }
    notify()
    return { error: null }
  }

  return { notes, loading, add, update, remove }
}
