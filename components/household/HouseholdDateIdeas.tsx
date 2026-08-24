'use client'

import { useState } from 'react'
import { useDateIdeas, type DateIdea, type DateIdeaStatus, type PriceRange } from '@/lib/hooks/useDateIdeas'
import { usePlaces, type Place } from '@/lib/hooks/usePlaces'
import { usePlaceFilters, type PlaceFilter } from '@/lib/hooks/usePlaceFilters'
import { haversineKm } from '@/lib/utils/geo'
import type { Energy } from '@/lib/hooks/useWorkItems'

// Which existing pin should be the center of a new "group on map" filter,
// and how wide a radius needs to be to cover all of an area's other pins —
// picks the pin closest to the group's centroid as center (keeps the radius
// as small as possible) rather than always the first pin added.
function computeAreaFilter(pins: { id: string; lat: number; lng: number }[]): { centerId: string; radiusKm: number } | null {
  if (pins.length === 0) return null
  if (pins.length === 1) return { centerId: pins[0].id, radiusKm: 2 }
  const centroid = {
    lat: pins.reduce((s, p) => s + p.lat, 0) / pins.length,
    lng: pins.reduce((s, p) => s + p.lng, 0) / pins.length,
  }
  let center = pins[0]
  let best = Infinity
  for (const p of pins) {
    const d = haversineKm(p, centroid)
    if (d < best) { best = d; center = p }
  }
  let radius = 0
  for (const p of pins) {
    const d = haversineKm(center, p)
    if (d > radius) radius = d
  }
  return { centerId: center.id, radiusKm: Math.max(0.5, Math.round((radius + 0.5) * 10) / 10) }
}

const inputStyle: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '0.4rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.72rem', outline: 'none',
}

const STATUS_LABEL: Record<DateIdeaStatus, string> = { idea: 'Idea', planned: 'Planned', done: 'Done' }
const STATUS_ORDER: DateIdeaStatus[] = ['planned', 'idea', 'done']
const ENERGY_LABEL: Record<Energy, string> = { light: '🌤️ Light', medium: '⛅ Medium', deep: '🌧️ Deep' }
const PRICE_RANGES: PriceRange[] = ['$', '$$', '$$$', '$$$$']
const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.65, marginBottom: '0.35rem',
}

type IdeaCardProps = {
  idea: DateIdea
  places: ReturnType<typeof usePlaces>['places']
  update: ReturnType<typeof useDateIdeas>['update']
  removeIdea: ReturnType<typeof useDateIdeas>['removeIdea']
  addTagDraft: Record<string, string>
  setAddTagDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>
  spaceId: string | null
  addPlace: ReturnType<typeof usePlaces>['addPlace']
  showStatus?: boolean
}

