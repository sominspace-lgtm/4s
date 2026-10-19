'use client'

import { createContext, useContext, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EMPTY_DRAFT } from '@/lib/recipes/types'
import type { CellValue, CollectionProp, CollectionRow } from '@/lib/hooks/useCollections'

// One tap from a collection row to the rest of 4S (2026-10-19): make it a
// task, a trip idea, or a recipe to try. The row stays where it is; the new
// item takes the row's name, its link if it has one, and its other columns
// as notes.

export function rowParts(props: CollectionProp[], row: CollectionRow): { title: string; url: string | null; notes: string | null } {
  const val = (v: CellValue | undefined) => (v === null || v === undefined || v === '' ? null : typeof v === 'boolean' ? (v ? 'yes' : null) : String(v))
  const titleProp = props.find(p => p.type === 'text') ?? props[0]
  const title = (val(row.cells[titleProp?.id ?? '']) ?? '').trim()
  const urlProp = props.find(p => p.type === 'url' && /^https?:\/\//i.test(String(row.cells[p.id] ?? '')))
  const url = urlProp ? String(row.cells[urlProp.id]) : null
  const notes = props
    .filter(p => p !== titleProp && p !== urlProp && p.type !== 'image' && p.type !== 'place')
    .map(p => { const v = val(row.cells[p.id]); return v ? `${p.name}: ${v}` : null })
    .filter(Boolean).join('\n')
  return { title, url, notes: notes || null }
}

type Kind = 'task' | 'trip' | 'recipe'

/** False on the shared screen, so a guest cannot file things into someone's own lists. */
export const RowSendAllowed = createContext(true)

export default function RowSendMenu({ props, row }: { props: CollectionProp[]; row: CollectionRow }) {
  const allowed = useContext(RowSendAllowed)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  async function send(kind: Kind) {
    setOpen(false)
    const { title, url, notes } = rowParts(props, row)
    if (!title) { setNote('Give the row a name first.'); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    let error: { message: string } | null = null
    if (kind === 'task') {
      ;({ error } = await supabase.from('work_items').insert({ user_id: user.id, title: title.slice(0, 200), notes: [notes, url].filter(Boolean).join('\n') || null, status: 'todo' }))
      if (!error) window.dispatchEvent(new CustomEvent('4s:work-items-changed'))
    } else if (kind === 'trip') {
      ;({ error } = await supabase.from('trips').insert({ user_id: user.id, title: title.slice(0, 200), status: 'dreaming', notes: [notes, url].filter(Boolean).join('\n') || null }))
    } else {
      let host: string | null = null
      try { host = url ? new URL(url).hostname.replace(/^www\./, '') : null } catch { /* no host */ }
      ;({ error } = await supabase.from('recipes').insert({ ...EMPTY_DRAFT, title: title.slice(0, 200), source_url: url, source_name: host, notes, tags: ['to try'], user_id: user.id, space_id: null }))
    }
    setNote(error ? 'That did not save.' : kind === 'task' ? 'Added to Tasks.' : kind === 'trip' ? 'Added as a trip idea.' : 'Added to the Kitchen.')
    setTimeout(() => setNote(null), 3000)
  }

  if (!allowed) return null
  const item: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'left', minHeight: 38, padding: '0 0.7rem', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button title="Send to Tasks, Trips or Kitchen" aria-label="Send this row" onClick={() => setOpen(o => !o)}
        style={{ minWidth: 30, minHeight: 30, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem' }}>↗</button>
      {open && (
        <span role="menu" style={{ position: 'absolute', right: 0, top: '100%', zIndex: 20, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.25rem 0', boxShadow: '0 6px 20px var(--shadow)' }}>
          <button role="menuitem" style={item} onClick={() => send('task')}>Make it a task</button>
          <button role="menuitem" style={item} onClick={() => send('trip')}>Trip idea</button>
          <button role="menuitem" style={item} onClick={() => send('recipe')}>Recipe to try</button>
        </span>
      )}
      {note && <span style={{ position: 'absolute', right: '100%', marginRight: 6, whiteSpace: 'nowrap', fontSize: '0.72rem', color: 'var(--emerald)' }}>{note}</span>}
    </span>
  )
}
