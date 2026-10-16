'use client'

import { useState } from 'react'
import { useTrips, type Trip, type TripStatus } from '@/lib/hooks/useTrips'
import NamedList from '@/components/household/NamedList'
import { tripWhen, tripGradient } from '@/lib/trips/when'

const STATUS_LABEL: Record<TripStatus, string> = {
  dreaming: 'Dreaming', planning: 'Planning', booked: 'Booked',
  travelling: 'Travelling', done: 'Done', cancelled: 'Cancelled',
}
const STATUS_COLOR: Record<TripStatus, string> = {
  dreaming: '--muted', planning: '--amber', booked: '--emerald',
  travelling: '--gold', done: '--slate', cancelled: '--muted',
}

const input: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
  color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
  padding: '0.55rem 0.75rem', outline: 'none', width: '100%',
}

// Same uppercase small-caps section label as Date Ideas' Planned/Ideas/Done
// split (HouseholdDateIdeas.tsx) — 'dreaming' is already "just a name and a
// dream" (see the empty-state copy below and useTrips.ts's own comment), so
// it doubles as the idea bucket without a new status or schema.
const sectionLabelStyle: React.CSSProperties = {
  fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.65, marginBottom: '0.35rem',
}

// Trip list — the counterpart to PinList, one level up. Where are the places
// we care about (Pins) vs. where should we go next (Trips): different
// question, same tab, because they share the same "places" mental model and
// a trip's shortlist IS a set of pins.
export default function TripsPanel({ spaceId, hasSpace, onSelect, sharedOnly = false }: {
  spaceId: string | null
  hasSpace: boolean
  onSelect: (trip: Trip) => void
  /** Shared-device mode — hide personal trips. See PlacesHub. */
  sharedOnly?: boolean
}) {
  const { trips: allTrips, loading, addTrip } = useTrips()
  const trips = sharedOnly ? allTrips.filter(t => t.space_id !== null) : allTrips
  // Three shelves (2026-10-16): what is coming up (soonest first), the trips
  // we dream about, and the ones we have been on. The soonest dated trip gets
  // a big countdown at the top.
  const byDate = (a: Trip, b: Trip) => (a.start_date ?? '9999').localeCompare(b.start_date ?? '9999')
  const ideas = trips.filter(t => t.status === 'dreaming')
  const past = trips.filter(t => t.status === 'done' || t.status === 'cancelled' || (t.status !== 'dreaming' && tripWhen(t.start_date, t.end_date).phase === 'past'))
  const planned = trips.filter(t => t.status !== 'dreaming' && !past.includes(t)).sort(byDate)
  const next = planned.find(t => t.start_date)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [shared, setShared] = useState(false)
  const [saving, setSaving] = useState(false)

  function reset() {
    setTitle(''); setDestination(''); setStartDate(''); setEndDate(''); setShared(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const { error } = await addTrip({
      title: title.trim(),
      destination: destination.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      shared,
    }, spaceId)
    setSaving(false)
    if (!error) { reset(); setAdding(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => setAdding(a => !a)} className="btn btn-secondary press" style={{ fontSize: '0.72rem' }}>
          {adding ? 'Close' : '+ New trip idea'}
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="organic" style={{
          display: 'flex', flexDirection: 'column', gap: '0.5rem',
          padding: '0.9rem', border: '1px solid var(--border)', background: 'var(--hover-bg)',
        }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Trip name (e.g. Kyoto in spring)" style={input} autoFocus />
          <input value={destination} onChange={e => setDestination(e.target.value)} placeholder="Destination (optional)" style={input} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={input} />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={input} />
          </div>
          {hasSpace && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
              <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} />
              Share with household
            </label>
          )}
          <button type="submit" disabled={saving || !title.trim()} className="btn btn-primary press" style={{ fontSize: '0.74rem', alignSelf: 'flex-start' }}>
            {saving ? 'Saving…' : 'Save trip'}
          </button>
        </form>
      )}

      {trips.length === 0 && !loading && !adding && (
        <div style={{ fontSize: '0.76rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8, lineHeight: 1.6, padding: '1rem 0' }}>
          Nothing planned yet. A trip can start as just a name and a dream — dates and an itinerary come later.
        </div>
      )}

      {next && (() => {
        const w = tripWhen(next.start_date, next.end_date)
        return (
          <button onClick={() => onSelect(next)} className="press" style={{
            position: 'relative', overflow: 'hidden', border: 'none', borderRadius: 18, padding: '1.3rem 1.2rem', cursor: 'pointer', textAlign: 'left',
            color: '#fff', background: tripGradient(next.title), minHeight: 150, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '0.25rem',
          }}>
            {next.links?.find(l => l.image) && (
              // eslint-disable-next-line @next/next/no-img-element -- any host
              <img src={next.links.find(l => l.image)!.image!} alt="" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.45 }} />
            )}
            <span style={{ position: 'relative', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.85 }}>Next trip</span>
            <span style={{ position: 'relative', fontFamily: 'var(--font-display)', fontSize: '1.6rem', lineHeight: 1.1 }}>{next.title}</span>
            <span style={{ position: 'relative', fontSize: '0.95rem' }}>{w.label}{w.range ? ` · ${w.range}` : ''}</span>
          </button>
        )
      })()}

      {planned.length > 0 && <Shelf label="Coming up" trips={planned} onSelect={onSelect} />}
      {ideas.length > 0 && <Shelf label="Dream trips" trips={ideas} onSelect={onSelect} />}
      {past.length > 0 && (
        <details>
          <summary style={{ ...sectionLabelStyle, cursor: 'pointer', minHeight: 32, display: 'flex', alignItems: 'center' }}>Been there ({past.length})</summary>
          <Shelf label="" trips={past} onSelect={onSelect} />
        </details>
      )}

      {/* Dream hotels, moved here from Places → Info (2026-09-23): a hotel
          you'd love to stay at is trip planning, not a look-something-up
          reference the way Bathroom codes is — it belongs next to Ideas and
          Trips, not next to "what's nearby". Same household_lists row either
          way, via NamedList. */}
      <div>
        <div style={sectionLabelStyle}>Dream hotels</div>
        <NamedList spaceId={spaceId} name="Dream hotels" startLabel="+ Start a Dream hotels list" />
      </div>
    </div>
  )
}

