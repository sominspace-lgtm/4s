'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Capture {
  id: string
  text: string
  domain: string | null
  created_at: string
}

export function useCaptures() {
  const [captures, setCaptures] = useState<Capture[]>([])
  const supabase = createClient()

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('captures')
      .select('*')
      .is('domain', null)
      .order('created_at', { ascending: false })
    if (data) setCaptures(data)
  }, [supabase])

  useEffect(() => { fetch() }, [fetch])

  // See useWorkItems.ts for why this exists — this hook is called
  // independently in several places (Capture bar, Brief inbox count),
  // so a mutation in one instance needs to tell the others to reload.
  useEffect(() => {
    function onChanged() { fetch() }
    window.addEventListener('4s:captures-changed', onChanged)
    return () => window.removeEventListener('4s:captures-changed', onChanged)
  }, [fetch])

  async function add(text: string, domain?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('captures').insert({ text, user_id: user.id, domain: domain || null }).select().single()
    if (data && !data.domain) setCaptures(prev => [data, ...prev])
    window.dispatchEvent(new CustomEvent('4s:captures-changed'))
  }

  async function remove(id: string) {
    await supabase.from('captures').delete().eq('id', id)
    setCaptures(prev => prev.filter(c => c.id !== id))
    window.dispatchEvent(new CustomEvent('4s:captures-changed'))
  }

  async function assign(id: string, domain: string) {
    await supabase.from('captures').update({ domain }).eq('id', id)
    setCaptures(prev => prev.filter(c => c.id !== id))
    window.dispatchEvent(new CustomEvent('4s:captures-changed'))
  }

  return { captures, add, remove, assign }
}
