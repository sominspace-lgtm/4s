'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useCollections, useCollectionRows, newProp, COLLECTION_TEMPLATES,
  type Collection, type CollectionProp, type CollectionRow, type CellValue, type PropType,
} from '@/lib/hooks/useCollections'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import RecipesToKitchen from './RecipesToKitchen'
import RowSendMenu from './RowSendMenu'
import type { Place } from '@/lib/hooks/usePlaces'

// Collections (2026-10-12): small databases you shape yourself. Pick a
// starting point (reading list, gift ideas, home projects…) or a blank one,
// add your own columns, and view the rows as a table or a board. Share one
// with the household and both of you can edit it.
//
// The view itself (CollectionViewGeneric) takes its rows from a RowSource, so
// the same table/board serves your own collections (stored in
// collection_rows) and the household's built-in Reference lists, whose rows
// live in their original tables. See lib/collections/system.ts.

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '0.4rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)',
  fontSize: '0.78rem', outline: 'none',
}
const muted: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }
const small: React.CSSProperties = { fontSize: '0.64rem', padding: '0.22em 0.65em', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }
const TYPE_LABEL: Partial<Record<PropType, string>> = { text: 'Text', number: 'Number', date: 'Date', checkbox: 'Checkbox', select: 'Choice', url: 'Link' }
const ADDABLE = Object.keys(TYPE_LABEL) as PropType[]

export interface RowSource {
  rows: CollectionRow[]
  loading: boolean
  add: (cells?: Record<string, CellValue>) => Promise<string | null>
  setCell: (id: string, propId: string, v: CellValue) => Promise<string | null>
  remove: (id: string) => Promise<string | null>
  /** Only for sources with an image column (date ideas). */
  image?: { upload: (rowId: string, file: File) => Promise<string>; urls: (paths: string[]) => Promise<Record<string, string>> }
}

export interface ViewProps {
  name: string
  props: CollectionProp[]
  view: 'table' | 'board'
  boardPropId: string | null
  /** Built-in columns: cannot be renamed, removed, or given new choices. */
  locked: Set<string>
  source: RowSource
  places?: Place[]
  canShare?: boolean
  shared?: boolean
  canDelete?: boolean
  canRename?: boolean
  backLabel: string
  onBack: () => void
  actions: {
    rename: (name: string) => void
    setProps: (props: CollectionProp[]) => void
    setView: (v: 'table' | 'board') => void
    toggleShare: () => void
    remove: () => void
  }
}

const shown = (p: CollectionProp, v: CellValue, places: Place[]): string => {
  if (v == null) return ''
  if (p.type === 'place') return places.find(x => x.id === v)?.name ?? ''
  return String(v)
}

export default function CollectionsHub({ userId }: { userId: string }) {
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null
  const hub = useCollections()
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  // Yours only (2026-10-19 cleanup). Shared collections and the built-in
  // date ideas, movies and games live in Household → Collections, so nothing
  // shows in two places.
  const mine = hub.collections.filter(c => !c.system_key && !c.space_id)
  const open = mine.find(c => c.id === openId) ?? null

  if (hub.error) return <div style={muted}>{hub.error}</div>

  if (open) {
    return (
      <UserCollectionView key={open.id} c={open} me={userId} spaceId={spaceId} backLabel="Collections" onBack={() => setOpenId(null)}
        update={hub.update}
        onDelete={async () => { if (window.confirm(`Delete "${open.name}" and everything in it?`)) { await hub.remove(open.id); setOpenId(null) } }} />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={muted}>Your own collections: books, gifts, projects, workouts. You choose the columns. Shared ones, date ideas, movies and games are in Household, Collections.</div>
        <button onClick={() => setCreating(c => !c)} className="btn btn-primary press" style={{ fontSize: '0.72rem' }}>+ New collection</button>
      </div>
      {err && <div style={{ ...muted, color: 'var(--rose)' }}>{err}</div>}

      {creating && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.6rem' }}>Start from</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9.5rem, 1fr))', gap: '0.5rem' }}>
            {COLLECTION_TEMPLATES.map(t => (
              <button key={t.id} className="press" onClick={async () => {
                const r = await hub.create(t, t.id === 'blank' ? 'Untitled' : t.label, null)
                setErr(r.error); if (r.id) { setCreating(false); setOpenId(r.id) }
              }} style={{
                textAlign: 'left', cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
                padding: '0.6rem 0.75rem', fontFamily: 'var(--font-body)', color: 'var(--text)',
              }}>
                <div style={{ fontSize: '0.8rem' }}>{t.label}</div>
                <div style={{ ...muted, fontSize: '0.62rem' }}>{t.props.map(p => p.name).join(', ')}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!hub.loading && mine.length === 0 && !creating && (
        <div style={{ ...muted, fontStyle: 'italic', textAlign: 'center', padding: '1.5rem 0' }}>No collections yet. Start with a reading list or make your own.</div>
      )}

      <CollectionCards collections={mine} onOpen={setOpenId} />
    </div>
  )
}

export function CollectionCards({ collections, onOpen }: { collections: Collection[]; onOpen: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(12rem, 100%), 1fr))', gap: '0.7rem' }}>
      {collections.map(c => (
        <button key={c.id} onClick={() => onOpen(c.id)} className="press" style={{
          textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
          padding: '0.85rem 0.95rem', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', gap: '0.3rem',
        }}>
          <span style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{c.name}{c.space_id && <span title="Shared with household" style={{ marginLeft: '0.4rem', fontSize: '0.62rem', color: 'var(--gold)' }}>⇆</span>}</span>
          <span style={{ ...muted, fontSize: '0.62rem' }}>{c.props.length} columns · {c.view}</span>
        </button>
      ))}
    </div>
  )
}

