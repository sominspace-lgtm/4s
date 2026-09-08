'use client'

import { useEffect, useState } from 'react'
import { useDateIdeas, DATE_IDEA_CATEGORIES, type DateIdea, type DateIdeaStatus, type DateIdeaCategory, type PriceRange } from '@/lib/hooks/useDateIdeas'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { uploadDateIdeaPhoto, getDateIdeaPhotoUrls } from '@/lib/storage/dateIdeaPhotos'
import type { Energy } from '@/lib/hooks/useWorkItems'
import Icon from '@/components/ui/Icon'

const inputStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '0.4rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', outline: 'none',
}
const STATUS_LABEL: Record<DateIdeaStatus, string> = { idea: 'Idea', planned: 'Planned', done: 'Done' }
const STATUS_ORDER: DateIdeaStatus[] = ['planned', 'idea', 'done']
const ENERGY_LABEL: Record<Energy, string> = { light: 'Light', medium: 'Medium', deep: 'Deep' }
const PRICE_RANGES: PriceRange[] = ['$', '$$', '$$$', '$$$$']

// Grouping keys: the three real categories plus a catch-all for the rest.
const GROUPS: { key: DateIdeaCategory | 'other'; label: string }[] = [
  ...DATE_IDEA_CATEGORIES,
  { key: 'other', label: 'Anything else' },
]

function DoneAlbumPhoto({ idea, update }: {
  idea: DateIdea
  update: ReturnType<typeof useDateIdeas>['update']
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!idea.photo_path) { setUrl(null); return }
    let alive = true
    getDateIdeaPhotoUrls([idea.photo_path]).then(m => { if (alive) setUrl(m[idea.photo_path!] ?? null) })
    return () => { alive = false }
  }, [idea.photo_path])

  async function pick(file: File | null) {
    if (!file) return
    setBusy(true)
    try {
      const path = await uploadDateIdeaPhoto(idea.id, file)
      await update(idea.id, { photo_path: path })
    } catch (e) { console.error('date idea photo upload failed', e) }
    setBusy(false)
  }

  if (url) {
    return <img src={url} alt={idea.title} loading="lazy" style={{ width: '100%', borderRadius: 8, marginBottom: '0.5rem', maxHeight: '9rem', objectFit: 'cover', display: 'block' }} />
  }
  return (
    <label style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative',
      border: '1px dashed var(--border)', borderRadius: 8, padding: '0.6rem', marginBottom: '0.5rem',
      fontSize: '0.64rem', color: 'var(--muted)',
    }}>
      {busy ? 'Uploading…' : '+ Add a photo from this one'}
      <input type="file" accept="image/*" onChange={e => pick(e.target.files?.[0] ?? null)}
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
    </label>
  )
}

