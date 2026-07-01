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

  async function add(text: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('captures').insert({ text, user_id: user.id }).select().single()
    if (data) setCaptures(prev => [data, ...prev])
  }

  async function remove(id: string) {
    await supabase.from('captures').delete().eq('id', id)
    setCaptures(prev => prev.filter(c => c.id !== id))
  }

  async function assign(id: string, domain: string) {
    await supabase.from('captures').update({ domain }).eq('id', id)
    setCaptures(prev => prev.filter(c => c.id !== id))
  }

  return { captures, add, remove, assign }
}
