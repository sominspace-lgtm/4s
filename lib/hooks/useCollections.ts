'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// 'place' (a Places pin) and 'image' exist only for the built-in Reference
// collections (date ideas); they are not offered when adding your own column.
export type PropType = 'text' | 'number' | 'date' | 'checkbox' | 'select' | 'url' | 'place' | 'image'

export interface CollectionProp {
  id: string
  name: string
  type: PropType
  /** select only */
  options?: string[]
}

export interface Collection {
  id: string
  user_id: string
  space_id: string | null
  name: string
  icon: string | null
  props: CollectionProp[]
  view: 'table' | 'board'
  board_prop: string | null
  /** Set for the built-in Reference collections (date ideas, movies, games). */
  system_key?: string | null
  guest_visible?: boolean
  created_at: string
}

export type CellValue = string | number | boolean | null
export interface CollectionRow {
  id: string
  collection_id: string
  cells: Record<string, CellValue>
  created_at: string
}

const rid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10))

export function newProp(name: string, type: PropType, options?: string[]): CollectionProp {
  return { id: rid(), name, type, ...(type === 'select' ? { options: options ?? [] } : {}) }
}

export interface CollectionTemplate {
  id: string; label: string; icon: string; view: 'table' | 'board'
  props: { name: string; type: PropType; options?: string[] }[]
  /** Name of the select property a board groups by. */
  boardBy?: string
}

export const COLLECTION_TEMPLATES: CollectionTemplate[] = [
  { id: 'blank', label: 'Blank', icon: '', view: 'table', props: [{ name: 'Name', type: 'text' }] },
  {
    id: 'reading', label: 'Reading list', icon: '', view: 'board', boardBy: 'Status',
    props: [{ name: 'Title', type: 'text' }, { name: 'Author', type: 'text' },
      { name: 'Status', type: 'select', options: ['To read', 'Reading', 'Done'] },
      { name: 'Rating', type: 'number' }, { name: 'Finished', type: 'date' }],
  },
  {
    id: 'watch', label: 'Movies and shows', icon: '', view: 'board', boardBy: 'Status',
    props: [{ name: 'Title', type: 'text' }, { name: 'Type', type: 'select', options: ['Movie', 'Show'] },
      { name: 'Status', type: 'select', options: ['Watchlist', 'Watching', 'Watched'] },
      { name: 'Where', type: 'text' }, { name: 'Rating', type: 'number' }],
  },
  {
    id: 'gifts', label: 'Gift ideas', icon: '', view: 'table',
    props: [{ name: 'Idea', type: 'text' }, { name: 'For', type: 'text' }, { name: 'Price', type: 'number' },
      { name: 'Link', type: 'url' }, { name: 'Got it', type: 'checkbox' }],
  },
  {
    id: 'projects', label: 'Home projects', icon: '', view: 'board', boardBy: 'Status',
    props: [{ name: 'Project', type: 'text' }, { name: 'Status', type: 'select', options: ['Idea', 'Planning', 'Doing', 'Done'] },
      { name: 'Cost', type: 'number' }, { name: 'Due', type: 'date' }],
  },
  {
    id: 'jobs', label: 'Job search', icon: '', view: 'board', boardBy: 'Stage',
    props: [{ name: 'Role', type: 'text' }, { name: 'Company', type: 'text' },
      { name: 'Stage', type: 'select', options: ['Interested', 'Applied', 'Interview', 'Offer', 'Closed'] },
      { name: 'Date', type: 'date' }, { name: 'Link', type: 'url' }],
  },
  {
    id: 'workouts', label: 'Workout log', icon: '', view: 'table',
    props: [{ name: 'Workout', type: 'text' }, { name: 'Date', type: 'date' }, { name: 'Minutes', type: 'number' }, { name: 'Notes', type: 'text' }],
  },
]

// Your collections plus anything shared into the household (RLS decides).
export function useCollections() {
  const supabase = createClient()
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data, error: e } = await supabase.from('collections').select('*').order('created_at')
    if (e) setError('Collections are not set up on the server yet.')
    else { setError(null); setCollections((data as Collection[] | null) ?? []) }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const on = () => load()
    window.addEventListener('4s:collections-changed', on)
    return () => window.removeEventListener('4s:collections-changed', on)
  }, [load])
  const notify = () => window.dispatchEvent(new CustomEvent('4s:collections-changed'))

  async function create(template: CollectionTemplate, name: string, spaceId: string | null): Promise<{ id: string | null; error: string | null }> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { id: null, error: 'Not signed in' }
    const props = template.props.map(p => newProp(p.name, p.type, p.options))
    const boardProp = template.boardBy ? props.find(p => p.name === template.boardBy)?.id ?? null : null
    const { data, error: e } = await supabase.from('collections')
      .insert({ user_id: user.id, space_id: spaceId, name: name.trim() || template.label, icon: template.icon, props, view: template.view, board_prop: boardProp })
      .select('id').single()
    if (e) return { id: null, error: e.message }
    await load(); notify()
    return { id: (data as { id: string }).id, error: null }
  }

  async function update(id: string, patch: Partial<Pick<Collection, 'name' | 'icon' | 'props' | 'view' | 'board_prop' | 'space_id'>>): Promise<string | null> {
    setCollections(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))
    const { error: e } = await supabase.from('collections').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
    if (e) { await load(); return e.message }
    notify()
    return null
  }

  async function remove(id: string): Promise<string | null> {
    const { error: e } = await supabase.from('collections').delete().eq('id', id)
    if (e) return e.message
    await load(); notify()
    return null
  }

  return { collections, loading, error, create, update, remove }
}

export function useCollectionRows(collectionId: string | null) {
  const supabase = createClient()
  const [rows, setRows] = useState<CollectionRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!collectionId) { setRows([]); setLoading(false); return }
    const { data } = await supabase.from('collection_rows').select('id, collection_id, cells, created_at')
      .eq('collection_id', collectionId).order('created_at')
    setRows((data as CollectionRow[] | null) ?? [])
    setLoading(false)
  }, [supabase, collectionId])

  useEffect(() => { setLoading(true); load() }, [load])

  async function add(cells: Record<string, CellValue> = {}): Promise<string | null> {
    if (!collectionId) return 'No collection'
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'Not signed in'
    const { data, error: e } = await supabase.from('collection_rows')
      .insert({ collection_id: collectionId, user_id: user.id, cells })
      .select('id, collection_id, cells, created_at').single()
    if (e) return e.message
    setRows(prev => [...prev, data as CollectionRow])
    return null
  }

  async function setCell(id: string, propId: string, value: CellValue): Promise<string | null> {
    const row = rows.find(r => r.id === id)
    if (!row) return null
    const cells = { ...row.cells, [propId]: value }
    setRows(prev => prev.map(r => (r.id === id ? { ...r, cells } : r)))
    const { error: e } = await supabase.from('collection_rows').update({ cells, updated_at: new Date().toISOString() }).eq('id', id)
    if (e) { await load(); return e.message }
    return null
  }

  async function remove(id: string): Promise<string | null> {
    setRows(prev => prev.filter(r => r.id !== id))
    const { error: e } = await supabase.from('collection_rows').delete().eq('id', id)
    if (e) { await load(); return e.message }
    return null
  }

  return { rows, loading, add, setCell, remove }
}
