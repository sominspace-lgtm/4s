'use client'

import { useState } from 'react'
import PlacesSheet from '@/components/places/PlacesSheet'
import { useTrips, type Trip, type TripStatus } from '@/lib/hooks/useTrips'
import { useTripBundle, type ItineraryKind, type BudgetCategory } from '@/lib/hooks/useTripBundle'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { useDateIdeas } from '@/lib/hooks/useDateIdeas'
import IconButton from '@/components/ui/IconButton'
import LinksSection from '@/components/ui/LinksSection'

const STATUS_OPTIONS: TripStatus[] = ['dreaming', 'planning', 'booked', 'travelling', 'done', 'cancelled']
const KIND_OPTIONS: ItineraryKind[] = ['activity', 'travel', 'stay', 'food', 'note']
const KIND_ICON: Record<ItineraryKind, string> = { activity: '◆', travel: '◇', stay: '▭', food: '◍', note: '✎' }
const CATEGORY_OPTIONS: BudgetCategory[] = ['flights', 'stay', 'food', 'transport', 'activities', 'other']

const input: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.76rem',
  padding: '0.45rem 0.65rem', outline: 'none',
}

// Itinerary and Budget as real grids (2026-09-24, replaces click-to-expand
// rows) — every cell is a live input, not a summary you tap to reveal a
// popout form. Type a date, tab to time, tab to what's happening: closer to
// actually planning in a spreadsheet than a checklist with an edit mode.
// Sort order is the query itself (item_date, then sort_order — see
// useTripBundle.ts's load()), so the grid is always chronological without a
// separate day-grouping pass; the date column carries that instead, exactly
// like a real spreadsheet's repeated column values do.
const cell: React.CSSProperties = {
  padding: '0.3rem 0.4rem', borderBottom: '1px solid var(--faint)', verticalAlign: 'middle',
}
const cellInput: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none', outline: 'none', boxSizing: 'border-box',
  color: 'inherit', fontFamily: 'var(--font-body)', fontSize: '0.76rem', padding: '0.2rem',
  borderRadius: '5px',
}
const headCell: React.CSSProperties = {
  padding: '0.25rem 0.4rem', fontSize: '0.62rem', letterSpacing: '0.05em', textTransform: 'uppercase',
  color: 'var(--muted)', opacity: 0.68, textAlign: 'left', borderBottom: '1px solid var(--border)',
}

// A cell's input highlights on focus, same idea as a spreadsheet's active-
// cell outline — the rest of the grid stays borderless and calm until you're
// actually in a field.
function useCellFocusStyle() {
  return {
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.background = 'var(--hover-bg)' },
    onBlurCapture: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => { e.currentTarget.style.background = 'transparent' },
  }
}

type BundleItinerary = import('@/lib/hooks/useTripBundle').ItineraryItem

function ItineraryTableRow({ item, onUpdate, onRemove }: {
  item: BundleItinerary
  onUpdate: (id: string, fields: Partial<Pick<BundleItinerary, 'title' | 'item_date' | 'time_label' | 'kind' | 'notes' | 'done'>>) => void
  onRemove: (id: string) => void
}) {
  const [title, setTitle] = useState(item.title)
  const [date, setDate] = useState(item.item_date ?? '')
  const [time, setTime] = useState(item.time_label ?? '')
  const focusStyle = useCellFocusStyle()

  return (
    <tr>
      <td style={{ ...cell, width: '1.6rem', textAlign: 'center' }}>
        <input type="checkbox" checked={item.done} onChange={() => onUpdate(item.id, { done: !item.done })}
          style={{ cursor: 'pointer' }} />
      </td>
      <td style={{ ...cell, width: '8.5rem' }}>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          onBlur={() => { if (date !== (item.item_date ?? '')) onUpdate(item.id, { item_date: date || null }) }}
          style={cellInput} {...focusStyle} />
      </td>
      <td style={{ ...cell, width: '5.5rem' }}>
        <input value={time} onChange={e => setTime(e.target.value)} placeholder="—"
          onBlur={() => { const v = time.trim(); if (v !== (item.time_label ?? '')) onUpdate(item.id, { time_label: v || null }) }}
          style={cellInput} {...focusStyle} />
      </td>
      <td style={cell}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          onBlur={() => { const v = title.trim(); if (v && v !== item.title) onUpdate(item.id, { title: v }) }}
          style={{ ...cellInput, textDecoration: item.done ? 'line-through' : 'none', opacity: item.done ? 0.55 : 1 }} {...focusStyle} />
      </td>
      <td style={{ ...cell, width: '6.5rem' }}>
        <select value={item.kind} onChange={e => onUpdate(item.id, { kind: e.target.value as ItineraryKind })}
          style={{ ...cellInput, cursor: 'pointer' }} {...focusStyle}>
          {KIND_OPTIONS.map(k => <option key={k} value={k}>{KIND_ICON[k]} {k}</option>)}
        </select>
      </td>
      <td style={{ ...cell, width: '1.8rem', textAlign: 'center' }}>
        <IconButton label={`Remove ${item.title}`} onClick={() => onRemove(item.id)} size={9} style={{ opacity: 0.35 }}>✕</IconButton>
      </td>
    </tr>
  )
}