function IdeaBox({ idea, places, update, removeIdea, addPlace, spaceId }: {
  idea: DateIdea
  places: ReturnType<typeof usePlaces>['places']
  update: ReturnType<typeof useDateIdeas>['update']
  removeIdea: ReturnType<typeof useDateIdeas>['removeIdea']
  addPlace: ReturnType<typeof usePlaces>['addPlace']
  spaceId: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const [addressDraft, setAddressDraft] = useState('')
  const [tagDraft, setTagDraft] = useState('')
  const placeName = idea.place_id ? places.find(p => p.id === idea.place_id)?.name ?? null : null

  const meta: string[] = []
  if (idea.price_range) meta.push(idea.price_range)
  if (idea.energy) meta.push(ENERGY_LABEL[idea.energy])
  if (idea.indoor_outdoor) meta.push(idea.indoor_outdoor === 'either' ? 'in/out' : idea.indoor_outdoor)

  async function saveAddress() {
    const val = addressDraft.trim()
    if (!val) return
    const { place, error } = await addPlace({ name: idea.title, address: val, shared: !!spaceId, status: 'idea' }, spaceId)
    if (error) { console.error('Failed to create pin:', error); return }
    if (place) await update(idea.id, { place_id: place.id })
    setAddressDraft('')
  }

  return (
    <div style={{
      border: `1px solid ${idea.status === 'planned' ? 'color-mix(in srgb, var(--gold) 40%, var(--border))' : 'var(--border)'}`,
      borderRadius: 12, padding: '0.7rem 0.8rem', background: 'var(--surface2)',
      display: 'flex', flexDirection: 'column',
    }}>
      {idea.status === 'done' && <DoneAlbumPhoto idea={idea} update={update} />}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
        <button onClick={() => setExpanded(v => !v)} className="press" style={{
          flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.35,
        }}>{idea.title}</button>
        <button onClick={() => removeIdea(idea.id)} aria-label={`Remove ${idea.title}`} className="press"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
        <select value={idea.status} onChange={e => update(idea.id, { status: e.target.value as DateIdeaStatus })}
          style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.15rem 0.35rem', cursor: 'pointer' }}>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        {meta.length > 0 && <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.7 }}>{meta.join(' · ')}</span>}
        {placeName && (
          <span title={placeName} style={{ display: 'inline-flex', opacity: 0.65 }}><Icon name="pin" size={11} /></span>
        )}
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginTop: '0.55rem', paddingTop: '0.5rem', borderTop: '1px solid var(--faint)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            <select value={idea.category ?? ''} onChange={e => update(idea.id, { category: (e.target.value || null) as DateIdeaCategory | null })}
              style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}>
              <option value="">Anything else</option>
              {DATE_IDEA_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <select value={idea.price_range ?? ''} onChange={e => update(idea.id, { price_range: (e.target.value || null) as PriceRange | null })}
              style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}>
              <option value="">Price</option>
              {PRICE_RANGES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={idea.energy ?? ''} onChange={e => update(idea.id, { energy: (e.target.value || null) as Energy | null })}
              style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}>
              <option value="">Energy</option>
              {(['light', 'medium', 'deep'] as Energy[]).map(en => <option key={en} value={en}>{ENERGY_LABEL[en]}</option>)}
            </select>
            <select value={idea.indoor_outdoor ?? ''} onChange={e => update(idea.id, { indoor_outdoor: (e.target.value || null) as 'indoor' | 'outdoor' | 'either' | null })}
              style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}>
              <option value="">Indoor/outdoor</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="either">Either</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
            <select value={idea.place_id ?? ''} onChange={e => update(idea.id, { place_id: e.target.value || null })}
              style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer', maxWidth: '150px' }}>
              <option value="">No pin</option>
              {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {!idea.place_id && (
              <>
                <input value={addressDraft} onChange={e => setAddressDraft(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveAddress() } }}
                  placeholder="+ address" style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', width: '120px' }} />
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
            {idea.tags.map((tag, i) => (
              <span key={i} style={{
                fontSize: '0.58rem', color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)', borderRadius: 99, padding: '0.1em 0.5em',
                display: 'inline-flex', alignItems: 'center', gap: '0.3em',
              }}>
                {tag}
                <button onClick={() => update(idea.id, { tags: idea.tags.filter((_, ti) => ti !== i) })} aria-label={`Remove ${tag}`}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', opacity: 0.6, fontSize: '0.5rem', padding: 0 }}>✕</button>
              </span>
            ))}
            <input value={tagDraft} onChange={e => setTagDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (tagDraft.trim()) { update(idea.id, { tags: [...idea.tags, tagDraft.trim()] }); setTagDraft('') } } }}
              placeholder="+ tag" style={{ ...inputStyle, width: '64px', padding: '0.15em 0.4em', fontSize: '0.58rem' }} />
          </div>

          <input value={idea.area ?? ''} onChange={e => update(idea.id, { area: e.target.value || null })}
            placeholder="Area / special day (shows on the village map)"
            style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem' }} />

          <textarea value={idea.notes ?? ''} onChange={e => update(idea.id, { notes: e.target.value || null })} rows={2}
            placeholder="Notes" style={{ ...inputStyle, fontSize: '0.66rem', resize: 'vertical' }} />
        </div>
      )}
    </div>
  )
}

