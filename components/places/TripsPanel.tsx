'use client'

import { useState } from 'react'
import { useTrips, type Trip, type TripStatus } from '@/lib/hooks/useTrips'

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

// Trip list — the counterpart to PinList, one level up. Where are the places
// we care about (Pins) vs. where should we go next (Trips): different
// question, same tab, because they share the same "places" mental model and
// a trip's shortlist IS a set of pins.
export default function TripsPanel({ spaceId, hasSpace, onSelect }: {
  spaceId: string | null
  hasSpace: boolean
  onSelect: (trip: Trip) => void
}) {
  const { trips, loading, addTrip } = useTrips()
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
          {adding ? 'Close' : '+ New trip'}
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

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {trips.map(trip => (
          <button
            key={trip.id}
            onClick={() => onSelect(trip)}
            className="press"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.7rem',
              padding: '0.75rem 0.2rem', borderBottom: '1px solid var(--faint)',
              background: 'none', border: 'none', borderBottomWidth: '1px',
              borderBottomStyle: 'solid', borderBottomColor: 'var(--faint)',
              cursor: 'pointer', textAlign: 'left', width: '100%',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.84rem', color: 'var(--text)' }}>{trip.title}</div>
              <div style={{ fontSize: '0.66rem', color: 'var(--muted)' }}>
                {trip.destination ?? 'No destination set'}
                {trip.start_date && ` · ${trip.start_date}${trip.end_date ? ` – ${trip.end_date}` : ''}`}
                {trip.space_id && ' · shared'}
              </div>
            </div>
            <span style={{
              fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em',
              color: `var(${STATUS_COLOR[trip.status]})`, flexShrink: 0,
            }}>{STATUS_LABEL[trip.status]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
