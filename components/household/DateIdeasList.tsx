'use client'

import { useEffect, useMemo, useState } from 'react'
import { withUndo } from '@/lib/ui/undo'
import { useDateIdeas, type DateIdea, type PriceRange } from '@/lib/hooks/useDateIdeas'
import { DATE_GROUPS, guessGroup, sectionsFor } from '@/lib/dateIdeas/groups'
import { uploadDateIdeaPhoto, getDateIdeaPhotoUrls } from '@/lib/storage/dateIdeaPhotos'
import Sheet from '@/components/ui/Sheet'
import { field, muted, chip, linkBtn, card, label } from './listStyles'

// Date ideas, sorted into sections (2026-11-10). Type an idea and press
// Enter; it lands in the section you picked, or the one its name suggests.
// Planned ideas sit at the top, done ones become a small photo album at the
// bottom. Filters keep ideas that have not been tagged yet, so a filter
// never hides something just because nobody filled that in.

type Cost = 'any' | 'cheap' | 'treat'
type Energy = 'any' | 'light' | 'deep'
type Setting = 'any' | 'indoor' | 'outdoor'

const cheap = (p: PriceRange | null) => !p || p === '$' || p === '$$'
const treat = (p: PriceRange | null) => !p || p === '$$$' || p === '$$$$'

function fits(d: DateIdea, cost: Cost, energy: Energy, setting: Setting) {
  if (cost === 'cheap' && !cheap(d.price_range)) return false
  if (cost === 'treat' && !treat(d.price_range)) return false
  if (energy === 'light' && d.energy && d.energy !== 'light') return false
  if (energy === 'deep' && d.energy && d.energy === 'light') return false
  if (setting !== 'any' && d.indoor_outdoor && d.indoor_outdoor !== 'either' && d.indoor_outdoor !== setting) return false
  return true
}

const meta = (d: DateIdea) => [
  d.price_range,
  d.energy ? ({ light: 'Low energy', medium: 'Some energy', deep: 'Big day' } as const)[d.energy] : null,
  d.indoor_outdoor && d.indoor_outdoor !== 'either' ? (d.indoor_outdoor === 'indoor' ? 'Indoor' : 'Outdoor') : null,
].filter(Boolean).join(' · ')

