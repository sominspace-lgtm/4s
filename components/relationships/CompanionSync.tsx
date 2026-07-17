'use client'

import { useState } from 'react'
import { useCompanionSync, type Checkin, type TrackedItem, type DateNightIdea, type OnThisDay, type ConfirmableType } from '@/lib/hooks/useCompanionSync'
import { useRelationshipPair } from '@/lib/hooks/useRelationshipPair'

function fmt(iso: string) {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
  padding: '0.6rem 0.75rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.85rem', outline: 'none',
}

// The verification control shared by every confirmable list — the whole
// point of the dual-partner workflow lives here: three honest states, never
// alarm colors, since an unconfirmed item isn't a problem, just unfinished.
function ConfirmRow({ youConfirmed, partnerConfirmed, partnerEmail, onConfirm, busy, actionLabel = 'Confirm' }: {
  youConfirmed: boolean
  partnerConfirmed: boolean
  partnerEmail: string | null
  onConfirm: () => void
  busy: boolean
  actionLabel?: string
}) {
  if (youConfirmed && partnerConfirmed) {
    return <span style={{ fontSize: '0.68rem', color: 'var(--emerald)' }}>✓✓ Both confirmed</span>
  }
  if (youConfirmed) {
    return (
      <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
        ✓ You confirmed{partnerEmail ? ` — waiting on ${partnerEmail}` : ''}
      </span>
    )
  }
  return (
    <button onClick={onConfirm} disabled={busy} className="btn btn-secondary" style={{ fontSize: '0.66rem', padding: '0.3rem 0.7rem' }}>
      {busy ? '…' : actionLabel}
      {partnerConfirmed ? ` · ${partnerEmail ?? 'partner'} already did` : ''}
    </button>
  )
}

const cardStyle: React.CSSProperties = {
  border: '1px solid var(--border)', borderRadius: '12px', padding: '0.8rem 0.9rem',
  background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: '0.4rem',
}
const sectionLabel: React.CSSProperties = {
  fontSize: '0.62rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75, marginBottom: '0.5rem',
}
const emptyStyle: React.CSSProperties = { fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8 }

// Step 1 of the gate: nobody sees Companion data — not even mock previews
// with a real partner's name — until a relationship_pairs row is CONFIRMED
// by the invited side. This is the dual-consent UI for that.
function PairGate({ userId, userEmail }: { userId: string; userEmail: string }) {
  const { sentPending, receivedPending, loading, invite, confirm, remove } = useRelationshipPair(userId, userEmail)
  const [email, setEmail] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function send() {
    if (!email.trim()) return
    setSending(true); setErr(null)
    const e = await invite(email)
    setSending(false)
    if (e) setErr(e); else setEmail('')
  }

  if (loading) return null

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 400, marginBottom: '0.4rem' }}>Confirm your relationship partner</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
        Companion sync (check-ins, photos) only unlocks once the other person confirms too —
        this is a separate, stricter step from a regular Friends invite.
      </div>

      {receivedPending.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
          {receivedPending.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.8rem', borderRadius: '10px', border: '1px solid color-mix(in srgb, var(--gold) 35%, var(--border))', background: 'color-mix(in srgb, var(--gold) 8%, transparent)' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text)', flex: 1 }}>Invitation from a 4S user pending your confirmation</span>
              <button onClick={() => confirm(p.id)} className="btn btn-primary" style={{ fontSize: '0.68rem' }}>Confirm</button>
              <button onClick={() => remove(p.id)} className="btn btn-ghost" style={{ fontSize: '0.68rem' }}>Decline</button>
            </div>
          ))}
        </div>
      )}

      {sentPending.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
          {sentPending.map(p => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
              <span style={{ flex: 1 }}>Waiting on {p.partner_email} to confirm</span>
              <button onClick={() => remove(p.id)} className="btn btn-ghost" style={{ fontSize: '0.64rem', opacity: 0.7 }}>Cancel</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <input style={inputStyle} placeholder="partner@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} />
        <button onClick={send} disabled={sending || !email.trim()} className="btn btn-primary" style={{ fontSize: '0.72rem', flexShrink: 0 }}>Invite</button>
      </div>
      {err && <div style={{ fontSize: '0.68rem', color: 'var(--rose)', marginTop: '0.5rem' }}>{err}</div>}
    </div>
  )
}

// Step 2 of the gate: a confirmed pair still needs to point at their own
// Companion bot — saved once, shared by both (companion_connections is
// scoped to the pair, not either individual).
function ConnectionSetup({ onSave }: { onSave: (url: string, key: string) => Promise<string | null> }) {
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true); setErr(null)
    const e = await onSave(apiUrl.trim(), apiKey.trim())
    setSaving(false)
    if (e) setErr(e)
  }

  return (
    <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 400, marginBottom: '0.4rem' }}>Connect your Companion bot</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
        Partner confirmed. Paste the tunnel URL and API key from your own Companion backend — this is
        saved just for the two of you, never shared with any other 4S account.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input style={inputStyle} placeholder="https://your-tunnel-url" value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
        <input style={inputStyle} placeholder="API key" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save() }} />
        <button onClick={save} disabled={saving || !apiUrl.trim() || !apiKey.trim()} className="btn btn-primary" style={{ fontSize: '0.72rem', alignSelf: 'flex-start' }}>
          {saving ? 'Saving…' : 'Save connection'}
        </button>
      </div>
      {err && <div style={{ fontSize: '0.68rem', color: 'var(--rose)', marginTop: '0.5rem' }}>{err}</div>}
    </div>
  )
}