// One idea, one line — a bucket-list row (title, tiny meta, status), same
// density as Watchlist's rows, with everything else (energy/price/indoor-
// outdoor/pin/tags/notes) tucked behind a click-to-expand (2026-08-24,
// compact pass). This is reference material for later planning, not a daily
// working tool, so it should read like a list you skim, not a form you fill
// out. Shared by the Ideas & Planned list, the By Area groups, and Done.
function IdeaCard({ idea, places, update, removeIdea, addTagDraft, setAddTagDraft, spaceId, addPlace, showStatus = true }: IdeaCardProps) {
  const placeName = (id: string | null) => (id ? places.find(p => p.id === id)?.name ?? null : null)
  const [expanded, setExpanded] = useState(false)

  // Retrofitting an address onto an idea that already exists (2026-08-24) —
  // the "type an address to create a pin" flow previously only ran at
  // creation time; most ideas here were bulk-added with no address at all.
  const [addressDraft, setAddressDraft] = useState('')
  const [addingAddress, setAddingAddress] = useState(false)

  async function addTag() {
    const val = (addTagDraft[idea.id] ?? '').trim()
    if (!val) return
    await update(idea.id, { tags: [...idea.tags, val] })
    setAddTagDraft(d => ({ ...d, [idea.id]: '' }))
  }

  async function saveAddress() {
    const val = addressDraft.trim()
    if (!val) return
    const { place, error } = await addPlace({ name: idea.title, address: val, shared: !!spaceId, status: 'idea' }, spaceId)
    if (error) { console.error('Failed to create pin:', error); return }
    if (place) await update(idea.id, { place_id: place.id })
    setAddressDraft('')
    setAddingAddress(false)
  }

  const meta: string[] = []
  if (idea.price_range) meta.push(idea.price_range)
  if (idea.energy) meta.push(ENERGY_LABEL[idea.energy])
  if (idea.indoor_outdoor) meta.push(idea.indoor_outdoor === 'indoor' ? '🏠' : idea.indoor_outdoor === 'outdoor' ? '🌳' : 'in/out')

  return (
    <div style={{ borderBottom: '1px solid var(--faint)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0' }}>
        <button onClick={() => setExpanded(v => !v)} aria-label={expanded ? 'Collapse' : 'Expand'} className="press"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.6, fontSize: '0.58rem', width: '0.9rem', flexShrink: 0 }}>
          {expanded ? '▾' : '▸'}
        </button>
        <span style={{ flex: 1, minWidth: 0, fontSize: '0.76rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {idea.title}
        </span>
        {meta.length > 0 && (
          <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.65, whiteSpace: 'nowrap', flexShrink: 0 }}>{meta.join(' · ')}</span>
        )}
        {placeName(idea.place_id) && (
          <span style={{ fontSize: '0.6rem', flexShrink: 0 }} title={placeName(idea.place_id) ?? undefined}>📍</span>
        )}
        {showStatus && (
          <select value={idea.status} onChange={e => update(idea.id, { status: e.target.value as DateIdeaStatus })}
            style={{ ...inputStyle, fontSize: '0.6rem', padding: '0.15rem 0.3rem', cursor: 'pointer', flexShrink: 0 }}>
            {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        )}
        <button onClick={() => removeIdea(idea.id)} aria-label={`Remove ${idea.title}`} className="press"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.58rem', flexShrink: 0 }}>✕</button>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.1rem 0 0.6rem 1.35rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
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
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <select value={idea.place_id ?? ''} onChange={e => update(idea.id, { place_id: e.target.value || null })}
              style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', cursor: 'pointer', maxWidth: '160px' }}>
              <option value="">No pin</option>
              {places.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {!idea.place_id && (
              addingAddress ? (
                <>
                  <input
                    value={addressDraft}
                    onChange={e => setAddressDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveAddress() } }}
                    placeholder="Address"
                    style={{ ...inputStyle, fontSize: '0.62rem', padding: '0.2rem 0.4rem', width: '130px' }}
                    autoFocus
                  />
                  <button onClick={saveAddress} className="btn btn-ghost press" style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem' }}>Save</button>
                </>
              ) : (
                <button onClick={() => setAddingAddress(true)} className="press"
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
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="+ tag"
              style={{ ...inputStyle, width: '70px', padding: '0.15em 0.4em', fontSize: '0.6rem' }}
            />
          </div>

          {idea.notes && (
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', lineHeight: 1.4 }}>{idea.notes}</div>
          )}
        </div>
      )}
    </div>
  )
}

type GroupProps = Omit<IdeaCardProps, 'idea'> & { ideas: DateIdea[] }

// A flat, un-nested list of cards — used for the Ideas/Planned working view,
// where area grouping just gets in the way of "what could we do tonight."
function CardList({ ideas, ...rest }: GroupProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {ideas.map(idea => <IdeaCard key={idea.id} idea={idea} {...rest} />)}
    </div>
  )
}

// Grouped by area — "Monterey Day", "SLO", "Santa Cruz", whatever trip or
// occasion an idea belongs to — collapsible per area, same pattern
// Watchlist uses for games/shows. This is the browse-a-destination view,
// separate from the day-to-day Ideas/Planned working list.
//
// "Group on map" (2026-08-24) — an area is a real place cluster, and Places
// now supports saved radius filters (see usePlaceFilters). Rather than
// asking you to pick a center pin and guess a radius by hand, this computes
// one automatically from whichever of the area's ideas already have a pin,
// then saves it under the same area name so it shows up as a filter chip in
// Places — "later show together on the map" without a second data entry.
function AreaGroup({ area, ideas, savedPlaceFilters, onGroupOnMap, ...rest }: GroupProps & {
  area: string
  savedPlaceFilters: PlaceFilter[]
  onGroupOnMap: (area: string, pins: Place[]) => void
}) {
  const pins = ideas
    .map(i => (i.place_id ? rest.places.find(p => p.id === i.place_id) : null))
    .filter((p): p is Place => !!p && p.lat != null && p.lng != null)
  const alreadyGrouped = savedPlaceFilters.some(f => f.label === area)

  return (
    <details style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{area}</span>
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{ideas.length}</span>
      </summary>
      <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {pins.length > 0 && (
          alreadyGrouped ? (
            <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.65 }}>✓ Grouped on the Places map</span>
          ) : (
            <button onClick={() => onGroupOnMap(area, pins)} className="press"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', opacity: 0.75, fontSize: '0.62rem', alignSelf: 'flex-start' }}>
              📍 Group on map ({pins.length} pin{pins.length === 1 ? '' : 's'})
            </button>
          )
        )}
        <CardList ideas={ideas} {...rest} />
      </div>
    </details>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="press" style={{
      fontSize: '0.68rem', padding: '0.3rem 0.65rem', borderRadius: '99px', cursor: 'pointer',
      border: active ? '1px solid var(--gold)' : '1px solid var(--border)',
      background: active ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
      color: active ? 'var(--gold)' : 'var(--muted)',
    }}>{children}</button>
  )
}