// The always-present blank row at the bottom — type a title and it saves,
// leaving a fresh blank row ready for the next one, the same "just keep
// typing" feel as adding a row at the bottom of a sheet.
function NewItineraryRow({ onAdd }: {
  onAdd: (fields: { title: string; item_date?: string | null; time_label?: string | null; kind?: ItineraryKind }) => void
}) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [kind, setKind] = useState<ItineraryKind>('activity')
  const focusStyle = useCellFocusStyle()

  function commit() {
    const v = title.trim()
    if (!v) return
    onAdd({ title: v, item_date: date || null, time_label: time.trim() || null, kind })
    setTitle(''); setDate(''); setTime(''); setKind('activity')
  }

  return (
    <tr>
      <td style={cell} />
      <td style={cell}><input type="date" value={date} onChange={e => setDate(e.target.value)} style={cellInput} {...focusStyle} /></td>
      <td style={cell}><input value={time} onChange={e => setTime(e.target.value)} placeholder="Time" style={cellInput} {...focusStyle} /></td>
      <td style={cell}>
        <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commit() }} onBlur={commit}
          placeholder="+ Add a row…" style={{ ...cellInput, color: title ? 'var(--text)' : 'var(--muted)' }} {...focusStyle} />
      </td>
      <td style={cell}>
        <select value={kind} onChange={e => setKind(e.target.value as ItineraryKind)} style={{ ...cellInput, cursor: 'pointer' }} {...focusStyle}>
          {KIND_OPTIONS.map(k => <option key={k} value={k}>{KIND_ICON[k]} {k}</option>)}
        </select>
      </td>
      <td style={cell} />
    </tr>
  )
}

type BundleBudget = import('@/lib/hooks/useTripBundle').BudgetItem

