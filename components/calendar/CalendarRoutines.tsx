'use client'

import { withUndo } from '@/lib/ui/undo'
import { Fragment, useMemo, useState } from 'react'
import { addDays, differenceInCalendarDays, format, isSameDay, parseISO, startOfDay, startOfWeek } from 'date-fns'
import { createClient } from '@/lib/supabase/client'
import { usePersonalRoutines } from '@/lib/hooks/usePersonalRoutines'
import { useRoutines } from '@/lib/hooks/useRoutines'
import IconButton from '@/components/ui/IconButton'
import RoutineEditor from '@/components/routines/RoutineEditor'
import { countSteps } from '@/lib/routines/items'

// The Routines view of the calendar (2026-10-05). Personal routines and the
// household's routines/maintenance on one week grid: columns are days, rows
// are Morning / Daytime / Evening. Today's chips tick off right here.
//
// Time-of-day: household_routines has no such column yet, so a routine's row
// comes from its saved `time_of_day` when there is one, otherwise from words
// in its name ("morning routine", "night reset"). The picker below writes the
// column; if the migration hasn't been run it says so instead of failing
// silently.

type Bucket = 'morning' | 'day' | 'evening'
const BUCKETS: { id: Bucket; label: string }[] = [
  { id: 'morning', label: 'Morning' },
  { id: 'day', label: 'Daytime' },
  { id: 'evening', label: 'Evening' },
]

function inferBucket(name: string): Bucket {
  const n = name.toLowerCase()
  if (/(morning|wake|sunrise|breakfast|am\b)/.test(n)) return 'morning'
  if (/(night|evening|bed|wind|sleep|dinner|pm\b)/.test(n)) return 'evening'
  return 'day'
}

interface Row {
  id: string
  name: string
  cadence_days: number
  last_done_at: string | null
  kind: 'personal' | 'household' | 'maintenance'
  bucket: Bucket
  steps: number
  stepsDone: number
}

const KIND_COLOR: Record<Row['kind'], string> = {
  personal: 'var(--gold)',
  household: 'var(--slate)',
  maintenance: 'var(--emerald)',
}

function dueOn(r: Row, day: Date, today: Date): boolean {
  const c = Math.max(1, r.cadence_days)
  if (differenceInCalendarDays(day, today) < 0) return false
  if (c === 1) return true
  const last = r.last_done_at ? startOfDay(parseISO(r.last_done_at)) : null
  const first = last ? addDays(last, c) : today
  const base = first < today ? today : first
  const diff = differenceInCalendarDays(day, base)
  return diff >= 0 && diff % c === 0
}

function doneToday(r: Row, today: Date): boolean {
  if (!r.last_done_at) return false
  return differenceInCalendarDays(startOfDay(parseISO(r.last_done_at)), today) >= 0
}