export default function HouseholdDateIdeas({ spaceId }: { spaceId: string | null }) {
  const { ideas, loading, addIdea, update, removeIdea } = useDateIdeas(spaceId)
  const { places, addPlace } = usePlaces()
  const { filters: savedPlaceFilters, addFilter: addPlaceFilter } = usePlaceFilters(spaceId)
  const [addTagDraft, setAddTagDraft] = useState<Record<string, string>>({})

  function groupOnMap(area: string, pins: Place[]) {
    const calc = computeAreaFilter(pins.map(p => ({ id: p.id, lat: p.lat as number, lng: p.lng as number })))
    if (calc) addPlaceFilter(area, calc.centerId, calc.radiusKm)
  }

  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [area, setArea] = useState('')
  const [energy, setEnergy] = useState<Energy | ''>('')
  const [price, setPrice] = useState<PriceRange | ''>('')
  const [address, setAddress] = useState('')
  const [existingPlaceId, setExistingPlaceId] = useState('')
  const [notes, setNotes] = useState('')
  const [tab, setTab] = useState<'active' | 'area' | 'done'>('active')

  // Three views instead of one area-grouped list nested by status
  // (2026-08-24, easier-to-use pass): "Ideas & Planned" is the day-to-day
  // working list (flat — area grouping just added a click to get to the
  // thing you're deciding between tonight), "By Area" is the browse-a-
  // destination view (SLO, Santa Cruz, whatever trip an idea belongs to),
  // and "Done" is the history.
  const notDone = ideas.filter(i => i.status !== 'done')
  const planned = notDone.filter(i => i.status === 'planned')
  const notPlanned = notDone.filter(i => i.status === 'idea')
  const doneIdeas = ideas.filter(i => i.status === 'done')
  const areaNames = [...new Set(ideas.filter(i => i.area).map(i => i.area as string))].sort((a, b) => a.localeCompare(b))
  const existingAreas = areaNames
  const cardProps = { places, update, removeIdea, addTagDraft, setAddTagDraft, spaceId, addPlace }

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

  // Collapsed by default (2026-08-24, compact pass) — this is a bucket list
  // for later planning, not something that needs to be open every time you
  // scroll through Household → Reference. One click gets you the full list.
  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
    <details>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <span className="t-card">Date Ideas</span>
        <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{ideas.length}</span>
      </summary>

      <div style={{ marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

      {ideas.length === 0 && !loading && !adding && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
          Nothing yet. Add an idea — group it under an area or special day, pair it with a pin, energy level, or price range.
        </div>
      )}

      {ideas.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <TabButton active={tab === 'active'} onClick={() => setTab('active')}>Ideas &amp; Planned ({notDone.length})</TabButton>
          <TabButton active={tab === 'area'} onClick={() => setTab('area')}>By Area ({areaNames.length})</TabButton>
          <TabButton active={tab === 'done'} onClick={() => setTab('done')}>Done ({doneIdeas.length})</TabButton>
        </div>
      )}

      {tab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {notDone.length === 0 && ideas.length > 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>Nothing planned or on the list right now.</div>
          )}
          {planned.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>Planned</div>
              <CardList ideas={planned} {...cardProps} />
            </div>
          )}
          {notPlanned.length > 0 && (
            <div>
              {planned.length > 0 && <div style={sectionLabelStyle}>Ideas</div>}
              <CardList ideas={notPlanned} {...cardProps} />
            </div>
          )}
        </div>
      )}

      {tab === 'area' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {areaNames.length === 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
              No areas yet — give an idea an area below, like &quot;SLO&quot; or &quot;Santa Cruz&quot;, to browse it here.
            </div>
          )}
          {areaNames.map(a => (
            <AreaGroup key={a} area={a} ideas={ideas.filter(i => i.area === a)} savedPlaceFilters={savedPlaceFilters} onGroupOnMap={groupOnMap} {...cardProps} />
          ))}
        </div>
      )}

      {tab === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {doneIdeas.length === 0 && (
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>Nothing done yet.</div>
          )}
          <CardList ideas={doneIdeas} {...cardProps} />
        </div>
      )}

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

      </div>
    </details>
    </section>
  )
}
