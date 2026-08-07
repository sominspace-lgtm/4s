'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Capture } from './useCaptures'

export function useDomainCaptures(domainId: string) {
  const [items, setItems] = useState<Capture[]>([])
  const supabase = createClient()

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('captures')
      .select('*')
      .eq('domain', domainId)
      .order('created_at', { ascending: false })
    if (data) setItems(data)
  }, [supabase, domainId])

  useEffect(() => { fetch() }, [fetch])

  async function add(text: string) {
    if (!text.trim()) return { error: null }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: new Error('Not signed in') }
    const { data, error } = await supabase
      .from('captures')
      .insert({ text: text.trim(), user_id: user.id, domain: domainId })
      .select().single()
    if (error) return { error }
    setItems(prev => [data, ...prev])
    return { error: null }
  }

  async function remove(id: string) {
    const { error } = await supabase.from('captures').delete().eq('id', id)
    if (error) return { error }
    setItems(prev => prev.filter(c => c.id !== id))
    return { error: null }
  }

  return { items, add, remove }
}
