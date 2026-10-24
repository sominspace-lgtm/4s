'use client'

import { useCallback, useEffect, useState } from 'react'
import { useGoogleStatus, type GmailMessage, type GmailSummary } from '@/lib/hooks/useGoogle'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useEvents } from '@/lib/hooks/useEvents'
import { useSubscriptions } from '@/lib/hooks/useSubscriptions'
import { useTrips } from '@/lib/hooks/useTrips'

// Gmail inside 4S (2026-10-05): a read-only inbox with search, a way to turn
// one email into tasks / events / bills / trips (AI suggests, nothing is
// saved until you confirm each chip), and a plain compose-and-send. Mail is
// fetched live through /api/google/gmail on demand and never stored in 4S.

interface Suggestion {
  type: 'task' | 'event' | 'bill' | 'trip'
  label: string; title: string
  date: string | null; endDate: string | null; time: string | null
  amount: number | null; destination: string | null; notes: string | null
}

const input: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: '8px', padding: '0.5rem 0.7rem', color: 'var(--text)', fontFamily: 'var(--font-body)',
  fontSize: '0.8rem', outline: 'none',
}
const small: React.CSSProperties = { fontSize: '0.7rem', color: 'var(--muted)', lineHeight: 1.6 }

function when(d: string): string {
  const t = new Date(d)
  return Number.isNaN(t.getTime()) ? '' : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function senderName(from: string): string {
  const m = from.match(/^"?([^"<]+?)"?\s*</)
  return (m?.[1] ?? from).trim() || from
}
function senderAddress(from: string): string {
  return from.match(/<([^>]+)>/)?.[1] ?? from
}

