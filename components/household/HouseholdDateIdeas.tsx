'use client'

import { useState } from 'react'
import { useDateIdeas, type DateIdea, type DateIdeaStatus, type PriceRange } from '@/lib/hooks/useDateIdeas'
import { usePlaces } from '@/lib/hooks/usePlaces'
import type { Energy } from '@/lib/hooks/useWorkItems'

const inputStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '0.4rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', outline: 'none',
}

const STATUS_LABEL: Record<DateIdeaStatus, string> = { idea: 'Idea', planned: 'Planned', done: 'Done' }
const STATUS_ORDER: DateIdeaStatus[] = ['planned', 'idea', 'done']
const ENERGY_LABEL: Record<Energy, string> = { light: '🌤️ Light', medium: '⛅ Medium', deep: '🌧️ Deep' }
const PRICE_RANGES: PriceRange[] = ['$', '$$', '$$$', '$$$$']
const NO_AREA = 'Unsorted'

// Split out of the generic Lists checklist (2026-08-22), then grouped by
// area the same way Watchlist groups games/shows (2026-08-22, round 2) —
// "Special Days", "Monterey Day", whatever grouping makes sense, collapsible
// per area. An idea can also carry an address, which creates a real Places
// pin (status 'idea' — "want to go", same as adding one from Places
// directly) rather than storing a redundant address field here; once
// linked, that pin is what "where" actually means for the idea.
function AreaGroup({ area, ideas, places, update, removeIdea, addTagDraft, setAddTagDraft, spaceId, addPlace }: {
  area: string
  ideas: DateIdea[]
  places: ReturnType<typeof usePlaces>['places']
  update: ReturnType<typeof useDateIdeas>['update']
  removeIdea: ReturnType<typeof useDateIdeas>['removeIdea']
  addTagDraft: Record<string, string>
  setAddTagDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>
  spaceId: string | null
  addPlace: ReturnType<typeof usePlaces>['addPlace']
}) {
  const placeName = (id: string | null) => (id ? places.find(p => p.id === id)?.name ?? null : null)
  const grouped = STATUS_ORDER.map(s => ({ status: s, ideas: ideas.filter(i => i.status === s) })).filter(g => g.ideas.length > 0)

  // Retrofitting an address onto an idea that already exists (2026-08-24) —
  // the "type an address to create a pin" flow previously only ran at
  // creation time; most ideas here were bulk-added with no address at all.
  const [addressDraft, setAddressDraft] = useState<Record<string, string>>({})
  const [addingAddress, setAddingAddress] = useState<Record<string, boolean>>({})

  async function addTag(idea: DateIdea) {
    const val = (addTagDraft[idea.id] ?? '').trim()
    if (!val) return
    await update(idea.id, { tags: [...idea.tags, val] })
    setAddTagDraft(d => ({ ...d, [idea.id]: '' }))
  }

  async function saveAddress(idea: DateIdea) {
    const val = (addressDraft[idea.id] ?? '').trim()
    if (!val) return
    const { place, error } = await addPlace({ name: idea.title, address: val, shared: !!spaceId, status: 'idea' }, spaceId)
    if (error) { console.error('Failed to create pin:', error); return }
    if (place) await update(idea.id, { place_id: place.id })
    setAddressDraft(d => ({ ...d, [idea.id]: '' }))
    setAddingAddress(d => ({ ...d, [idea.id]: false }))
  }

  return (
    <details style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{area}</span>
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{ideas.length}</span>
      </summary>

      <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
        {grouped.map(g => (
          <div key={g.status}>
            <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.65, marginBottom: '0.35rem' }}>
              {STATUS_LABEL[g.status]}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {g.ideas.map(idea => (
                <div key={idea.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--text)' }}>{idea.title}</span>
                    <button onClick={() => removeIdea(idea.id)} aria-label={`Remove ${idea.title}`} className="press"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem' }}>✕</button>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                    <select value={idea.status} onChange={e => update(idea.id, { status: e.target.value as DateIdeaStatus })}
                      style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}>
                      {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>

                    <select value={idea.energy ?? ''} onChange={e => update(idea.id, { energy: (e.target.value || null) as Energy | null })}
                      style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}>
                      <option value="">No energy set</option>
                      {(['light', 'medium', 'deep'] as Energy[]).map(e => <option key={e} value={e}>{ENERGY_LABEL[e]}</option>)}
                    </select>

                    <select value={idea.price_range ?? ''} onChange={e => update(idea.id, { price_range: (e.target.value || null) as PriceRange | null })}
                      style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}>
                      <option value="">No price set</option>
                      {PRICE_RANGES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <select value={idea.indoor_outdoor ?? ''} onChange={e => update(idea.id, { indoor_outdoor: (e.target.value || null) as 'indoor' | 'outdoor' | 'either' | null })}
                      style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer' }}>
                      <option value="">Indoor/outdoor</option>
                      <option value="indoor">🏠 Indoor</option>
                      <option value="outdoor">🌳 Outdoor</option>
                      <option value="either">Either</option>
                    </select>

                    <select value={idea.place_id ?? ''} onChange={e => update(idea.id, { place_id: e.target.value || null })}
                      style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer', maxWidth: '160px' }}>
                      <option value="">No pin</option>
                      {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    {/* Type an address for an idea that has no pin yet
                        (2026-08-24) — most ideas here were bulk-added with
                        no location at all; this is the retrofit path,
                        same "creates a real want-to-go pin" mechanism the
                        add-new-idea form already uses. */}
                    {!idea.place_id && (
                      addingAddress[idea.id] ? (
                        <>
                          <input
                            value={addressDraft[idea.id] ?? ''}
                            onChange={e => setAddressDraft(d => ({ ...d, [idea.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveAddress(idea) } }}
                            placeholder="Address"
                            style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', width: '130px' }}
                            autoFocus
                          />
                          <button onClick={() => saveAddress(idea)} className="btn btn-ghost press" style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem' }}>Save</button>
                        </>
                      ) : (
                        <button onClick={() => setAddingAddress(d => ({ ...d, [idea.id]: true }))} className="press"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', opacity: 0.7, fontSize: '0.62rem' }}>
                          + address
                        </button>
                      )
                    )}
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                    {idea.tags.map((tag, i) => (
                      <span key={i} style={{
                        fontSize: '0.6rem', color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--gold) 25%, transparent)', borderRadius: '99px', padding: '0.1em 0.5em',
                        display: 'inline-flex', alignItems: 'center', gap: '0.3em',
                      }}>
                        {tag}
                        <button onClick={() => update(idea.id, { tags: idea.tags.filter((_, ti) => ti !== i) })} aria-label={`Remove tag ${tag}`}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', opacity: 0.6, fontSize: '0.55rem', padding: 0, lineHeight: 1 }}>✕</button>
                      </span>
                    ))}
                    <input
                      value={addTagDraft[idea.id] ?? ''}
                      onChange={e => setAddTagDraft(d => ({ ...d, [idea.id]: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(idea) } }}
                      placeholder="+ tag"
                      style={{ ...inputStyle, width: '70px', padding: '0.15em 0.4em', fontSize: '0.6rem' }}
                    />
                  </div>

                  {placeName(idea.place_id) && (
                    <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.75 }}>📍 {placeName(idea.place_id)}</div>
                  )}
                  {idea.notes && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.4 }}>{idea.notes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </details>
  )
}

export default function HouseholdDateIdeas({ spaceId }: { spaceId: string | null }) {
  const { ideas, loading, addIdea, update, removeIdea } = useDateIdeas(spaceId)
  const { places, addPlace } = usePlaces()
  const [addTagDraft, setAddTagDraft] = useState<Record<string, string>>({})

  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [area, setArea] = useState('')
  const [energy, setEnergy] = useState<Energy | ''>('')
  const [price, setPrice] = useState<PriceRange | ''>('')
  const [address, setAddress] = useState('')
  const [existingPlaceId, setExistingPlaceId] = useState('')
  const [notes, setNotes] = useState('')

  const areaNames = [...new Set(ideas.map(i => i.area || NO_AREA))].sort((a, b) => (a === NO_AREA ? 1 : b === NO_AREA ? -1 : a.localeCompare(b)))
  const existingAreas = [...new Set(ideas.map(i => i.area).filter((a): a is string => !!a))]

  function resetForm() {
    setTitle(''); setArea(''); setEnergy(''); setPrice(''); setAddress(''); setExistingPlaceId(''); setNotes(''); setAdding(false)
  }

  async function save() {
    if (!title.trim()) return
    let placeId: string | null = existingPlaceId || null
    if (!placeId && address.trim()) {
      // A typed address with no existing pin selected creates a real Places
      // pin — status 'idea' ("want to go"), same default a pin added from
      // Places itself gets — rather than storing the address redundantly here.
      const { place, error } = await addPlace({ name: title.trim(), address: address.trim(), shared: !!spaceId, status: 'idea' }, spaceId)
      if (error) { console.error('Failed to create pin:', error); return }
      placeId = place?.id ?? null
    }
    await addIdea(title.trim(), {
      area: area.trim() || null,
      energy: energy || null,
      price_range: price || null,
      place_id: placeId,
      notes: notes.trim() || null,
    })
    resetForm()
  }

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div className="t-card">Date Ideas</div>

      {ideas.length === 0 && !loading && !adding && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Nothing yet. Add an idea — group it under an area or special day, pair it with a pin, energy level, or price range.
        </div>
      )}

      {areaNames.map(a => (
        <AreaGroup
          key={a}
          area={a}
          ideas={ideas.filter(i => (i.area || NO_AREA) === a)}
          places={places}
          update={update}
          removeIdea={removeIdea}
          addTagDraft={addTagDraft}
          setAddTagDraft={setAddTagDraft}
          spaceId={spaceId}
          addPlace={addPlace}
        />
      ))}

      {adding ? (
        <form
          onSubmit={e => { e.preventDefault(); save() }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}
        >
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Idea title" style={inputStyle} autoFocus />

          <input value={area} onChange={e => setArea(e.target.value)} placeholder="Area / special day (e.g. Monterey Day, Anniversary)" style={inputStyle} list="date-idea-areas" />
          <datalist id="date-idea-areas">
            {existingAreas.map(a => <option key={a} value={a} />)}
          </datalist>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <select value={energy} onChange={e => setEnergy(e.target.value as Energy | '')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">No energy set</option>
              {(['light', 'medium', 'deep'] as Energy[]).map(en => <option key={en} value={en}>{ENERGY_LABEL[en]}</option>)}
            </select>
            <select value={price} onChange={e => setPrice(e.target.value as PriceRange | '')} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="">No price set</option>
              {PRICE_RANGES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <select value={existingPlaceId} onChange={e => { setExistingPlaceId(e.target.value); if (e.target.value) setAddress('') }} style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="">Link an existing pin…</option>
            {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {!existingPlaceId && (
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="…or type an address to create a new pin (want to go)" style={inputStyle} />
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
    </section>
  )
}