function Shelf({ label, trips, onSelect }: { label: string; trips: Trip[]; onSelect: (trip: Trip) => void }) {
  return (
    <div>
      {label && <div style={sectionLabelStyle}>{label}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(14rem, 100%), 1fr))', gap: '0.7rem' }}>
        {trips.map(t => <TripCard key={t.id} trip={t} onSelect={onSelect} />)}
      </div>
    </div>
  )
}

function TripCard({ trip, onSelect }: { trip: Trip; onSelect: (trip: Trip) => void }) {
  const w = tripWhen(trip.start_date, trip.end_date)
  const cover = trip.links?.find(l => l.image)?.image ?? null
  return (
    <button onClick={() => onSelect(trip)} className="press" style={{
      display: 'flex', flexDirection: 'column', textAlign: 'left', padding: 0, overflow: 'hidden', cursor: 'pointer',
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, fontFamily: 'var(--font-body)',
    }}>
      <div style={{ position: 'relative', height: 96, background: tripGradient(trip.title), display: 'flex', alignItems: 'flex-end', padding: '0.6rem 0.8rem' }}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element -- any host
          <img src={cover} alt="" referrerPolicy="no-referrer" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
        <span style={{ position: 'relative', fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: '#fff', textShadow: '0 1px 6px rgba(0,0,0,0.45)' }}>{trip.title}</span>
        <span style={{
          position: 'absolute', top: 8, right: 8, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em',
          background: 'rgba(0,0,0,0.45)', color: '#fff', borderRadius: 999, padding: '0.2em 0.6em',
        }}>{STATUS_LABEL[trip.status]}</span>
      </div>
      <div style={{ padding: '0.6rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{trip.destination ?? 'Somewhere'}</span>
        <span style={{ fontSize: '0.74rem', color: w.phase === 'upcoming' || w.phase === 'now' ? `var(${STATUS_COLOR[trip.status] === '--muted' ? '--gold' : STATUS_COLOR[trip.status]})` : 'var(--muted)' }}>
          {w.phase === 'undated' ? 'No dates yet' : `${w.label}${w.range ? ` · ${w.range}` : ''}`}
          {w.nights ? ` · ${w.nights} night${w.nights === 1 ? '' : 's'}` : ''}
        </span>
        {trip.space_id && <span style={{ fontSize: '0.66rem', color: 'var(--muted)' }}>Shared</span>}
      </div>
    </button>
  )
}
