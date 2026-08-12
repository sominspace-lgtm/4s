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
    // maybeSingle, not single: a brand-new account has no user_prefs row yet,
    // and .single() treats "zero rows" as an error the same way it treats
    // "more than one" — this way the expected zero-row case returns null
    // cleanly instead of relying on a swallowed error.
    const { data } = await supabase
      .from('user_prefs')
      .select('domains')
      .eq('user_id', user.id)
      .maybeSingle()

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
    // Explicit onConflict, same reasoning as useDomainTouched.ts's fix: without
    // it, supabase-js can only infer a conflict target from a single-column
    // primary key, and if that inference ever fails (or a row was already
    // duplicated by an earlier unguarded upsert — display_name/theme/mode
    // upserts elsewhere in the app have the same gap), this INSERTs a second
    // row instead of updating the first. Once two rows exist for one user_id,
    // load()'s `.single()` below errors on every future read (Postgrest
    // rejects multi-row results for .single()), data comes back undefined,
    // and the UI silently falls back to DEFAULT_DOMAINS — which is exactly
    // "I hid a domain and it came back": the toggle worked, but the very next
    // load couldn't see it happened.
    const { error } = await supabase.from('user_prefs')
      .upsert({ user_id: user.id, domains: next }, { onConflict: 'user_id' })
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