export default function DateIdeasList({ spaceId, onTable }: { spaceId: string; onTable: () => void }) {
  const { ideas, loading, addIdea, update, removeIdea } = useDateIdeas(spaceId)
  const [text, setText] = useState('')
  const [section, setSection] = useState('')
  const [cost, setCost] = useState<Cost>('any')
  const [energy, setEnergy] = useState<Energy>('any')
  const [setting, setSetting] = useState<Setting>('any')
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [newSection, setNewSection] = useState('')
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [err, setErr] = useState<string | null>(null)

  const sections = useMemo(() => sectionsFor(ideas.map(i => i.area)), [ideas])
  const shown = useMemo(() => ideas.filter(d => fits(d, cost, energy, setting)), [ideas, cost, energy, setting])
  const planned = shown.filter(d => d.status === 'planned')
  const done = ideas.filter(d => d.status === 'done')
  const open = ideas.find(d => d.id === openId) ?? null

  const donePaths = done.map(d => d.photo_path).filter((p): p is string => !!p).join('|')
  useEffect(() => {
    if (!donePaths) return
    getDateIdeaPhotoUrls(donePaths.split('|')).then(setPhotos).catch(() => {})
  }, [donePaths])

  async function add() {
    const t = text.trim()
    if (!t) return
    setText('')
    setErr(await addIdea(t, { area: section || guessGroup(t) }))
  }

  async function addPhoto(d: DateIdea, file: File) {
    try {
      const path = await uploadDateIdeaPhoto(d.id, file)
      await update(d.id, { photo_path: path })
      const urls = await getDateIdeaPhotoUrls([path])
      setPhotos(p => ({ ...p, ...urls }))
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not add that photo.') }
  }

  const ideaCard = (d: DateIdea) => (
    <button key={d.id} className="press" onClick={() => setOpenId(d.id)} style={{ ...card, cursor: 'pointer', minHeight: 52 }}>
      <span style={{ fontSize: '0.88rem' }}>{d.title || 'Untitled'}</span>
      {meta(d) && <span style={{ ...muted, fontSize: '0.66rem' }}>{meta(d)}</span>}
    </button>
  )
  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9.5rem, 1fr))', gap: '0.45rem' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }}
          placeholder="Add a date idea" style={{ ...field, flex: '1 1 12rem' }} aria-label="New date idea" />
        <select value={section} onChange={e => setSection(e.target.value)} style={{ ...field, fontSize: '0.82rem' }} aria-label="Section">
          <option value="">Sort it for me</option>
          {sections.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn btn-primary press" style={{ minHeight: 44 }} onClick={add}>Add</button>
      </div>
      {err && <div style={{ ...muted, color: 'var(--rose)' }}>{err}</div>}

      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={chip(cost === 'cheap')} onClick={() => setCost(c => (c === 'cheap' ? 'any' : 'cheap'))}>Cheap</button>
        <button style={chip(cost === 'treat')} onClick={() => setCost(c => (c === 'treat' ? 'any' : 'treat'))}>A treat</button>
        <button style={chip(energy === 'light')} onClick={() => setEnergy(e => (e === 'light' ? 'any' : 'light'))}>Low energy</button>
        <button style={chip(energy === 'deep')} onClick={() => setEnergy(e => (e === 'deep' ? 'any' : 'deep'))}>Up for it</button>
        <button style={chip(setting === 'indoor')} onClick={() => setSetting(s => (s === 'indoor' ? 'any' : 'indoor'))}>Indoor</button>
        <button style={chip(setting === 'outdoor')} onClick={() => setSetting(s => (s === 'outdoor' ? 'any' : 'outdoor'))}>Outdoor</button>
        <button style={{ ...linkBtn, marginLeft: 'auto' }} onClick={onTable}>Table view</button>
      </div>

      {loading && <div style={muted}>Loading…</div>}

      {planned.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid color-mix(in srgb, var(--gold) 35%, var(--border))', borderRadius: 14, padding: '0.7rem' }}>
          <div style={{ ...muted, color: 'var(--gold)', letterSpacing: '0.04em' }}>Planned · {planned.length}</div>
          <div style={grid}>{planned.map(ideaCard)}</div>
        </div>
      )}

      {sections.map(s => {
        const list = shown.filter(d => d.status === 'idea' && (d.area ?? guessGroup(d.title)) === s)
        if (list.length === 0 && !(DATE_GROUPS as readonly string[]).includes(s)) return null
        const isClosed = closed.has(s)
        return (
          <div key={s} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <button style={{ ...linkBtn, textAlign: 'left', fontSize: '0.8rem', color: 'var(--text)' }}
              onClick={() => setClosed(c => { const n = new Set(c); if (n.has(s)) n.delete(s); else n.add(s); return n })}>
              {isClosed ? '▸' : '▾'} {s} <span style={muted}>· {list.length}</span>
            </button>
            {!isClosed && (list.length
              ? <div style={grid}>{list.map(ideaCard)}</div>
              : <div style={{ ...muted, fontStyle: 'italic', opacity: 0.7 }}>Nothing here{cost !== 'any' || energy !== 'any' || setting !== 'any' ? ' with these filters' : ' yet'}.</div>)}
          </div>
        )
      })}

      {done.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ ...muted, letterSpacing: '0.04em' }}>Done together · {done.length}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(7rem, 1fr))', gap: '0.45rem' }}>
            {done.map(d => {
              const url = d.photo_path ? photos[d.photo_path] : null
              return (
                <button key={d.id} className="press" onClick={() => setOpenId(d.id)} style={{
                  ...card, padding: 0, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1', justifyContent: 'flex-end',
                  background: url ? `center / cover no-repeat url("${url}")` : 'var(--surface2)',
                }}>
                  <span style={{ fontSize: '0.74rem', padding: '0.35rem 0.5rem', background: url ? 'color-mix(in srgb, var(--surface) 82%, transparent)' : 'transparent' }}>{d.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Sheet open={!!open} title={open?.title || 'Date idea'} onClose={() => setOpenId(null)}
        footer={open && (
          <>
            {open.status !== 'planned' && <button className="btn btn-primary press" onClick={() => update(open.id, { status: 'planned' })}>Plan it</button>}
            {open.status !== 'done' && <button className="btn btn-secondary press" onClick={() => update(open.id, { status: 'done' })}>We did it</button>}
            {open.status !== 'idea' && <button className="btn btn-ghost press" onClick={() => update(open.id, { status: 'idea' })}>Back to ideas</button>}
            <button className="btn btn-ghost press" style={{ marginLeft: 'auto', color: 'var(--rose)' }} onClick={() => {
              const d = open; setOpenId(null); withUndo(`Removing "${d.title}"`, () => removeIdea(d.id))
            }}>Remove</button>
          </>
        )}>
        {open && (
          <>
            <label style={label}>Idea
              <input key={open.id + 't'} defaultValue={open.title} style={field} onBlur={e => { const t = e.target.value.trim(); if (t && t !== open.title) update(open.id, { title: t }) }} />
            </label>
            <label style={label}>Section
              <select value={open.area ?? guessGroup(open.title)} style={field} onChange={e => update(open.id, { area: e.target.value })}>
                {sections.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <input value={newSection} onChange={e => setNewSection(e.target.value)} placeholder="Or a new section" style={{ ...field, flex: 1 }} />
              <button className="btn btn-secondary press" onClick={() => { const s = newSection.trim(); if (s) { update(open.id, { area: s }); setNewSection('') } }}>Move</button>
            </div>
            <div style={label}>Cost
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {(['Free', '$', '$$', '$$$', '$$$$'] as const).map(p => {
                  const v = p === 'Free' ? null : p
                  return <button key={p} style={chip(open.price_range === v && (v !== null || open.category === 'cheap'))} onClick={() => update(open.id, v ? { price_range: v } : { price_range: null, category: 'cheap' })}>{p}</button>
                })}
              </div>
            </div>
            <div style={label}>Energy
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {([['light', 'Low'], ['medium', 'Some'], ['deep', 'Big day']] as const).map(([k, l]) => (
                  <button key={k} style={chip(open.energy === k)} onClick={() => update(open.id, { energy: open.energy === k ? null : k })}>{l}</button>
                ))}
              </div>
            </div>
            <div style={label}>Where
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {([['indoor', 'Indoor'], ['outdoor', 'Outdoor'], ['either', 'Either']] as const).map(([k, l]) => (
                  <button key={k} style={chip(open.indoor_outdoor === k)} onClick={() => update(open.id, { indoor_outdoor: open.indoor_outdoor === k ? null : k })}>{l}</button>
                ))}
              </div>
            </div>
            <label style={label}>Notes
              <textarea key={open.id + 'n'} defaultValue={open.notes ?? ''} rows={3} style={{ ...field, padding: '0.5rem 0.75rem', resize: 'vertical' }}
                onBlur={e => { const n = e.target.value.trim() || null; if (n !== open.notes) update(open.id, { notes: n }) }} />
            </label>
            {open.status === 'done' && (
              <label style={label}>{open.photo_path ? 'Change the photo' : 'Add a photo'}
                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) addPhoto(open, f) }} />
              </label>
            )}
          </>
        )}
      </Sheet>
    </div>
  )
}
