'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Person {
  id: string
  name: string
  relationship: string | null
  birthday: string | null
  last_contact: string | null
  notes: string | null
  gift_ideas: string | null
}

export type NewPerson = Omit<Person, 'id'>

// Days until the next occurrence of a MM-DD birthday (0 = today). null if unset.
export function daysUntilBirthday(birthday: string | null): number | null {
  if (!birthday) return null
  const b = new Date(birthday)
  if (isNaN(b.getTime())) return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(now.getFullYear(), b.getMonth(), b.getDate())
  if (next < today) next = new Date(now.getFullYear() + 1, b.getMonth(), b.getDate())
  return Math.round((next.getTime() - today.getTime()) / 86400000)
}

export function daysSinceContact(last: string | null): number | null {
  if (!last) return null
  const d = new Date(last)
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}

// Cross-instance sync: every usePeople instance reloads on 4s:people-changed,
// matching the pattern used by the other hooks (captures, work items, etc.).
export function usePeople() {
  const supabase = createClient()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('people')
      .select('id, name, relationship, birthday, last_contact, notes, gift_ideas')
      .order('name')
    setPeople((data as Person[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const onChanged = () => load()
    window.addEventListener('4s:people-changed', onChanged)
    return () => window.removeEventListener('4s:people-changed', onChanged)
  }, [load])

  async function add(p: Partial<NewPerson> & { name: string }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('people').insert({
      user_id: user.id,
      name: p.name,
      relationship: p.relationship ?? null,
      birthday: p.birthday ?? null,
      last_contact: p.last_contact ?? null,
      notes: p.notes ?? null,
      gift_ideas: p.gift_ideas ?? null,
    })
    window.dispatchEvent(new CustomEvent('4s:people-changed'))
  }

  async function update(id: string, patch: Partial<Person>) {
    setPeople(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))
    await supabase.from('people').update(patch).eq('id', id)
    window.dispatchEvent(new CustomEvent('4s:people-changed'))
  }

  async function remove(id: string) {
    setPeople(prev => prev.filter(p => p.id !== id))
    await supabase.from('people').delete().eq('id', id)
    window.dispatchEvent(new CustomEvent('4s:people-changed'))
  }

  function markContacted(id: string) {
    return update(id, { last_contact: new Date().toISOString().slice(0, 10) })
  }

  return { people, loading, add, update, remove, markContacted }
}