// Your own collection: rows in collection_rows.
export function UserCollectionView({ c, me, spaceId, backLabel, onBack, update, onDelete }: {
  c: Collection; me: string; spaceId: string | null; backLabel: string
  onBack: () => void; update: ReturnType<typeof useCollections>['update']; onDelete: () => void
}) {
  const source = useCollectionRows(c.id)
  const boardProp = c.props.find(p => p.id === c.board_prop && p.type === 'select') ?? c.props.find(p => p.type === 'select') ?? null
  return (
    <>
    {/recipe/i.test(c.name) && <RecipesToKitchen props={c.props} rows={source.rows} spaceId={spaceId} />}
    <CollectionViewGeneric
      name={c.name} props={c.props} view={c.view} boardPropId={boardProp?.id ?? null} locked={new Set()}
      source={source} canShare={!!spaceId && c.user_id === me} shared={!!c.space_id} canDelete={c.user_id === me} canRename
      backLabel={backLabel} onBack={onBack}
      actions={{
        rename: name => { update(c.id, { name }) },
        setProps: props => { update(c.id, { props, ...(!c.board_prop && props.some(p => p.type === 'select') ? { board_prop: props.find(p => p.type === 'select')!.id } : {}) }) },
        setView: view => { update(c.id, { view }) },
        toggleShare: () => { update(c.id, { space_id: c.space_id ? null : spaceId }) },
        remove: onDelete,
      }} />
    </>
  )
}