export default function GmailInbox() {
  const { status, loading: statusLoading, connect } = useGoogleStatus()
  const { add: addTask } = useWorkItems()
  const { add: addEvent } = useEvents()
  const { add: addSub } = useSubscriptions()
  const { addTrip } = useTrips()

  const [q, setQ] = useState('')
  const [messages, setMessages] = useState<GmailSummary[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState<GmailMessage | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [saved, setSaved] = useState<Set<number>>(new Set())
  const [compose, setCompose] = useState<{ to: string; subject: string; body: string } | null>(null)
  const [sendNote, setSendNote] = useState<string | null>(null)
  // Which inbox (2026-10-24): your own, or the household's shared email.
  const mineOk = status.connected && !!status.gmail
  const sharedOk = !!status.household?.connected
  const [pick, setPick] = useState<'mine' | 'shared'>('mine')
  const account: 'mine' | 'shared' = !mineOk ? 'shared' : !sharedOk ? 'mine' : pick
  const acct = account === 'shared' ? 'account=shared' : ''
  const withAcct = (url: string) => (acct ? `${url}${url.includes('?') ? '&' : '?'}${acct}` : url)

  const list = useCallback(async (query: string) => {
    setBusy(true); setErr(null)
    const res = await fetch(withAcct(`/api/google/gmail?${new URLSearchParams(query ? { q: query } : {})}`))
    if (res.ok) setMessages(((await res.json()) as { messages: GmailSummary[] }).messages)
    else setErr(res.status === 409 ? 'Google needs to be connected again.' : 'Could not load Gmail.')
    setBusy(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- re-list when the inbox changes
  }, [acct])

  useEffect(() => { if (mineOk || sharedOk) { setOpen(null); list('') } }, [mineOk, sharedOk, list])

  async function openMessage(id: string) {
    setErr(null); setSuggestions(null); setSaved(new Set()); setSendNote(null)
    const res = await fetch(withAcct(`/api/google/gmail?id=${encodeURIComponent(id)}`))
    if (!res.ok) { setErr('Could not open that message.'); return }
    setOpen(await res.json() as GmailMessage)
  }

  async function findThings() {
    if (!open) return
    setExtracting(true); setErr(null)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task: 'extract-email', text: `From: ${open.from}\nSubject: ${open.subject}\nDate: ${open.date}\n\n${open.body}` }),
      })
      if (!res.ok) { setErr(res.status === 503 ? 'AI is not set up on the server.' : 'Could not read that email.'); return }
      setSuggestions(((await res.json()) as { result: { suggestions: Suggestion[] } }).result.suggestions)
    } finally { setExtracting(false) }
  }

  async function confirm(i: number, s: Suggestion) {
    let error: string | null = null
    if (s.type === 'task') {
      error = await addTask({ title: s.title, notes: s.notes, due_date: s.date, energy: null, domain: null, recur_days: null })
    } else if (s.type === 'event') {
      if (!s.date) error = 'That event has no date.'
      else error = (await addEvent(s.title, s.date, s.notes, s.time, s.endDate)).error?.message ?? null
    } else if (s.type === 'bill') {
      error = (await addSub(s.title, s.amount ?? 0, s.date ?? '')).error?.message ?? null
    } else {
      error = (await addTrip({ title: s.title, destination: s.destination, start_date: s.date, end_date: s.endDate, notes: s.notes }, null)).error
    }
    if (error) { setErr(error); return }
    setSaved(prev => new Set(prev).add(i))
  }

  async function send() {
    if (!compose) return
    setSendNote('Sending…')
    const res = await fetch(withAcct('/api/google/gmail'), {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(compose),
    })
    if (res.ok) { setSendNote('Sent.'); setCompose(null) }
    else setSendNote(((await res.json().catch(() => ({}))) as { error?: string }).error ?? 'Could not send.')
  }

  if (statusLoading) return <div style={small}>Checking…</div>
  if (status.blocked) return <div style={small}>Mail is not on the shared screen. Sign in as yourself to read it.</div>
  if (!status.configured) return <div style={small}>Google is not set up on the server yet.</div>
  if (!mineOk && !sharedOk) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', alignItems: 'flex-start' }}>
        <div style={small}>Connect Google to read your inbox here, turn emails into tasks and events, and send mail.</div>
        <button onClick={connect} className="btn btn-primary press" style={{ fontSize: '0.74rem' }}>Connect Google</button>
      </div>
    )
  }

  // --- one message open
  if (open) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <button onClick={() => { setOpen(null); setSuggestions(null) }} style={{ ...small, background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', padding: 0 }}>‹ Inbox</button>
        <div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{open.subject || '(no subject)'}</div>
          <div style={small}>{senderName(open.from)} · {when(open.date)}</div>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: '22rem', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.8rem 0.9rem' }}>
          {open.body || '(no readable text)'}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={findThings} disabled={extracting} className="btn btn-secondary press" style={{ fontSize: '0.72rem' }}>
            {extracting ? 'Reading…' : 'Find tasks and dates'}
          </button>
          {(status.send || account === 'shared') && (
            <button className="btn btn-ghost press" style={{ fontSize: '0.72rem' }}
              onClick={() => setCompose({ to: senderAddress(open.from), subject: /^re:/i.test(open.subject) ? open.subject : `Re: ${open.subject}`, body: '' })}>
              Reply
            </button>
          )}
        </div>
        {suggestions && (
          suggestions.length === 0
            ? <div style={small}>Nothing to save from this one.</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {suggestions.map((s, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap',
                    border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
                    background: 'color-mix(in srgb, var(--gold) 6%, transparent)', borderRadius: '8px', padding: '0.45rem 0.65rem',
                  }}>
                    <span style={{ fontSize: '0.58rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold)' }}>{s.type}</span>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text)', flex: 1, minWidth: '9rem' }}>
                      {s.label}{s.date ? ` · ${s.date}` : ''}{s.time ? ` ${s.time}` : ''}
                    </span>
                    <button disabled={saved.has(i)} onClick={() => confirm(i, s)} className="btn btn-primary press" style={{ fontSize: '0.66rem', padding: '0.3em 0.8em' }}>
                      {saved.has(i) ? 'Saved' : 'Save'}
                    </button>
                  </div>
                ))}
              </div>
            )
        )}
        {err && <div style={{ ...small, color: 'var(--rose)' }}>{err}</div>}
        {compose && <Compose compose={compose} setCompose={setCompose} send={send} note={sendNote} />}
      </div>
    )
  }

  // --- inbox
  const chip = (on: boolean): React.CSSProperties => ({
    fontSize: '0.78rem', padding: '0 0.8rem', minHeight: 34, borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)',
    border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`, background: on ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
    color: on ? 'var(--gold)' : 'var(--muted)',
  })
  // Quick filters (2026-10-24): the searches people actually run.
  const FILTERS: [string, string][] = [['Inbox', ''], ['Unread', 'is:unread'], ['This week', 'newer_than:7d'], ['Bills', 'subject:(bill OR invoice OR receipt OR statement OR payment)'], ['Travel', 'subject:(flight OR reservation OR booking OR itinerary OR confirmation)']]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      {mineOk && sharedOk && (
        <div style={{ display: 'flex', gap: '0.2rem', padding: '0.2rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, alignSelf: 'flex-start' }}>
          {(['mine', 'shared'] as const).map(a => (
            <button key={a} onClick={() => { setPick(a); setOpen(null); setQ('') }} className="press" style={{
              minHeight: 36, padding: '0 0.9rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.84rem',
              background: account === a ? 'var(--surface)' : 'transparent', color: account === a ? 'var(--text)' : 'var(--muted)',
            }}>{a === 'mine' ? 'My inbox' : 'Shared inbox'}</button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
        {FILTERS.map(([label, query]) => (
          <button key={label} className="press" style={chip(q === query)} onClick={() => { setQ(query); list(query) }}>{label}</button>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); list(q.trim()) }} style={{ display: 'flex', gap: '0.5rem' }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search Gmail (try from:airline or is:unread)" style={input} />
        <button className="btn btn-secondary press" style={{ fontSize: '0.72rem' }} disabled={busy}>{busy ? '…' : 'Search'}</button>
        {(status.send || account === 'shared') && <button type="button" className="btn btn-ghost press" style={{ fontSize: '0.72rem' }} onClick={() => { setCompose({ to: '', subject: '', body: '' }); setSendNote(null) }}>New</button>}
      </form>
      {err && <div style={{ ...small, color: 'var(--rose)' }}>{err}</div>}
      {compose && <Compose compose={compose} setCompose={setCompose} send={send} note={sendNote} />}
      {sendNote && !compose && <div style={small}>{sendNote}</div>}
      {!busy && messages.length === 0 && !err && <div style={{ ...small, fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>No messages.</div>}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {messages.map(m => (
          <button key={m.id} onClick={() => openMessage(m.id)} style={{
            textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--faint)',
            padding: '0.6rem 0.1rem', cursor: 'pointer', fontFamily: 'var(--font-body)', color: 'var(--text)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: m.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{senderName(m.from)}</span>
              <span style={{ ...small, flexShrink: 0 }}>{when(m.date)}</span>
            </div>
            <div style={{ fontSize: '0.76rem', fontWeight: m.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.subject}</div>
            <div style={{ ...small, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.snippet}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Compose({ compose, setCompose, send, note }: {
  compose: { to: string; subject: string; body: string }
  setCompose: (c: { to: string; subject: string; body: string } | null) => void
  send: () => void
  note: string | null
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem', background: 'var(--surface)' }}>
      <input value={compose.to} onChange={e => setCompose({ ...compose, to: e.target.value })} placeholder="To" style={input} />
      <input value={compose.subject} onChange={e => setCompose({ ...compose, subject: e.target.value })} placeholder="Subject" style={input} />
      <textarea value={compose.body} onChange={e => setCompose({ ...compose, body: e.target.value })} placeholder="Message" rows={5} style={{ ...input, resize: 'vertical' }} />
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button onClick={send} className="btn btn-primary press" style={{ fontSize: '0.72rem' }}>Send from Gmail</button>
        <button onClick={() => setCompose(null)} className="btn btn-ghost press" style={{ fontSize: '0.72rem' }}>Cancel</button>
        {note && <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{note}</span>}
      </div>
    </div>
  )
}
