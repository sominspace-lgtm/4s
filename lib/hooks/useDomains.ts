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
    setDomains(next)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('user_prefs').upsert({ user_id: user.id, domains: next })
  }

  function move(id: string, dir: -1 | 1) {
    const idx = domains.findIndex(d => d.id === id)
    if (idx + dir < 0 || idx + dir >= domains.length) return
    const next = [...domains]
    ;[next[idx], next[idx + dir]] = [next[idx + dir], next[idx]]
    save(next)
  }

  function toggle(id: string) {
    save(domains.map(d => d.id === id ? { ...d, hidden: !d.hidden } : d))
  }

  function addDomain(d: Domain) {
    save([...domains, d])
  }

  function removeDomain(id: string) {
    save(domains.filter(d => d.id !== id))
  }

  function resetToDefault() {
    save(DEFAULT_DOMAINS)
  }

  return {
    domains,
    visible: domains.filter(d => !d.hidden),
    loading,
    move,
    toggle,
    addDomain,
    removeDomain,
    resetToDefault,
  }
}
