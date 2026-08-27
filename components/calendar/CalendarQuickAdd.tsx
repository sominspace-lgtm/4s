'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useEvents } from '@/lib/hooks/useEvents'
import { useWorkItems } from '@/lib/hooks/useWorkItems'

// One always-visible "+ Add" button for the whole calendar (2026-08-27) —
// every view already lets you add *something* (click a day in Month, click
// an hour in Week/Day), but each of those requires first navigating to the
// right day. This is the one-click path from anywhere: pick Event or Task,
// type a title, optionally set a date/time, done. Closest analog is Google
// Calendar's own "Create" button.
//
// Creates a private item either way — same as everything else in this app,
// sharing is a deliberate second step (the ⇆ ShareMenu already on every
// event row), not a default.
export default function CalendarQuickAdd() {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<'event' | 'task'>('event')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  const { add: addEvent } = useEvents()
  const { add: addTask } = useWorkItems()

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  useEffect(() => {
    if (open) titleRef.current?.focus()
  }, [open])

  function reset() {
    setTitle('')
    setDate(format(new Date(), 'yyyy-MM-dd'))
    setTime('')
    setErr(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    setErr(null)
    if (kind === 'event') {
      const { error } = await addEvent(title.trim(), date, null, time || null)
      if (error) { setErr(error.message); setSaving(false); return }
    } else {
      const error = await addTask({ title: title.trim(), notes: null, due_date: date, energy: null, domain: null, recur_days: null })
      if (error) { setErr(error); setSaving(false); return }
    }
    setSaving(false)
    reset()
    setOpen(false)
  }

  const segBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, fontSize: '0.68rem', padding: '0.35em 0', borderRadius: '6px', cursor: 'pointer',
    border: 'none', fontFamily: 'var(--font-body)',
    background: active ? 'var(--surface)' : 'transparent',
    color: active ? 'var(--text)' : 'var(--muted)', fontWeight: active ? 500 : 400,
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="press"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.35em',
          background: 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: '8px',
          padding: '0.35em 0.8em', fontSize: '0.68rem', fontWeight: 500, cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}
      >
        <span style={{ fontSize: '0.9em', lineHeight: 1 }}>+</span> Add
      </button>

      {open && (
        <form
          onSubmit={submit}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 130, width: '250px',
            background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
            padding: '0.7rem', boxShadow: '0 8px 24px var(--shadow)',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.2rem', background: 'var(--hover-bg)', borderRadius: '7px', padding: '0.15rem' }}>
            <button type="button" onClick={() => setKind('event')} style={segBtn(kind === 'event')}>Event</button>
            <button type="button" onClick={() => setKind('task')} style={segBtn(kind === 'task')}>Task</button>
          </div>

          <input
            ref={titleRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={kind === 'event' ? 'Event title' : 'Task title'}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px',
              padding: '0.4em 0.6em', fontSize: '0.74rem', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{
                flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px',
                padding: '0.35em 0.4em', fontSize: '0.7rem', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none',
              }}
            />
            {/* Time only makes sense for events — tasks have never had a
                time-of-day concept anywhere in this app (see useEvents' own
                header comment on why events alone got one). */}
            {kind === 'event' && (
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                aria-label="Time (optional)"
                style={{
                  width: '6.2em', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px',
                  padding: '0.35em 0.4em', fontSize: '0.7rem', color: 'var(--text)', fontFamily: 'var(--font-body)', outline: 'none',
                }}
              />
            )}
          </div>

          {err && <div style={{ fontSize: '0.64rem', color: 'var(--rose)' }}>{err}</div>}

          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setOpen(false); reset() }} className="btn btn-ghost press" style={{ fontSize: '0.66rem' }}>Cancel</button>
            <button type="submit" disabled={!title.trim() || saving} className="btn btn-primary press" style={{ fontSize: '0.66rem' }}>
              {saving ? 'Adding…' : 'Add'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
