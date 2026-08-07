'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DOMAINS as DEFAULT_DOMAINS, type Domain } from '@/lib/constants/domains'

export type { Domain }

export function useDomains() {
  const supabase = createClient()
  const [domains, setDomains] = useState<(Domain & { hidden?: boolean })[]>(DEFAULT_DOMAINS)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data } = await supabase
      .from('user_prefs')
      .select('domains')
      .eq('user_id', user.id)
      .single()

    if (data?.domains && Array.isArray(data.domains) && data.domains.length > 0) {
      setDomains(data.domains)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save(next: (Domain & { hidden?: boolean })[]) {
    const prev = domains
    setDomains(next)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setDomains(prev); return { error: new Error('Not signed in') } }
    const { error } = await supabase.from('user_prefs').upsert({ user_id: user.id, domains: next })
    if (error) {
      setDomains(prev)
      console.error('Failed to save domains:', error.message)
      return { error }
    }
    return { error: null }
  }

  function move(id: string, dir: -1 | 1) {
    const idx = domains.findIndex(d => d.id === id)
    if (idx + dir < 0 || idx + dir >= domains.length) return
    const next = [...domains]
    ;[next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
    return save(next)
  }

  function toggle(id: string) {
    return save(domains.map(d => d.id === id ? { ...d, hidden: !d.hidden } : d))
  }

  function addDomain(d: Domain) {
    return save([...domains, d])
  }

  function removeDomain(id: string) {
    return save(domains.filter(d => d.id !== id))
  }

  function resetToDefault() {
    return save(DEFAULT_DOMAINS)
  }

  function toggleShared(id: string) {
    return save(domains.map(d => d.id === id ? { ...d, shared: !d.shared } : d))
  }

  return {
    domains,
    visible: domains.filter(d => !d.hidden),
    loading,
    move,
    toggle,
    toggleShared,
    addDomain,
    removeDomain,
    resetToDefault,
  }
}