export function CollectionViewGeneric(v: ViewProps) {
  const { source, props, locked, actions } = v
  const places = v.places ?? []
  const { rows, loading, add, setCell, remove } = source
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ id: string; dir: 1 | -1 } | null>(null)
  const [addingProp, setAddingProp] = useState(false)
  const [pName, setPName] = useState('')
  const [pType, setPType] = useState<PropType>('text')
  const [pOpts, setPOpts] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const titleProp = props[0]
  const boardProp = props.find(p => p.id === v.boardPropId && p.type === 'select') ?? props.find(p => p.type === 'select') ?? null

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = rows.filter(r => !needle || props.some(p => shown(p, r.cells[p.id] ?? null, places).toLowerCase().includes(needle)))
    if (sort) {
      const p = props.find(x => x.id === sort.id)
      out = [...out].sort((a, b) => {
        const av = a.cells[sort.id] ?? '', bv = b.cells[sort.id] ?? ''
        if (p?.type === 'number') return ((Number(av) || 0) - (Number(bv) || 0)) * sort.dir
        if (p?.type === 'checkbox') return (Number(!!av) - Number(!!bv)) * sort.dir
        return (p ? shown(p, av, places) : String(av)).localeCompare(p ? shown(p, bv, places) : String(bv)) * sort.dir
      })
    }
    return out
  }, [rows, q, sort, props, places])

  function addOption(p: CollectionProp, opt: string) {
    const o = opt.trim()
    if (!o || locked.has(p.id) || p.options?.includes(o)) return
    actions.setProps(props.map(x => (x.id === p.id ? { ...x, options: [...(x.options ?? []), o] } : x)))
  }

  function addProp() {
    if (!pName.trim()) return
    const prop = newProp(pName.trim(), pType, pType === 'select' ? pOpts.split(',').map(s => s.trim()).filter(Boolean) : undefined)
    actions.setProps([...props, prop])
    setPName(''); setPOpts(''); setPType('text'); setAddingProp(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button onClick={v.onBack} style={{ ...small, border: 'none', padding: 0 }}>‹ {v.backLabel}</button>
        {v.canRename
          ? <input defaultValue={v.name} onBlur={e => { const t = e.target.value.trim(); if (t && t !== v.name) actions.rename(t) }}
              style={{ ...field, fontFamily: 'var(--font-display)', fontSize: '1.05rem', border: 'none', background: 'none', flex: 1, minWidth: '8rem', padding: '0.2rem 0' }} />
          : <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', flex: 1, minWidth: '8rem' }}>{v.name}</div>}
        <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--hover-bg)', borderRadius: '8px', padding: '0.2rem' }}>
          {(['table', 'board'] as const).map(m => (
            <button key={m} className="press" disabled={m === 'board' && !boardProp} onClick={() => actions.setView(m)} style={{
              ...small, border: 'none', background: v.view === m ? 'var(--surface)' : 'transparent', color: v.view === m ? 'var(--text)' : 'var(--muted)',
              opacity: m === 'board' && !boardProp ? 0.4 : 1,
            }}>{m === 'table' ? 'Table' : 'Board'}</button>
          ))}
        </div>
        {v.canShare && (
          <button style={{ ...small, color: v.shared ? 'var(--gold)' : 'var(--muted)' }} onClick={actions.toggleShare}>⇆ {v.shared ? 'Shared' : 'Share'}</button>
        )}
        {v.canDelete && <button style={{ ...small, color: 'var(--rose)' }} onClick={actions.remove}>Delete</button>}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" style={{ ...field, maxWidth: '14rem' }} />
        <button style={small} onClick={() => setAddingProp(a => !a)}>+ Column</button>
        <button className="btn btn-primary press" style={{ fontSize: '0.7rem' }} onClick={async () => setErr(await add({}))}>+ New row</button>
      </div>

      {addingProp && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={pName} onChange={e => setPName(e.target.value)} placeholder="Column name" style={{ ...field, maxWidth: '12rem' }} autoFocus />
          <select value={pType} onChange={e => setPType(e.target.value as PropType)} style={{ ...field, width: 'auto' }}>
            {ADDABLE.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
          {pType === 'select' && <input value={pOpts} onChange={e => setPOpts(e.target.value)} placeholder="Choices, comma separated" style={{ ...field, maxWidth: '16rem' }} />}
          <button className="btn btn-secondary press" style={{ fontSize: '0.7rem' }} onClick={addProp}>Add column</button>
        </div>
      )}
      {err && <div style={{ ...muted, color: 'var(--rose)' }}>{err}</div>}
      {loading && <div style={muted}>Loading…</div>}
      {!loading && rows.length === 0 && <div style={{ ...muted, fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>No rows yet. Add one.</div>}

      {v.view === 'board' && boardProp
        ? <Board v={v} rows={list} boardProp={boardProp} titleProp={titleProp} places={places} />
        : <Table v={v} rows={list} sort={sort} setSort={setSort} places={places} addOption={addOption} />}
    </div>
  )
}

function ImageCell({ value, rowId, image }: { value: CellValue; rowId: string; image: NonNullable<RowSource['image']> & { set: (path: string) => void } }) {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const path = typeof value === 'string' ? value : null
  useEffect(() => {
    if (!path) { setUrl(null); return }
    let alive = true
    image.urls([path]).then(m => { if (alive) setUrl(m[path] ?? null) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the urls fn is stable per source; only the path matters
  }, [path])
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage url
    return <img src={url} alt="" loading="lazy" style={{ width: '2.4rem', height: '2.4rem', objectFit: 'cover', borderRadius: 6, display: 'block' }} />
  }
  return (
    <label style={{ ...small, display: 'inline-block', position: 'relative' }}>
      {busy ? '…' : '+ photo'}
      <input type="file" accept="image/*" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
        onChange={async e => {
          const f = e.target.files?.[0]; if (!f) return
          setBusy(true)
          try { image.set(await image.upload(rowId, f)) } catch (err) { console.error('photo upload failed', err) }
          setBusy(false)
        }} />
    </label>
  )
}

function Cell({ p, value, rowId, onChange, onAddOption, locked, places, image }: {
  p: CollectionProp; value: CellValue; rowId: string; onChange: (v: CellValue) => void
  onAddOption: (o: string) => void; locked: boolean; places: Place[]; image: RowSource['image']
}) {
  const [draft, setDraft] = useState(value == null ? '' : String(value))
  useEffect(() => { setDraft(value == null ? '' : String(value)) }, [value])
  const base: React.CSSProperties = { ...field, border: '1px solid transparent', background: 'transparent', padding: '0.3rem 0.4rem', fontSize: '0.78rem' }
  if (p.type === 'checkbox') return <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ cursor: 'pointer' }} />
  if (p.type === 'image') return image ? <ImageCell value={value} rowId={rowId} image={{ ...image, set: path => onChange(path) }} /> : null
  if (p.type === 'place') {
    return (
      <select value={typeof value === 'string' ? value : ''} style={base} onChange={e => onChange(e.target.value || null)}>
        <option value="">-</option>
        {[...places].sort((a, b) => a.name.localeCompare(b.name)).map(pl => <option key={pl.id} value={pl.id}>{pl.name}</option>)}
      </select>
    )
  }
  if (p.type === 'select') {
    return (
      <select value={typeof value === 'string' ? value : ''} style={base} onChange={e => {
        if (e.target.value === '__new') { const o = window.prompt('New choice'); if (o && o.trim()) { onAddOption(o); onChange(o.trim()) } return }
        onChange(e.target.value || null)
      }}>
        <option value="">-</option>
        {(p.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        {!locked && <option value="__new">+ New choice…</option>}
      </select>
    )
  }
  if (p.type === 'date') return <input type="date" value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value || null)} style={base} />
  const commit = () => {
    if (p.type === 'number') { const n = draft.trim() === '' ? null : Number(draft); if (n === null || !Number.isNaN(n)) onChange(n) }
    else onChange(draft.trim() === '' ? null : draft)
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <input type={p.type === 'number' ? 'number' : 'text'} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} style={base} />
      {p.type === 'url' && typeof value === 'string' && /^https?:\/\//i.test(value) && (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.7rem', color: 'var(--gold)', textDecoration: 'none' }}>open</a>
      )}
    </div>
  )
}

