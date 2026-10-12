'use client'

import { useMemo, useState } from 'react'
import {
  useCollections, useCollectionRows, newProp, COLLECTION_TEMPLATES,
  type Collection, type CollectionProp, type CollectionRow, type CellValue, type PropType,
} from '@/lib/hooks/useCollections'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

// Collections (2026-10-12): small databases you shape yourself. Pick a
// starting point (reading list, gift ideas, home projects…) or a blank one,
// add your own columns, and view the rows as a table or a board. Share one
// with the household and both of you can edit it.

const field: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '0.4rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)',
  fontSize: '0.78rem', outline: 'none',
}
const muted: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }
const small: React.CSSProperties = { fontSize: '0.64rem', padding: '0.22em 0.65em', borderRadius: '7px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }
const TYPE_LABEL: Record<PropType, string> = { text: 'Text', number: 'Number', date: 'Date', checkbox: 'Checkbox', select: 'Choice', url: 'Link' }

export default function CollectionsHub({ userId }: { userId: string }) {
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null
  const hub = useCollections()
  const [openId, setOpenId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const open = hub.collections.find(c => c.id === openId) ?? null

  if (hub.error) return <div style={muted}>{hub.error}</div>

  if (open) {
    return <CollectionView key={open.id} c={open} me={userId} spaceId={spaceId} onBack={() => setOpenId(null)}
      update={hub.update} onDelete={async () => { if (window.confirm(`Delete "${open.name}" and everything in it?`)) { await hub.remove(open.id); setOpenId(null) } }} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={muted}>Track anything: books, gifts, projects, workouts. You choose the columns.</div>
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

      {!hub.loading && hub.collections.length === 0 && !creating && (
        <div style={{ ...muted, fontStyle: 'italic', textAlign: 'center', padding: '1.5rem 0' }}>No collections yet. Start with a reading list or make your own.</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: '0.7rem' }}>
        {hub.collections.map(c => (
          <button key={c.id} onClick={() => setOpenId(c.id)} className="press" style={{
            textAlign: 'left', cursor: 'pointer', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px',
            padding: '0.85rem 0.95rem', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', gap: '0.3rem',
          }}>
            <span style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{c.name}{c.space_id && <span title="Shared with household" style={{ marginLeft: '0.4rem', fontSize: '0.62rem', color: 'var(--gold)' }}>⇆</span>}</span>
            <span style={{ ...muted, fontSize: '0.62rem' }}>{c.props.length} columns · {c.view}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CollectionView({ c, me, spaceId, onBack, update, onDelete }: {
  c: Collection; me: string; spaceId: string | null
  onBack: () => void; update: ReturnType<typeof useCollections>['update']; onDelete: () => void
}) {
  const { rows, loading, add, setCell, remove } = useCollectionRows(c.id)
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<{ id: string; dir: 1 | -1 } | null>(null)
  const [addingProp, setAddingProp] = useState(false)
  const [pName, setPName] = useState('')
  const [pType, setPType] = useState<PropType>('text')
  const [pOpts, setPOpts] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const titleProp = c.props[0]
  const boardProp = c.props.find(p => p.id === c.board_prop && p.type === 'select') ?? c.props.find(p => p.type === 'select') ?? null
  const mineOrShared = c.user_id === me || !!c.space_id

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let out = rows.filter(r => !needle || c.props.some(p => String(r.cells[p.id] ?? '').toLowerCase().includes(needle)))
    if (sort) {
      const p = c.props.find(x => x.id === sort.id)
      out = [...out].sort((a, b) => {
        const av = a.cells[sort.id] ?? '', bv = b.cells[sort.id] ?? ''
        if (p?.type === 'number') return ((Number(av) || 0) - (Number(bv) || 0)) * sort.dir
        if (p?.type === 'checkbox') return (Number(!!av) - Number(!!bv)) * sort.dir
        return String(av).localeCompare(String(bv)) * sort.dir
      })
    }
    return out
  }, [rows, q, sort, c.props])

  function setProps(props: CollectionProp[]) { update(c.id, { props }) }
  function addOption(p: CollectionProp, opt: string) {
    const o = opt.trim()
    if (!o || p.options?.includes(o)) return
    setProps(c.props.map(x => (x.id === p.id ? { ...x, options: [...(x.options ?? []), o] } : x)))
  }

  async function addProp() {
    if (!pName.trim()) return
    const prop = newProp(pName.trim(), pType, pType === 'select' ? pOpts.split(',').map(s => s.trim()).filter(Boolean) : undefined)
    await update(c.id, { props: [...c.props, prop], ...(pType === 'select' && !c.board_prop ? { board_prop: prop.id } : {}) })
    setPName(''); setPOpts(''); setPType('text'); setAddingProp(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ ...small, border: 'none', padding: 0 }}>‹ Collections</button>
        <input defaultValue={c.name} onBlur={e => { const v = e.target.value.trim(); if (v && v !== c.name) update(c.id, { name: v }) }}
          style={{ ...field, fontFamily: 'var(--font-display)', fontSize: '1.05rem', border: 'none', background: 'none', flex: 1, minWidth: '8rem', padding: '0.2rem 0' }} />
        <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--hover-bg)', borderRadius: '8px', padding: '0.2rem' }}>
          {(['table', 'board'] as const).map(v => (
            <button key={v} className="press" disabled={v === 'board' && !boardProp} onClick={() => update(c.id, { view: v })} style={{
              ...small, border: 'none', background: c.view === v ? 'var(--surface)' : 'transparent', color: c.view === v ? 'var(--text)' : 'var(--muted)',
              opacity: v === 'board' && !boardProp ? 0.4 : 1,
            }}>{v === 'table' ? 'Table' : 'Board'}</button>
          ))}
        </div>
        {spaceId && c.user_id === me && (
          <button style={{ ...small, color: c.space_id ? 'var(--gold)' : 'var(--muted)' }} onClick={() => update(c.id, { space_id: c.space_id ? null : spaceId })}>
            ⇆ {c.space_id ? 'Shared' : 'Share'}
          </button>
        )}
        {c.user_id === me && <button style={{ ...small, color: 'var(--rose)' }} onClick={onDelete}>Delete</button>}
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
            {(Object.keys(TYPE_LABEL) as PropType[]).map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
          </select>
          {pType === 'select' && <input value={pOpts} onChange={e => setPOpts(e.target.value)} placeholder="Choices, comma separated" style={{ ...field, maxWidth: '16rem' }} />}
          <button className="btn btn-secondary press" style={{ fontSize: '0.7rem' }} onClick={addProp}>Add column</button>
        </div>
      )}
      {err && <div style={{ ...muted, color: 'var(--rose)' }}>{err}</div>}
      {loading && <div style={muted}>Loading…</div>}
      {!loading && rows.length === 0 && <div style={{ ...muted, fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>No rows yet. Add one.</div>}

      {c.view === 'board' && boardProp
        ? <Board c={c} rows={shown} boardProp={boardProp} titleProp={titleProp} setCell={setCell} add={add} remove={remove} />
        : <Table c={c} rows={shown} sort={sort} setSort={setSort} setCell={setCell} remove={remove} addOption={addOption}
            removeProp={p => { if (window.confirm(`Remove the "${p.name}" column? The values in it are lost.`)) setProps(c.props.filter(x => x.id !== p.id)) }}
            renameProp={(p, name) => setProps(c.props.map(x => (x.id === p.id ? { ...x, name } : x)))} canEdit={mineOrShared} />}
    </div>
  )
}

function Cell({ p, value, onChange, onAddOption }: { p: CollectionProp; value: CellValue; onChange: (v: CellValue) => void; onAddOption: (o: string) => void }) {
  const [draft, setDraft] = useState(value == null ? '' : String(value))
  const base: React.CSSProperties = { ...field, border: '1px solid transparent', background: 'transparent', padding: '0.3rem 0.4rem', fontSize: '0.78rem' }
  if (p.type === 'checkbox') return <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} style={{ cursor: 'pointer' }} />
  if (p.type === 'select') {
    return (
      <select value={typeof value === 'string' ? value : ''} style={base} onChange={e => {
        if (e.target.value === '__new') { const o = window.prompt('New choice'); if (o && o.trim()) { onAddOption(o); onChange(o.trim()) } return }
        onChange(e.target.value || null)
      }}>
        <option value="">-</option>
        {(p.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
        <option value="__new">+ New choice…</option>
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

function Table({ c, rows, sort, setSort, setCell, remove, addOption, removeProp, renameProp, canEdit }: {
  c: Collection; rows: CollectionRow[]; sort: { id: string; dir: 1 | -1 } | null
  setSort: (s: { id: string; dir: 1 | -1 } | null) => void
  setCell: (id: string, prop: string, v: CellValue) => Promise<string | null>; remove: (id: string) => Promise<string | null>
  addOption: (p: CollectionProp, o: string) => void; removeProp: (p: CollectionProp) => void; renameProp: (p: CollectionProp, name: string) => void
  canEdit: boolean
}) {
  const numbers = c.props.filter(p => p.type === 'number')
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '10px' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: `${c.props.length * 9}rem` }}>
        <thead>
          <tr>
            {c.props.map(p => (
              <th key={p.id} style={{ textAlign: 'left', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', fontWeight: 400 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input defaultValue={p.name} disabled={!canEdit} onBlur={e => { const v = e.target.value.trim(); if (v && v !== p.name) renameProp(p, v) }}
                    style={{ ...field, border: 'none', background: 'none', padding: '0.1rem 0', fontSize: '0.68rem', letterSpacing: '0.04em', color: 'var(--muted)' }} />
                  <button title="Sort" style={{ ...small, border: 'none', padding: '0 0.2rem' }} onClick={() => setSort(sort?.id === p.id ? (sort.dir === 1 ? { id: p.id, dir: -1 } : null) : { id: p.id, dir: 1 })}>
                    {sort?.id === p.id ? (sort.dir === 1 ? '↑' : '↓') : '↕'}
                  </button>
                  {canEdit && c.props.length > 1 && <button title="Remove column" style={{ ...small, border: 'none', padding: '0 0.2rem', opacity: 0.5 }} onClick={() => removeProp(p)}>✕</button>}
                </div>
              </th>
            ))}
            <th style={{ width: '2rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }} />
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              {c.props.map(p => (
                <td key={p.id} style={{ padding: '0.1rem 0.3rem', borderBottom: '1px solid var(--faint)' }}>
                  <Cell p={p} value={r.cells[p.id] ?? null} onChange={v => setCell(r.id, p.id, v)} onAddOption={o => addOption(p, o)} />
                </td>
              ))}
              <td style={{ borderBottom: '1px solid var(--faint)', textAlign: 'center' }}>
                <button title="Delete row" style={{ ...small, border: 'none', opacity: 0.45 }} onClick={() => remove(r.id)}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
        {numbers.length > 0 && rows.length > 0 && (
          <tfoot>
            <tr>
              {c.props.map(p => (
                <td key={p.id} style={{ padding: '0.35rem 0.6rem', fontSize: '0.66rem', color: 'var(--muted)' }}>
                  {p.type === 'number' ? `Sum ${rows.reduce((s, r) => s + (Number(r.cells[p.id]) || 0), 0)}` : p === c.props[0] ? `${rows.length} rows` : ''}
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

function Board({ c, rows, boardProp, titleProp, setCell, add, remove }: {
  c: Collection; rows: CollectionRow[]; boardProp: CollectionProp; titleProp: CollectionProp
  setCell: (id: string, prop: string, v: CellValue) => Promise<string | null>
  add: (cells?: Record<string, CellValue>) => Promise<string | null>; remove: (id: string) => Promise<string | null>
}) {
  const [dragId, setDragId] = useState<string | null>(null)
  const columns = [...(boardProp.options ?? []), ''] // '' = no value yet
  const others = c.props.filter(p => p.id !== titleProp.id && p.id !== boardProp.id).slice(0, 2)
  return (
    <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(11rem, 1fr)', gap: '0.6rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
      {columns.map(col => {
        const items = rows.filter(r => (typeof r.cells[boardProp.id] === 'string' ? (r.cells[boardProp.id] as string) : '') === col)
        if (col === '' && items.length === 0) return null
        return (
          <div key={col || '__none'}
            onDragOver={e => { if (dragId) e.preventDefault() }}
            onDrop={() => { if (dragId) { setCell(dragId, boardProp.id, col || null); setDragId(null) } }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', minHeight: '6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.04em' }}>{col || 'No ' + boardProp.name.toLowerCase()} · {items.length}</span>
              {col !== '' && <button style={{ ...small, border: 'none', padding: '0 0.3rem' }} title="Add a card here" onClick={() => add({ [boardProp.id]: col })}>+</button>}
            </div>
            {items.map(r => (
              <div key={r.id} draggable onDragStart={() => setDragId(r.id)} onDragEnd={() => setDragId(null)} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '9px', padding: '0.5rem 0.6rem',
                cursor: 'grab', display: 'flex', flexDirection: 'column', gap: '0.15rem', opacity: dragId === r.id ? 0.5 : 1,
              }}>
                <Cell p={titleProp} value={r.cells[titleProp.id] ?? null} onChange={v => setCell(r.id, titleProp.id, v)} onAddOption={() => {}} />
                {others.map(p => r.cells[p.id] != null && r.cells[p.id] !== '' && (
                  <span key={p.id} style={{ ...muted, fontSize: '0.64rem', paddingLeft: '0.4rem' }}>{p.name}: {typeof r.cells[p.id] === 'boolean' ? (r.cells[p.id] ? 'yes' : 'no') : String(r.cells[p.id])}</span>
                ))}
                <div style={{ display: 'flex', gap: '0.3rem', paddingLeft: '0.2rem' }}>
                  <select value={typeof r.cells[boardProp.id] === 'string' ? (r.cells[boardProp.id] as string) : ''} onChange={e => setCell(r.id, boardProp.id, e.target.value || null)}
                    style={{ ...small, padding: '0.1em 0.3em' }} aria-label="Move to">
                    <option value="">-</option>{(boardProp.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <button style={{ ...small, border: 'none', opacity: 0.5 }} onClick={() => remove(r.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
