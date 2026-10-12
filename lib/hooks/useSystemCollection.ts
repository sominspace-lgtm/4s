'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Collection, CollectionProp, CellValue, CollectionRow } from '@/lib/hooks/useCollections'
import { SYSTEM_SPECS, ideaToCells, ideaPatch, watchToCells, watchPatch, type SystemKey } from '@/lib/collections/system'
import { useDateIdeas, type DateIdea } from '@/lib/hooks/useDateIdeas'
import { useWatchlist, type WatchlistDomain, type WatchlistStatus } from '@/lib/hooks/useWatchlist'
import { uploadDateIdeaPhoto, getDateIdeaPhotoUrls } from '@/lib/storage/dateIdeaPhotos'
import type { RowSource } from '@/components/notes/CollectionsHub'

// The built-in Reference collections (2026-10-12). Their rows come from the
// original tables (see lib/collections/system.ts); this hook holds the part
// that is new: the extra columns you add and the view you chose, saved in a
// collections row marked with a system_key. If that row cannot be read or
// created (the migration has not run yet) the list still works from built-in
// defaults, it just cannot remember extra columns.

export interface SystemDef { view: 'table' | 'board'; boardProp: string; props: CollectionProp[]; persisted: boolean }

export function useSystemDef(spaceId: string | null, key: SystemKey) {
  const supabase = createClient()
  const spec = SYSTEM_SPECS[key]
  const [def, setDef] = useState<SystemDef>({ view: spec.view, boardProp: spec.boardProp, props: [], persisted: false })
  const [rowId, setRowId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!spaceId) return
    const find = () => supabase.from('collections').select('*').eq('space_id', spaceId).eq('system_key', key).maybeSingle()
    let { data, error } = await find()
    if (error) return // column missing: stay on defaults
    if (!data) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const ins = await supabase.from('collections').insert({
        user_id: user.id, space_id: spaceId, name: spec.name, icon: '', props: [], view: spec.view,
        board_prop: spec.boardProp, system_key: key, guest_visible: true,
      }).select('*').single()
      // Two of you opening this at once: the unique index rejects the second, so read the winner.
      if (ins.error) { ({ data, error } = await find()); if (error || !data) return } else data = ins.data
    }
    const c = data as Collection
    setRowId(c.id)
    setDef({ view: c.view, boardProp: c.board_prop ?? spec.boardProp, props: c.props ?? [], persisted: true })
  }, [supabase, spaceId, key, spec])

  useEffect(() => { load() }, [load])

  const update = useCallback(async (patch: Partial<Pick<SystemDef, 'view' | 'props'>>) => {
    setDef(d => ({ ...d, ...patch }))
    if (!rowId) return
    await supabase.from('collections').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', rowId)
  }, [supabase, rowId])

  return { def, update }
}

const asRows = (key: string, list: { id: string; created_at: string; cells: Record<string, CellValue> }[]): CollectionRow[] =>
  list.map(r => ({ id: r.id, collection_id: key, cells: r.cells, created_at: r.created_at }))

export function useDateIdeaSource(spaceId: string | null): RowSource {
  const { ideas, loading, addIdea, update, removeIdea } = useDateIdeas(spaceId)
  const rows = useMemo(() => asRows('date_ideas', ideas.map(i => ({ id: i.id, created_at: i.created_at, cells: ideaToCells(i) }))), [ideas])

  async function add(cells: Record<string, CellValue> = {}) {
    const title = typeof cells.title === 'string' ? cells.title : ''
    const patch: Record<string, unknown> = {}
    const extras: Record<string, CellValue> = {}
    for (const [k, v] of Object.entries(cells)) {
      if (k === 'title') continue
      const p = ideaPatch(k, v)
      if (p) Object.assign(patch, p); else extras[k] = v
    }
    return addIdea(title, { ...patch, ...(Object.keys(extras).length ? { extras } : {}) } as Parameters<typeof addIdea>[1])
  }

  async function setCell(id: string, propId: string, v: CellValue) {
    const p = ideaPatch(propId, v)
    if (p) await update(id, p as Parameters<typeof update>[1])
    else {
      const cur = ideas.find(i => i.id === id) as DateIdea | undefined
      await update(id, { extras: { ...(cur?.extras ?? {}), [propId]: v } })
    }
    return null
  }

  return {
    rows, loading, add, setCell,
    remove: async id => { await removeIdea(id); return null },
    image: { upload: (rowId, file) => uploadDateIdeaPhoto(rowId, file), urls: getDateIdeaPhotoUrls },
  }
}

export function useWatchSource(spaceId: string | null, domain: WatchlistDomain): RowSource {
  const { items, loading, addItem, update, removeItem } = useWatchlist(spaceId)
  const mine = useMemo(() => items.filter(i => i.domain === domain), [items, domain])
  const rows = useMemo(() => asRows(domain, mine.map(i => ({ id: i.id, created_at: i.created_at, cells: watchToCells(i) }))), [mine, domain])

  async function add(cells: Record<string, CellValue> = {}) {
    const title = typeof cells.title === 'string' ? cells.title : ''
    const extras: Record<string, CellValue> = {}
    let subtype: string | undefined
    let status: WatchlistStatus | undefined
    for (const [k, v] of Object.entries(cells)) {
      if (k === 'title') continue
      const p = watchPatch(k, v)
      if (p) { if (p.subtype) subtype = p.subtype; if (p.status) status = p.status } else extras[k] = v
    }
    return addItem(domain, title, subtype, { status, ...(Object.keys(extras).length ? { extras } : {}) })
  }

  async function setCell(id: string, propId: string, v: CellValue) {
    const p = watchPatch(propId, v)
    if (p) await update(id, p)
    else {
      const cur = items.find(i => i.id === id)
      await update(id, { extras: { ...(cur?.extras ?? {}), [propId]: v } })
    }
    return null
  }

  return { rows, loading, add, setCell, remove: async id => { await removeItem(id); return null } }
}
