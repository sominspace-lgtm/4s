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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !text.trim()) return
    const { data } = await supabase
      .from('captures')
      .insert({ text: text.trim(), user_id: user.id, domain: domainId })
      .select().single()
    if (data) setItems(prev => [data, ...prev])
  }

  async function remove(id: string) {
    await supabase.from('captures').delete().eq('id', id)
    setItems(prev => prev.filter(c => c.id !== id))
  }

  return { items, add, remove }
}