function Table({ v, rows, sort, setSort, places, addOption }: {
  v: ViewProps; rows: CollectionRow[]; sort: { id: string; dir: 1 | -1 } | null
  setSort: (s: { id: string; dir: 1 | -1 } | null) => void; places: Place[]; addOption: (p: CollectionProp, o: string) => void
}) {
  const { props, locked, source, actions } = v
  const numbers = props.filter(p => p.type === 'number')
  const renameProp = (p: CollectionProp, name: string) => actions.setProps(props.map(x => (x.id === p.id ? { ...x, name } : x)))
  const removeProp = (p: CollectionProp) => { if (window.confirm(`Remove the "${p.name}" column? The values in it are lost.`)) actions.setProps(props.filter(x => x.id !== p.id)) }
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${props.length * 9}rem` }}>
        <thead>
          <tr>
            {props.map(p => (
              <th key={p.id} style={{ textAlign: 'left', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 400 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input defaultValue={p.name} disabled={locked.has(p.id)} onBlur={e => { const t = e.target.value.trim(); if (t && t !== p.name) renameProp(p, t) }}
                    style={{ ...field, border: 'none', background: 'none', padding: '0.1rem 0', fontSize: '0.68rem', letterSpacing: '0.04em', color: 'var(--muted)' }} />
                  <button title="Sort" style={{ ...small, border: 'none', padding: '0 0.2rem' }} onClick={() => setSort(sort?.id === p.id ? (sort.dir === 1 ? { id: p.id, dir: -1 } : null) : { id: p.id, dir: 1 })}>
                    {sort?.id === p.id ? (sort.dir === 1 ? '↑' : '↓') : '↕'}
                  </button>
                  {!locked.has(p.id) && props.length > 1 && <button title="Remove column" style={{ ...small, border: 'none', padding: '0 0.2rem', opacity: 0.5 }} onClick={() => removeProp(p)}>✕</button>}
                </div>
              </th>
            ))}
            <th style={{ width: '4rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }} />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              {props.map(p => (
                <td key={p.id} style={{ padding: '0.1rem 0.3rem', borderBottom: '1px solid var(--faint)' }}>
                  <Cell p={p} value={r.cells[p.id] ?? null} rowId={r.id} locked={locked.has(p.id)} places={places} image={source.image}
                    onChange={val => source.setCell(r.id, p.id, val)} onAddOption={o => addOption(p, o)} />
                </td>
              ))}
              <td style={{ borderBottom: '1px solid var(--faint)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                <RowSendMenu props={props} row={r} />
                <button title="Delete row" style={{ ...small, border: 'none', opacity: 0.45 }} onClick={() => source.remove(r.id)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
        {numbers.length > 0 && rows.length > 0 && (
          <tfoot>
            <tr>
              {props.map(p => (
                <td key={p.id} style={{ padding: '0.35rem 0.6rem', fontSize: '0.66rem', color: 'var(--muted)' }}>
                  {p.type === 'number' ? `Sum ${rows.reduce((s, r) => s + (Number(r.cells[p.id]) || 0), 0)}` : p === props[0] ? `${rows.length} rows` : ''}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

function Board({ v, rows, boardProp, titleProp, places }: {
  v: ViewProps; rows: CollectionRow[]; boardProp: CollectionProp; titleProp: CollectionProp; places: Place[]
}) {
  const { source, props, locked } = v
  const [dragId, setDragId] = useState<string | null>(null)
  const columns = [...(boardProp.options ?? []), ''] // '' = no value yet
  const others = props.filter(p => p.id !== titleProp.id && p.id !== boardProp.id && p.type !== 'image').slice(0, 2)
  return (
    <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(11rem, 1fr)', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
      {columns.map(col => {
        const items = rows.filter(r => (typeof r.cells[boardProp.id] === 'string' ? (r.cells[boardProp.id] as string) : '') === col)
        if (col === '' && items.length === 0) return null
        return (
          <div key={col || '__none'}
            onDragOver={e => { if (dragId) e.preventDefault() }}
            onDrop={() => { if (dragId) { source.setCell(dragId, boardProp.id, col || null); setDragId(null) } }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', minHeight: '6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>{col || 'No ' + boardProp.name.toLowerCase()} · {items.length}</span>
              {col !== '' && <button style={{ ...small, border: 'none', padding: '0 0.3rem' }} title="Add a card here" onClick={() => source.add({ [boardProp.id]: col })}>+</button>}
            </div>
            {items.map(r => (
              <div key={r.id} draggable onDragStart={() => setDragId(r.id)} onDragEnd={() => setDragId(null)} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '0.5rem 0.6rem',
                cursor: 'grab', display: 'flex', flexDirection: 'column', gap: '0.15rem', opacity: dragId === r.id ? 0.5 : 1,
              }}>
                <Cell p={titleProp} value={r.cells[titleProp.id] ?? null} rowId={r.id} locked={locked.has(titleProp.id)} places={places} image={source.image}
                  onChange={val => source.setCell(r.id, titleProp.id, val)} onAddOption={() => {}} />
                {others.map(p => {
                  const text = typeof r.cells[p.id] === 'boolean' ? (r.cells[p.id] ? 'yes' : '') : shown(p, r.cells[p.id] ?? null, places)
                  return text ? <span key={p.id} style={{ ...muted, fontSize: '0.64rem', paddingLeft: '0.4rem' }}>{p.name}: {text}</span> : null
                })}
                <div style={{ display: 'flex', gap: '0.3rem', paddingLeft: '0.2rem' }}>
                  <select value={typeof r.cells[boardProp.id] === 'string' ? (r.cells[boardProp.id] as string) : ''} onChange={e => source.setCell(r.id, boardProp.id, e.target.value || null)}
                    style={{ ...small, padding: '0.1em 0.3em' }} aria-label="Move to">
                    <option value="">-</option>{(boardProp.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <RowSendMenu props={props} row={r} />
                  <button style={{ ...small, border: 'none', opacity: 0.5 }} onClick={() => source.remove(r.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