export default function CalendarRoutines({ spaceId }: { spaceId: string | null }) {
  const supabase = createClient()
  const personal = usePersonalRoutines(spaceId)
  const household = useRoutines(spaceId)
  const [weekOffset, setWeekOffset] = useState(0)
  const [note, setNote] = useState<string | null>(null)
  const [buckets, setBuckets] = useState<Record<string, Bucket>>({})
  const [editing, setEditing] = useState<string | null>(null)

  const today = startOfDay(new Date())
  const weekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const rows: Row[] = useMemo(() => {
    const own: Row[] = personal.routines.map(r => ({
      id: r.id, name: r.name, cadence_days: r.cadence_days, last_done_at: r.last_done_at,
      kind: 'personal', bucket: buckets[r.id] ?? (r as unknown as { time_of_day?: Bucket }).time_of_day ?? inferBucket(r.name),
      steps: countSteps(r.items, r.cadence_days).total, stepsDone: countSteps(r.items, r.cadence_days).done,
    }))
    const shared: Row[] = household.routines.map(r => ({
      id: r.id, name: r.name, cadence_days: r.cadence_days, last_done_at: r.last_done_at,
      kind: r.kind === 'maintenance' ? 'maintenance' : 'household',
      bucket: buckets[r.id] ?? (r as unknown as { time_of_day?: Bucket }).time_of_day ?? inferBucket(r.name),
      steps: countSteps(r.items, r.cadence_days).total, stepsDone: countSteps(r.items, r.cadence_days).done,
    }))
    return [...own, ...shared]
  }, [personal.routines, household.routines, buckets])

  async function complete(r: Row) {
    if (r.kind === 'personal') await personal.markRoutineDone(r.id)
    else await household.markRoutineDone(r.id)
  }

  async function setBucket(r: Row, bucket: Bucket) {
    setBuckets(prev => ({ ...prev, [r.id]: bucket }))
    const { error } = await supabase.from('household_routines').update({ time_of_day: bucket }).eq('id', r.id)
    setNote(error ? 'Saved on this screen only. The time-of-day column needs its migration to stick.' : null)
  }

  const loading = personal.loading || household.loading
  const heading = weekOffset === 0 ? 'This week' : `${format(days[0], 'MMM d')} to ${format(days[6], 'MMM d')}`

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0.6rem 0 0.8rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <IconButton label="Previous week" onClick={() => setWeekOffset(o => o - 1)} size={16}>‹</IconButton>
          <span style={{ fontSize: '0.78rem', color: 'var(--text)', minWidth: '7.5rem', textAlign: 'center' }}>{heading}</span>
          <IconButton label="Next week" onClick={() => setWeekOffset(o => o + 1)} size={16}>›</IconButton>
          {weekOffset !== 0 && (
            <button className="press" onClick={() => setWeekOffset(0)} style={{
              fontSize: '0.64rem', marginLeft: '0.3rem', padding: '0.2em 0.6em', borderRadius: '6px',
              border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer',
            }}>Today</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.7rem', fontSize: '0.62rem', color: 'var(--muted)' }}>
          {(['personal', 'household', 'maintenance'] as const).map(k => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: KIND_COLOR[k] }} />{k}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', padding: '1rem 0' }}>Loading routines…</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', padding: '1.2rem 0', lineHeight: 1.6 }}>
          No routines yet. Add a morning or night routine from Habits, or a household routine from Household, and it shows up here.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '4.2rem repeat(7, minmax(5.4rem, 1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', minWidth: '40rem' }}>
            <div style={{ background: 'var(--surface)' }} />
            {days.map(d => {
              const isToday = isSameDay(d, today)
              return (
                <div key={d.toISOString()} style={{ background: 'var(--surface)', padding: '0.4rem 0.3rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.58rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>{format(d, 'EEE')}</div>
                  <div style={{ fontSize: '0.82rem', color: isToday ? 'var(--gold)' : 'var(--text)', fontWeight: isToday ? 600 : 400 }}>{format(d, 'd')}</div>
                </div>
              )
            })}
            {BUCKETS.map(b => (
              <Fragment key={b.id}>
                <div style={{ background: 'var(--surface)', padding: '0.5rem 0.4rem', fontSize: '0.62rem', color: 'var(--muted)' }}>{b.label}</div>
                {days.map(d => {
                  const isToday = isSameDay(d, today)
                  const here = rows.filter(r => r.bucket === b.id && dueOn(r, d, today))
                  return (
                    <div key={d.toISOString() + b.id} style={{
                      background: isToday ? 'color-mix(in srgb, var(--gold) 5%, var(--surface))' : 'var(--surface)',
                      padding: '0.3rem', minHeight: '3.2rem', display: 'flex', flexDirection: 'column', gap: '0.25rem',
                    }}>
                      {here.map(r => {
                        const done = isToday && doneToday(r, today)
                        return (
                          <button key={r.id} className="press" disabled={!isToday || done}
                            onClick={() => complete(r)}
                            title={isToday ? (done ? 'Done today' : 'Tap to mark done') : r.name}
                            style={{
                              textAlign: 'left', fontSize: '0.64rem', lineHeight: 1.25, padding: '0.28rem 0.4rem', borderRadius: '6px',
                              border: `1px solid color-mix(in srgb, ${KIND_COLOR[r.kind]} 40%, transparent)`,
                              background: `color-mix(in srgb, ${KIND_COLOR[r.kind]} ${done ? 4 : 12}%, transparent)`,
                              color: done ? 'var(--muted)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none',
                              cursor: isToday && !done ? 'pointer' : 'default', fontFamily: 'var(--font-body)',
                            }}>
                            {done ? '✓ ' : ''}{r.name}
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.4rem' }}>When each one happens</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
            {rows.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.74rem' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: KIND_COLOR[r.kind], flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.64rem' }}>
                  {r.cadence_days === 1 ? 'daily' : `every ${r.cadence_days} days`}
                  {r.steps > 0 ? ` · ${r.stepsDone}/${r.steps} steps` : ''}
                </span>
                <select value={r.bucket} onChange={e => setBucket(r, e.target.value as Bucket)} style={{
                  fontSize: '0.66rem', padding: '0.2em 0.4em', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--font-body)',
                }}>
                  {BUCKETS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
                </select>
                <button className="press" onClick={() => setEditing(editing === r.id ? null : r.id)} style={{
                  fontSize: '0.7rem', minHeight: 32, padding: '0 0.7em', borderRadius: '6px', border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>{editing === r.id ? 'Close' : 'Edit'}</button>
              </div>
            ))}
            {editing && (() => {
              const own = personal.routines.find(x => x.id === editing)
              const shared = household.routines.find(x => x.id === editing)
              const src = own ?? shared
              if (!src) return null
              return (
                <div style={{ border: '1px solid var(--gold)', borderRadius: 12, padding: '0.8rem', marginTop: '0.4rem' }}>
                  <RoutineEditor name={src.name} cadenceDays={src.cadence_days} items={src.items}
                    onCancel={() => setEditing(null)}
                    onSave={async p => { const e = own ? await personal.updateRoutine(src.id, p) : await household.updateRoutine(src.id, p); if (!e) setEditing(null); return e }}
                    onDelete={() => { setEditing(null); withUndo(`Deleting "${src.name}"`, () => (own ? personal.removeRoutine(src.id) : household.removeRoutine(src.id))) }} />
                </div>
              )
            })()}
          </div>
          {note && <div style={{ marginTop: '0.5rem', fontSize: '0.66rem', color: 'var(--muted)' }}>{note}</div>}
        </div>
      )}
    </div>
  )
}

