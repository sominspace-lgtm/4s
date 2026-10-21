'use client'

import { useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { awayActive, type Away } from '@/lib/hooks/useHousehold'
import Sheet from '@/components/ui/Sheet'

// Away mode (2026-10-21): one switch pauses every chore while you are both
// away. Chores freeze where they were the day you left, no chore reminders go
// out, and when you are back nothing shows as overdue just because you were
// gone. Ends on its own after the end date, or tap "We're back".

const nice = (d: string) => format(parseISO(d), 'EEE, MMM d')

export default function AwayCard({ away, onSet, onEnd }: {
  away: Away | null
  onSet: (from: string, until: string) => Promise<{ error: string | null }>
  onEnd: () => Promise<{ error: string | null }>
}) {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(today)
  const [until, setUntil] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const active = awayActive(away, today)

  const field: React.CSSProperties = {
    minHeight: 44, padding: '0 0.6rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)', color: 'var(--text)',
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  async function run(p: Promise<{ error: string | null }>) {
    setBusy(true); setErr(null)
    const r = await p
    setBusy(false)
    if (r.error) setErr('That did not save. Has the away SQL been run?')
    else setOpen(false)
  }

  if (away) {
    return (
      <section style={{
        border: '1px solid color-mix(in srgb, var(--sky, var(--gold)) 30%, var(--border))',
        background: 'color-mix(in srgb, var(--sky, var(--gold)) 7%, var(--surface))',
        borderRadius: 14, padding: '0.9rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem',
      }}>
        <div style={{ fontSize: '0.92rem', color: 'var(--text)' }}>
          {active ? `Away until ${nice(away.until)}` : `Away from ${nice(away.from)} to ${nice(away.until)}`}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          {active
            ? 'Chores are paused. Nothing will turn overdue and no chore reminders go out. It ends by itself after the last day.'
            : 'Chores pause on the first day and pick back up after the last.'}
        </div>
        {err && <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>{err}</div>}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button disabled={busy} onClick={() => run(onEnd())} className="btn btn-primary press" style={{ minHeight: 44 }}>
            {active ? 'We’re back' : 'Cancel the trip'}
          </button>
          <button disabled={busy} onClick={() => { setFrom(away.from); setUntil(away.until); setOpen(o => !o) }} className="btn btn-ghost press" style={{ minHeight: 44 }}>Change dates</button>
        </div>
        <Sheet open={open} title={away ? 'Change the dates' : 'Going away'} onClose={() => setOpen(false)}>{renderForm()}</Sheet>
      </section>
    )
  }

  function renderForm() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>Leaving
            <input type="date" value={from} min={today} disabled={active} onChange={e => setFrom(e.target.value)} style={field} />
          </label>
          <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>Back on
            <input type="date" value={until} min={from} onChange={e => setUntil(e.target.value)} style={field} />
          </label>
        </div>
        <button disabled={busy || !from || !until || until < from} onClick={() => run(onSet(from, until))} className="btn btn-primary press" style={{ minHeight: 44, alignSelf: 'flex-start' }}>
          {busy ? 'Saving…' : away ? 'Save dates' : 'Pause chores'}
        </button>
      </div>
    )
  }

  return (
    <section style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 14, padding: '0.8rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
        <div>
          <div style={{ fontSize: '0.88rem', color: 'var(--text)' }}>Going away?</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>Pause every chore while you are gone.</div>
        </div>
        <button onClick={() => setOpen(o => !o)} className="btn btn-secondary press" style={{ minHeight: 44, flexShrink: 0 }}>Set dates</button>
      </div>
      <Sheet open={open} title={away ? 'Change the dates' : 'Going away'} onClose={() => setOpen(false)}>{renderForm()}</Sheet>
      {err && <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>{err}</div>}
    </section>
  )
}