export default function CompanionSync({ userId, userEmail }: { userId: string; userEmail: string }) {
  const sync = useCompanionSync()
  const partnerEmail = sync.partner?.email ?? null

  function confirmRowFor(item: { id: string; youConfirmed: boolean; partnerConfirmed: boolean }, type: ConfirmableType, label?: string) {
    return (
      <ConfirmRow
        youConfirmed={item.youConfirmed}
        partnerConfirmed={item.partnerConfirmed}
        partnerEmail={partnerEmail}
        busy={sync.confirming === item.id}
        onConfirm={() => sync.confirm(type, item.id)}
        actionLabel={label}
      />
    )
  }

  if (sync.loading) return null
  if (sync.needsPair) return <PairGate userId={userId} userEmail={userEmail} />
  if (sync.needsConnection) return <ConnectionSetup onSave={sync.saveConnection} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '1.4rem' }}>
      {sync.degraded && (
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8 }}>
          Companion sync is quiet for now — check back soon.
        </div>
      )}

      {/* Check-ins */}
      <div>
        <div style={sectionLabel}>Weekly check-ins</div>
        {sync.checkins.length === 0 ? (
          <div style={emptyStyle}>Not reviewed yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
            {sync.checkins.map((c: Checkin) => (
              <div key={c.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500, flex: 1 }}>Week of {fmt(c.weekOf)}</span>
                  <span style={{
                    fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: c.status === 'completed' ? 'var(--emerald)' : 'var(--muted)',
                  }}>{c.status}</span>
                </div>
                {c.summary && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>{c.summary}</div>}
                {confirmRowFor(c, 'checkin')}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tracked items */}
      <div>
        <div style={sectionLabel}>Watching &amp; playing together</div>
        {sync.trackedItems.length === 0 ? (
          <div style={emptyStyle}>Nothing tracked yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem' }}>
            {sync.trackedItems.map((t: TrackedItem) => (
              <div key={t.id} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  <span aria-hidden style={{ fontSize: '0.78rem', color: 'var(--gold)' }}>{t.type === 'gaming' ? '◈' : '◎'}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500, flex: 1 }}>{t.title}</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.8 }}>{t.status}</div>
                {confirmRowFor(t, 'tracked_item')}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date night ideas */}
      <div>
        <div style={sectionLabel}>Date night ideas</div>
        {sync.dateNightIdeas.length === 0 ? (
          <div style={emptyStyle}>Nothing suggested yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
            {sync.dateNightIdeas.map((d: DateNightIdea) => (
              <div key={d.id} style={cardStyle}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500 }}>{d.title}</span>
                {d.notes && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }}>{d.notes}</div>}
                {confirmRowFor(d, 'date_night', "I'm in")}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* On this day */}
      <div>
        <div style={sectionLabel}>On this day</div>
        {sync.onThisDay.length === 0 ? (
          <div style={emptyStyle}>Quiet for now.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.6rem' }}>
            {sync.onThisDay.map((o: OnThisDay) => (
              <div key={o.id} style={cardStyle}>
                <div style={{ fontSize: '0.62rem', color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {o.yearsAgo} year{o.yearsAgo === 1 ? '' : 's'} ago
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5 }}>{o.text}</div>
                {confirmRowFor(o, 'on_this_day', 'Seen it')}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photos — display only, no confirmation workflow */}
      <div>
        <div style={sectionLabel}>Photos</div>
        {sync.photos.length === 0 ? (
          <div style={emptyStyle}>No photos yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
            {sync.photos.map(p => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer" style={{
                display: 'block', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)',
                aspectRatio: '1', position: 'relative', background: 'var(--surface2)',
              }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption || 'shared photo'} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
