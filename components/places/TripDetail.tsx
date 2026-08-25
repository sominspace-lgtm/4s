'use client'

import { useMemo, useState } from 'react'
import PlacesSheet from '@/components/places/PlacesSheet'
import { useTrips, type Trip, type TripStatus } from '@/lib/hooks/useTrips'
import { useTripBundle, type ItineraryKind, type BudgetCategory } from '@/lib/hooks/useTripBundle'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { useDateIdeas } from '@/lib/hooks/useDateIdeas'

const STATUS_OPTIONS: TripStatus[] = ['dreaming', 'planning', 'booked', 'travelling', 'done', 'cancelled']
const KIND_OPTIONS: ItineraryKind[] = ['activity', 'travel', 'stay', 'food', 'note']
const KIND_ICON: Record<ItineraryKind, string> = { activity: '◆', travel: '✈', stay: '🛏', food: '🍽', note: '✎' }
const CATEGORY_OPTIONS: BudgetCategory[] = ['flights', 'stay', 'food', 'transport', 'activities', 'other']

const input: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.76rem',
  padding: '0.45rem 0.65rem', outline: 'none',
}

// An itinerary item, click-to-schedule (2026-08-25 fix) — before this, an
// item could only ever be marked done or removed after creation; there was
// no way to give an "Unscheduled" item (e.g. a whole day's worth of ideas
// moved in from Date Ideas) an actual date without deleting and re-adding
// it. That's the real blocker to "easy to plan" here — most items arrive
// unscheduled and planning IS assigning them to days.
function ItineraryItemRow({ item, onUpdate, onRemove }: {
  item: import('@/lib/hooks/useTripBundle').ItineraryItem
  onUpdate: (id: string, fields: Partial<Pick<import('@/lib/hooks/useTripBundle').ItineraryItem, 'title' | 'item_date' | 'time_label' | 'kind' | 'notes' | 'done'>>) => void
  onRemove: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(item.item_date ?? '')
  const [time, setTime] = useState(item.time_label ?? '')
  const [kind, setKind] = useState<ItineraryKind>(item.kind)

  function save() {
    onUpdate(item.id, { item_date: date || null, time_label: time.trim() || null, kind })
    setEditing(false)
  }

  return (
    <div style={{ padding: '0.3rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button onClick={() => onUpdate(item.id, { done: !item.done })} className="press" style={{
          width: 14, height: 14, borderRadius: '4px', border: '1px solid var(--border)', flexShrink: 0,
          background: item.done ? 'var(--gold)' : 'transparent', cursor: 'pointer', padding: 0,
        }} />
        <span aria-hidden style={{ fontSize: '0.7rem', opacity: 0.6, flexShrink: 0 }}>{KIND_ICON[item.kind]}</span>
        <button onClick={() => setEditing(v => !v)} className="press" style={{
          flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '0.76rem', color: 'var(--text)', opacity: item.done ? 0.5 : 1, textDecoration: item.done ? 'line-through' : 'none',
        }}>
          {item.title}{item.time_label && <span style={{ color: 'var(--muted)' }}> · {item.time_label}</span>}
          <span style={{ color: 'var(--gold)', opacity: 0.6, fontSize: '0.62rem', marginLeft: '0.4rem' }}>{editing ? '▾' : (item.item_date ? 'edit' : '▸ set date')}</span>
        </button>
        <button onClick={() => onRemove(item.id)} aria-label={`Remove ${item.title}`} className="press"
          style={{ background: 'none', border: 'none', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', cursor: 'pointer', flexShrink: 0 }}>✕</button>
      </div>

      {editing && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.35rem', marginLeft: '1.6rem' }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...input, fontSize: '0.68rem', padding: '0.3rem 0.5rem' }} />
          <input value={time} onChange={e => setTime(e.target.value)} placeholder="Time (optional)" style={{ ...input, fontSize: '0.68rem', padding: '0.3rem 0.5rem', width: '100px' }} />
          <select value={kind} onChange={e => setKind(e.target.value as ItineraryKind)} style={{ ...input, fontSize: '0.68rem', padding: '0.3rem 0.5rem', cursor: 'pointer' }}>
            {KIND_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <button onClick={save} className="btn btn-ghost press" style={{ fontSize: '0.64rem', padding: '0.25rem 0.5rem' }}>Save</button>
          {date && (
            <button onClick={() => { setDate(''); onUpdate(item.id, { item_date: null }) }} className="press"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.62rem' }}>
              Clear date
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// A trip, opened up: status + dates at the top (the "what stage is this at"
// question), then three sections that answer the three actual questions a
// trip raises — when are we doing what (itinerary), what will it cost
// (budget), and what have we shortlisted but not scheduled (from the pins
// already saved in Places).
export default function TripDetail({ trip, open, onClose }: {
  trip: Trip | null
  open: boolean
  onClose: () => void
}) {
  const { updateTrip, removeTrip } = useTrips()
  const bundle = useTripBundle(trip?.id ?? null)
  const { places } = usePlaces()
  // Located date ideas, surfaced as one-click shortlist adds (2026-08-25) —
  // a date idea with a pin already IS a place, so "move it into trips"
  // means making it easy to shortlist here, not a second copy of the data.
  // Scoped to the trip's own space so a personal trip doesn't see a
  // partner's shared ideas or vice versa.
  const { ideas: dateIdeas } = useDateIdeas(trip?.space_id ?? null)

  const [addingItem, setAddingItem] = useState(false)
  const [itemTitle, setItemTitle] = useState('')
  const [itemDate, setItemDate] = useState('')
  const [itemTime, setItemTime] = useState('')
  const [itemKind, setItemKind] = useState<ItineraryKind>('activity')

  const [addingBudget, setAddingBudget] = useState(false)
  const [budgetLabel, setBudgetLabel] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [budgetCategory, setBudgetCategory] = useState<BudgetCategory>('other')

  const [addingShortlist, setAddingShortlist] = useState(false)

  const byDay = useMemo(() => {
    const groups = new Map<string, typeof bundle.itinerary>()
    for (const item of bundle.itinerary) {
      const key = item.item_date ?? 'Unscheduled'
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(item)
    }
    return [...groups.entries()].sort(([a], [b]) => (a === 'Unscheduled' ? 1 : b === 'Unscheduled' ? -1 : a.localeCompare(b)))
  }, [bundle.itinerary])

  const shortlistedIds = new Set(bundle.shortlist.map(s => s.place_id))
  const availableForShortlist = places.filter(p => !shortlistedIds.has(p.id))
  const locatedDateIdeas = dateIdeas.filter(i => i.place_id && !shortlistedIds.has(i.place_id))

  if (!trip) return <PlacesSheet open={open} onClose={onClose} title="Trip">{null}</PlacesSheet>
  // Captured as a const so closures below narrow to non-null — `trip` the
  // prop can't be re-narrowed inside a nested function declaration.
  const currentTrip = trip

  async function submitItem(e: React.FormEvent) {
    e.preventDefault()
    if (!itemTitle.trim()) return
    await bundle.addItineraryItem({ title: itemTitle.trim(), item_date: itemDate || null, time_label: itemTime.trim() || null, kind: itemKind })
    setItemTitle(''); setItemDate(''); setItemTime(''); setItemKind('activity'); setAddingItem(false)
  }

  async function submitBudget(e: React.FormEvent) {
    e.preventDefault()
    const amount = Number(budgetAmount)
    if (!budgetLabel.trim() || !Number.isFinite(amount) || amount <= 0) return
    await bundle.addBudgetItem({ label: budgetLabel.trim(), amount, category: budgetCategory, currency: currentTrip.currency })
    setBudgetLabel(''); setBudgetAmount(''); setBudgetCategory('other'); setAddingBudget(false)
  }

  return (
    <PlacesSheet open={open} onClose={onClose} title={trip.title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        {/* Status + dates + destination — the "where is this trip at" strip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <select value={trip.status} onChange={e => updateTrip(trip.id, { status: e.target.value as TripStatus })} style={{ ...input, width: 'fit-content' }}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
            {trip.destination ?? 'No destination set'}
            {trip.start_date && ` · ${trip.start_date}${trip.end_date ? ` – ${trip.end_date}` : ''}`}
          </div>
        </div>

        {/* Itinerary */}
        <section>
          <div className="t-card" style={{ marginBottom: '0.5rem' }}>Itinerary</div>
          {bundle.itinerary.length === 0 && !bundle.loading && (
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.5rem' }}>
              Nothing scheduled yet.
            </div>
          )}
          {byDay.map(([day, items]) => (
            <div key={day} style={{ marginBottom: '0.7rem' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{day}</div>
              {items.map(item => (
                <ItineraryItemRow key={item.id} item={item} onUpdate={bundle.updateItineraryItem} onRemove={bundle.removeItineraryItem} />
              ))}
            </div>
          ))}

          {addingItem ? (
            <form onSubmit={submitItem} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
              <input value={itemTitle} onChange={e => setItemTitle(e.target.value)} placeholder="What's happening" style={input} autoFocus />
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <input type="date" value={itemDate} onChange={e => setItemDate(e.target.value)} style={input} />
                <input value={itemTime} onChange={e => setItemTime(e.target.value)} placeholder="Time (optional)" style={{ ...input, width: '110px' }} />
                <select value={itemKind} onChange={e => setItemKind(e.target.value as ItineraryKind)} style={input}>
                  {KIND_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
                <button type="button" onClick={() => setAddingItem(false)} className="press" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.68rem', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAddingItem(true)} className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>+ Add to itinerary</button>
          )}
        </section>

        {/* Budget */}
        <section>
          <div className="t-card" style={{ marginBottom: '0.3rem' }}>Budget</div>
          <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.75, marginBottom: '0.5rem' }}>
            {trip.currency} {bundle.spentTotal.toFixed(2)} paid of {bundle.plannedTotal.toFixed(2)} planned
            {trip.budget_total != null && ` · target ${trip.budget_total}`}
          </div>
          {bundle.budget.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid var(--faint)' }}>
              <button onClick={() => bundle.updateBudgetItem(b.id, { paid: !b.paid })} disabled={b.source === 'ai-estimate'} className="press" style={{
                width: 14, height: 14, borderRadius: '4px', border: '1px solid var(--border)', flexShrink: 0,
                background: b.paid ? 'var(--emerald)' : 'transparent', cursor: b.source === 'ai-estimate' ? 'default' : 'pointer', padding: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.76rem', color: 'var(--text)', opacity: b.source === 'ai-estimate' ? 0.6 : 1 }}>
                  {b.source === 'ai-estimate' && 'est. '}{b.label}
                </span>
                <span style={{ fontSize: '0.6rem', color: 'var(--muted)', marginLeft: '0.4rem' }}>{b.category}</span>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--text)', flexShrink: 0 }}>{b.currency} {Number(b.amount).toFixed(2)}</span>
              {b.source === 'user' && (
                <button onClick={() => bundle.removeBudgetItem(b.id)} aria-label={`Remove ${b.label}`} className="press"
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', cursor: 'pointer', flexShrink: 0 }}>✕</button>
              )}
            </div>
          ))}

          {addingBudget ? (
            <form onSubmit={submitBudget} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <input value={budgetLabel} onChange={e => setBudgetLabel(e.target.value)} placeholder="What for" style={{ ...input, flex: 1, minWidth: '120px' }} autoFocus />
              <input type="number" min="0" step="0.01" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} placeholder="Amount" style={{ ...input, width: '90px' }} />
              <select value={budgetCategory} onChange={e => setBudgetCategory(e.target.value as BudgetCategory)} style={input}>
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
              <button type="button" onClick={() => setAddingBudget(false)} className="press" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.68rem', cursor: 'pointer' }}>Cancel</button>
            </form>
          ) : (
            <button onClick={() => setAddingBudget(true)} className="btn btn-secondary press" style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>+ Add cost</button>
          )}
        </section>

        {/* Shortlist — places already saved that might belong on this trip */}
        <section>
          <div className="t-card" style={{ marginBottom: '0.5rem' }}>Shortlist</div>
          {bundle.shortlist.length === 0 && !addingShortlist && (
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.5rem' }}>
              Nothing shortlisted. Pull in a saved place below.
            </div>
          )}
          {bundle.shortlist.map(s => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid var(--faint)' }}>
              <span style={{ flex: 1, fontSize: '0.76rem', color: 'var(--text)' }}>{s.place?.name ?? 'Unknown place'}</span>
              <button onClick={() => bundle.removeFromShortlist(s.place_id)} aria-label="Remove from shortlist" className="press"
                style={{ background: 'none', border: 'none', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', cursor: 'pointer' }}>✕</button>
            </div>
          ))}

          {/* From your date ideas — any idea that already has a pin is one
              click from being on this trip too. Purely additive: adding one
              here doesn't touch or remove it from Date Ideas. */}
          {locatedDateIdeas.length > 0 && (
            <div style={{ marginTop: bundle.shortlist.length > 0 ? '0.6rem' : 0 }}>
              <div style={{ fontSize: '0.6rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.3rem' }}>
                From your date ideas
              </div>
              {locatedDateIdeas.map(idea => (
                <button key={idea.id} onClick={() => bundle.addToShortlist(idea.place_id!)} className="press" style={{
                  display: 'block', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.74rem', color: 'var(--gold)', padding: '0.25rem 0', width: '100%',
                }}>
                  + {idea.title}{idea.area && <span style={{ color: 'var(--muted)' }}> · {idea.area}</span>}
                </button>
              ))}
            </div>
          )}

          {addingShortlist ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.5rem', maxHeight: '160px', overflowY: 'auto' }}>
              {availableForShortlist.length === 0 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', opacity: 0.7 }}>No more saved places to add.</div>
              )}
              {availableForShortlist.map(p => (
                <button key={p.id} onClick={() => bundle.addToShortlist(p.id)} className="press" style={{
                  textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.74rem', color: 'var(--text)', padding: '0.25rem 0',
                }}>+ {p.name}</button>
              ))}
              <button onClick={() => setAddingShortlist(false)} className="press" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.68rem', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '0.3rem' }}>Done</button>
            </div>
          ) : (
            <button onClick={() => setAddingShortlist(true)} className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>+ Add a saved place</button>
          )}
        </section>

        <button
          onClick={() => { removeTrip(trip.id); onClose() }}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', opacity: 0.5, fontSize: '0.66rem', cursor: 'pointer', alignSelf: 'flex-start' }}
        >
          Delete trip
        </button>
      </div>
    </PlacesSheet>
  )
}
