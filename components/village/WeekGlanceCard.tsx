'use client'

import { addDays, format } from 'date-fns'
import { useHousehold, choreDue, dinnerFor } from '@/lib/hooks/useHousehold'
import { useTrips } from '@/lib/hooks/useTrips'
import { tripWhen } from '@/lib/trips/when'
import { panelCard, panelTitle } from './panelStyle'

// Week at a glance on the wall (2026-10-19): who cooks what tonight, chores
// due or late, the next trip, and Somi's next vet visit, in one card you can
// read from across the room. Read only; tap through to the real tabs on a
// phone.

const row: React.CSSProperties = { display: 'flex', alignItems: 'baseline', gap: '0.5rem', fontSize: '0.8rem', lineHeight: 1.45 }
const label: React.CSSProperties = { fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', minWidth: '4.6rem', flexShrink: 0 }

export default function WeekGlanceCard({ spaceId }: { spaceId: string | null }) {
  const h = useHousehold(spaceId)
  const { trips } = useTrips()

  const tonight = dinnerFor(h.meals)
  const due = h.chores.map(c => ({ c, d: choreDue(c) })).filter(x => x.d <= 0).sort((a, b) => a.d - b.d)
  const next = trips
    .filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.start_date)
    .map(t => ({ t, w: tripWhen(t.start_date, t.end_date) }))
    .filter(x => x.w.phase === 'upcoming' || x.w.phase === 'now')
    .sort((a, b) => (a.t.start_date ?? '').localeCompare(b.t.start_date ?? ''))[0]
  const vet = h.chores.find(c => /somi/i.test(c.folder ?? '') && /vet/i.test(c.name))
  const vetIn = vet ? choreDue(vet) : null
  const week = [...Array(6)].map((_, i) => addDays(new Date(), i + 1))
    .map(d => ({ d, m: dinnerFor(h.meals, d) })).filter(x => x.m)

  return (
    <div className="organic" style={panelCard}>
      <div style={panelTitle}>This week</div>
      <div style={row}>
        <span style={label}>Tonight</span>
        <span style={{ color: tonight ? 'var(--text)' : 'var(--muted)' }}>
          {tonight ? `${tonight.title}${tonight.kind === 'eating_out' ? ' (out)' : ''}${tonight.cook ? (tonight.cook === 'Together' ? ', cooking together' : `, ${tonight.cook} cooks`) : ''}` : 'Nothing planned'}
        </span>
      </div>
      {week.length > 0 && (
        <div style={row}>
          <span style={label}>Then</span>
          <span style={{ color: 'var(--text)' }}>{week.slice(0, 3).map(x => `${format(x.d, 'EEE')} ${x.m!.title}`).join(' · ')}</span>
        </div>
      )}
      <div style={row}>
        <span style={label}>Chores</span>
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          {due.length === 0 ? <span style={{ color: 'var(--muted)' }}>All caught up</span> : due.slice(0, 5).map(({ c, d }) => (
            <span key={c.id} style={{ color: 'var(--text)' }}>
              {c.name}{d < 0 && <span style={{ color: 'var(--rose)' }}> · {-d}d late</span>}
            </span>
          ))}
          {due.length > 5 && <span style={{ color: 'var(--muted)' }}>and {due.length - 5} more</span>}
        </span>
      </div>
      {next && (
        <div style={row}>
          <span style={label}>Next trip</span>
          <span style={{ color: 'var(--text)' }}>{next.t.title}, {next.w.label.toLowerCase()}</span>
        </div>
      )}
      {vet && vetIn !== null && (
        <div style={row}>
          <span style={label}>Somi&rsquo;s vet</span>
          <span style={{ color: vetIn < 0 ? 'var(--rose)' : 'var(--text)' }}>
            {vetIn < 0 ? `${-vetIn} days overdue` : vetIn === 0 ? 'Due now' : `In ${vetIn} days (${format(addDays(new Date(), vetIn), 'MMM d')})`}
          </span>
        </div>
      )}
    </div>
  )
}