export default function HouseholdDateIdeas({ spaceId }: { spaceId: string | null }) {
  const { ideas, loading, addIdea, update, removeIdea } = useDateIdeas(spaceId)
  const { places, addPlace } = usePlaces()

  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<DateIdeaCategory | ''>('')
  const [energy, setEnergy] = useState<Energy | ''>('')
  const [price, setPrice] = useState<PriceRange | ''>('')
  const [address, setAddress] = useState('')
  const [existingPlaceId, setExistingPlaceId] = useState('')
  const [notes, setNotes] = useState('')
  const [filter, setFilter] = useState<'todo' | 'done' | 'all'>('todo')

  const visible = ideas.filter(i =>
    filter === 'all' ? true : filter === 'done' ? i.status === 'done' : i.status !== 'done')

  function groupFor(i: DateIdea): DateIdeaCategory | 'other' { return i.category ?? 'other' }

  function resetForm() {
    setTitle(''); setCategory(''); setEnergy(''); setPrice(''); setAddress(''); setExistingPlaceId(''); setNotes(''); setAdding(false)
  }
  async function save() {
    if (!title.trim()) return
    let placeId: string | null = existingPlaceId || null
    if (!placeId && address.trim()) {
      const { place, error } = await addPlace({ name: title.trim(), address: address.trim(), shared: !!spaceId, status: 'idea' }, spaceId)
      if (error) { console.error('Failed to create pin:', error); return }
      placeId = place?.id ?? null
    }
    await addIdea(title.trim(), {
      category: category || null,
      energy: energy || null,
      price_range: price || null,
      place_id: placeId,
      notes: notes.trim() || null,
    })
    resetForm()
  }

  const boxProps = { places, update, removeIdea, addPlace, spaceId }

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
    <details>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span className="t-card">Date Ideas</span>
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{ideas.length}</span>
      </summary>

      <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        {ideas.length === 0 && !loading && !adding && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
            Nothing yet. Add one, and tag it at home, cheap, or a splurge.
          </div>
        )}

        {ideas.length > 0 && (
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {(['todo', 'done', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className="press" style={{
                fontSize: '0.66rem', padding: '0.25rem 0.6rem', borderRadius: 99, cursor: 'pointer', textTransform: 'capitalize',
                border: `1px solid ${filter === f ? 'var(--gold)' : 'var(--border)'}`,
                background: filter === f ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
                color: filter === f ? 'var(--gold)' : 'var(--muted)',
              }}>{f === 'todo' ? 'To do' : f}</button>
            ))}
          </div>
        )}

        {GROUPS.map(g => {
          const items = visible.filter(i => groupFor(i) === g.key)
          if (items.length === 0) return null
          return (
            <div key={g.key}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.65, marginBottom: '0.4rem' }}>
                {g.label} <span style={{ opacity: 0.6 }}>· {items.length}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.55rem' }}>
                {items.map(i => <IdeaBox key={i.id} idea={i} {...boxProps} />)}
              </div>
            </div>
          )
        })}

        {visible.length === 0 && ideas.length > 0 && (
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
            {filter === 'done' ? 'Nothing done yet.' : 'Nothing on the list right now.'}
          </div>
        )}

        {adding ? (
          <form onSubmit={e => { e.preventDefault(); save() }}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border)', borderRadius: 10, padding: '0.7rem 0.8rem' }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Idea title" style={inputStyle} autoFocus />
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {DATE_IDEA_CATEGORIES.map(c => (
                <button key={c.key} type="button" onClick={() => setCategory(category === c.key ? '' : c.key)} className="press" style={{
                  fontSize: '0.64rem', padding: '0.25rem 0.55rem', borderRadius: 99, cursor: 'pointer',
                  border: `1px solid ${category === c.key ? 'var(--gold)' : 'var(--border)'}`,
                  background: category === c.key ? 'color-mix(in srgb, var(--gold) 14%, transparent)' : 'transparent',
                  color: category === c.key ? 'var(--gold)' : 'var(--muted)',
                }}>{c.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <select value={energy} onChange={e => setEnergy(e.target.value as Energy | '')} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Energy</option>
                {(['light', 'medium', 'deep'] as Energy[]).map(en => <option key={en} value={en}>{ENERGY_LABEL[en]}</option>)}
              </select>
              <select value={price} onChange={e => setPrice(e.target.value as PriceRange | '')} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Price</option>
                {PRICE_RANGES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <select value={existingPlaceId} onChange={e => { setExistingPlaceId(e.target.value); if (e.target.value) setAddress('') }} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">Link an existing pin…</option>
              {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {!existingPlaceId && (
              <input value={address} onChange={e => setAddress(e.target.value)} placeholder="…or an address to make a new pin" style={inputStyle} />
            )}
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={resetForm} className="press" style={{ fontSize: '0.68rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>Cancel</button>
              <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Save</button>
            </div>
          </form>
        ) : (
          <button onClick={() => setAdding(true)} className="btn btn-secondary press" style={{ fontSize: '0.7rem', alignSelf: 'flex-start' }}>+ New date idea</button>
        )}
      </div>
    </details>
    </section>
  )
}