function BudgetTableRow({ item, onUpdate, onRemove }: {
  item: BundleBudget
  onUpdate: (id: string, fields: Partial<Pick<BundleBudget, 'label' | 'category' | 'amount' | 'paid'>>) => void
  onRemove: (id: string) => void
}) {
  const isEstimate = item.source === 'ai-estimate'
  const [label, setLabel] = useState(item.label)
  const [amount, setAmount] = useState(String(item.amount))
  const focusStyle = useCellFocusStyle()

  return (
    <tr style={{ opacity: isEstimate ? 0.65 : 1 }}>
      <td style={{ ...cell, width: '1.6rem', textAlign: 'center' }}>
        <input type="checkbox" checked={item.paid} disabled={isEstimate} title={isEstimate ? 'Estimates can\'t be marked paid' : 'Paid'}
          onChange={() => onUpdate(item.id, { paid: !item.paid })} style={{ cursor: isEstimate ? 'default' : 'pointer' }} />
      </td>
      <td style={cell}>
        {isEstimate ? (
          <span style={{ fontSize: '0.76rem' }}>est. {item.label}</span>
        ) : (
          <input value={label} onChange={e => setLabel(e.target.value)}
            onBlur={() => { const v = label.trim(); if (v && v !== item.label) onUpdate(item.id, { label: v }) }}
            style={cellInput} {...focusStyle} />
        )}
      </td>
      <td style={{ ...cell, width: '7rem' }}>
        {isEstimate ? (
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{item.category}</span>
        ) : (
          <select value={item.category} onChange={e => onUpdate(item.id, { category: e.target.value as BudgetCategory })}
            style={{ ...cellInput, cursor: 'pointer' }} {...focusStyle}>
            {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </td>
      <td style={{ ...cell, width: '6rem', textAlign: 'right' }}>
        {isEstimate ? (
          <span style={{ fontSize: '0.76rem' }}>{item.currency} {Number(item.amount).toFixed(2)}</span>
        ) : (
          <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            onBlur={() => { const n = Number(amount); if (Number.isFinite(n) && n >= 0 && n !== Number(item.amount)) onUpdate(item.id, { amount: n }); else setAmount(String(item.amount)) }}
            style={{ ...cellInput, textAlign: 'right' }} {...focusStyle} />
        )}
      </td>
      <td style={{ ...cell, width: '1.8rem', textAlign: 'center' }}>
        {!isEstimate && <IconButton label={`Remove ${item.label}`} onClick={() => onRemove(item.id)} size={9} style={{ opacity: 0.35 }}>✕</IconButton>}
      </td>
    </tr>
  )
}

function NewBudgetRow({ onAdd, currency }: {
  onAdd: (fields: { label: string; category?: BudgetCategory; amount: number; currency?: string }) => void
  currency: string
}) {
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState<BudgetCategory>('other')
  const [amount, setAmount] = useState('')
  const focusStyle = useCellFocusStyle()

  function commit() {
    const n = Number(amount)
    if (!label.trim() || !Number.isFinite(n) || n <= 0) return
    onAdd({ label: label.trim(), category, amount: n, currency })
    setLabel(''); setCategory('other'); setAmount('')
  }

  return (
    <tr>
      <td style={cell} />
      <td style={cell}>
        <input value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commit() }} onBlur={commit}
          placeholder="+ Add a cost…" style={{ ...cellInput, color: label ? 'var(--text)' : 'var(--muted)' }} {...focusStyle} />
      </td>
      <td style={cell}>
        <select value={category} onChange={e => setCategory(e.target.value as BudgetCategory)} style={{ ...cellInput, cursor: 'pointer' }} {...focusStyle}>
          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td style={cell}>
        <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit() }} onBlur={commit}
          placeholder="0.00" style={{ ...cellInput, textAlign: 'right' }} {...focusStyle} />
      </td>
      <td style={cell} />
    </tr>
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
  const { updateTrip, removeTrip, addLink, removeLink } = useTrips()
  const bundle = useTripBundle(trip?.id ?? null, trip?.space_id ?? null)
  const { places } = usePlaces()
  // Located date ideas, surfaced as one-click shortlist adds (2026-08-25) —
  // a date idea with a pin already IS a place, so "move it into trips"
  // means making it easy to shortlist here, not a second copy of the data.
  // Scoped to the trip's own space so a personal trip doesn't see a
  // partner's shared ideas or vice versa.
  const { ideas: dateIdeas } = useDateIdeas(trip?.space_id ?? null)

  const [addingShortlist, setAddingShortlist] = useState(false)

  const shortlistedIds = new Set(bundle.shortlist.map(s => s.place_id))
  const availableForShortlist = places.filter(p => !shortlistedIds.has(p.id))
  const locatedDateIdeas = dateIdeas.filter(i => i.place_id && !shortlistedIds.has(i.place_id))

  if (!trip) return <PlacesSheet open={open} onClose={onClose} title="Trip">{null}</PlacesSheet>
  // Captured as a const so closures below narrow to non-null — `trip` the
  // prop can't be re-narrowed inside a nested function declaration.
  const currentTrip = trip

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
          {/* Photo album link (2026-09-08) — a trip with one set shows a
              tappable postcard on the village rack. */}
          <input
            key={`album-${currentTrip.id}`}
            defaultValue={trip.photo_album_url ?? ''}
            onBlur={e => {
              const next = e.target.value.trim() || null
              if (next !== (currentTrip.photo_album_url ?? null)) updateTrip(currentTrip.id, { photo_album_url: next })
            }}
            placeholder="Photo album link"
            style={{ ...input, fontSize: '0.72rem' }}
          />
        </div>

        {/* Links — a flight deal, an Instagram reel of the destination,
            anything (2026-09-24). Separate from the single photo album link
            above: that one field is THE album; this is everywhere else. */}
        <section>
          <div className="t-card" style={{ marginBottom: '0.5rem' }}>Links</div>
          <LinksSection
            links={trip.links}
            onAdd={(url, title, image) => addLink(currentTrip, url, title, image).then(() => undefined)}
            onRemove={linkId => removeLink(currentTrip, linkId)}
          />
        </section>

        {/* Itinerary — a real grid: click any cell, type, tab to the next. */}
        <section>
          <div className="t-card" style={{ marginBottom: '0.5rem' }}>Itinerary</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={headCell}></th>
                  <th style={headCell}>Date</th>
                  <th style={headCell}>Time</th>
                  <th style={headCell}>What</th>
                  <th style={headCell}>Kind</th>
                  <th style={headCell}></th>
                </tr>
              </thead>
              <tbody>
                {bundle.itinerary.map(item => (
                  <ItineraryTableRow key={item.id} item={item} onUpdate={bundle.updateItineraryItem} onRemove={bundle.removeItineraryItem} />
                ))}
                <NewItineraryRow onAdd={bundle.addItineraryItem} />
              </tbody>
            </table>
          </div>
        </section>

        {/* Budget — same grid, with a totals row standing in for a
            spreadsheet's SUM row. */}
        <section>
          <div className="t-card" style={{ marginBottom: '0.5rem' }}>Budget</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={headCell}></th>
                  <th style={headCell}>Item</th>
                  <th style={headCell}>Category</th>
                  <th style={{ ...headCell, textAlign: 'right' }}>Amount</th>
                  <th style={headCell}></th>
                </tr>
              </thead>
              <tbody>
                {bundle.budget.map(b => (
                  <BudgetTableRow key={b.id} item={b} onUpdate={bundle.updateBudgetItem} onRemove={bundle.removeBudgetItem} />
                ))}
                <NewBudgetRow onAdd={bundle.addBudgetItem} currency={trip.currency} />
                <tr>
                  <td style={{ ...cell, borderBottom: 'none' }} />
                  <td style={{ ...cell, borderBottom: 'none', fontSize: '0.68rem', color: 'var(--muted)' }}>
                    Planned{trip.budget_total != null && ` · target ${trip.currency} ${trip.budget_total}`}
                  </td>
                  <td style={{ ...cell, borderBottom: 'none' }} />
                  <td style={{ ...cell, borderBottom: 'none', textAlign: 'right', fontSize: '0.76rem', color: 'var(--text)', fontWeight: 500 }}>
                    {trip.currency} {bundle.plannedTotal.toFixed(2)}
                  </td>
                  <td style={{ ...cell, borderBottom: 'none' }} />
                </tr>
                <tr>
                  <td style={{ ...cell, borderBottom: 'none' }} />
                  <td style={{ ...cell, borderBottom: 'none', fontSize: '0.68rem', color: 'var(--muted)' }}>Paid</td>
                  <td style={{ ...cell, borderBottom: 'none' }} />
                  <td style={{ ...cell, borderBottom: 'none', textAlign: 'right', fontSize: '0.76rem', color: 'var(--emerald)', fontWeight: 500 }}>
                    {trip.currency} {bundle.spentTotal.toFixed(2)}
                  </td>
                  <td style={{ ...cell, borderBottom: 'none' }} />
                </tr>
              </tbody>
            </table>
          </div>
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
              <IconButton label="Remove from shortlist" onClick={() => bundle.removeFromShortlist(s.place_id)} size={10} style={{ opacity: 0.4 }}>✕</IconButton>
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
