'use client'

import { useEffect, useState } from 'react'
import type { SharedWish } from '@/lib/wishlist/share'

// The list on a shared-wishlist page. "I'll get this" asks for an optional
// first name, and keeps the private key it gets back in this browser so the
// same person can take it back later. Nobody else can.

const STORE_KEY = '4s-wish-claims'
const money = (n: number | null) => (n == null ? '' : `$${n % 1 === 0 ? n : n.toFixed(2)}`)

function readKeys(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}') } catch { return {} }
}

export default function SharedWishlist({ token, wishes }: { token: string; wishes: SharedWish[] }) {
  const [taken, setTaken] = useState<Record<string, boolean>>(() => Object.fromEntries(wishes.map(w => [w.id, w.taken])))
  const [mine, setMine] = useState<Record<string, string>>({})
  const [name, setName] = useState('')
  const [asking, setAsking] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setMine(readKeys())
    try { setName(localStorage.getItem('4s-wish-name') ?? '') } catch { /* private mode */ }
  }, [])

  async function call(body: Record<string, unknown>) {
    const res = await fetch(`/api/w/${token}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    return { ok: res.ok, json: (await res.json().catch(() => ({}))) as { key?: string; error?: string } }
  }

  async function claim(id: string) {
    setBusy(true); setErr(null)
    const { ok, json } = await call({ id, action: 'claim', name })
    setBusy(false)
    if (!ok) { setErr(json.error ?? 'Could not save that.'); if (/already/i.test(json.error ?? '')) setTaken(t => ({ ...t, [id]: true })); return }
    const keys = { ...readKeys(), [id]: json.key! }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(keys)); localStorage.setItem('4s-wish-name', name) } catch { /* private mode */ }
    setMine(keys); setTaken(t => ({ ...t, [id]: true })); setAsking(null)
  }

  async function unclaim(id: string) {
    setBusy(true); setErr(null)
    const { ok, json } = await call({ id, action: 'unclaim', key: mine[id] })
    setBusy(false)
    if (!ok) { setErr(json.error ?? 'Could not undo that.'); return }
    const keys = readKeys(); delete keys[id]
    try { localStorage.setItem(STORE_KEY, JSON.stringify(keys)) } catch { /* private mode */ }
    setMine(keys); setTaken(t => ({ ...t, [id]: false }))
  }

  if (wishes.length === 0) return <p style={{ textAlign: 'center', color: '#8a7d6f', fontSize: '0.9rem' }}>Nothing on this list right now.</p>

  const btn: React.CSSProperties = { fontSize: '0.78rem', padding: '0.45em 1em', borderRadius: '999px', border: '1px solid #cdbf9f', background: '#fffaf0', color: '#4a3f35', cursor: 'pointer', fontFamily: 'inherit' }

  return (
    <div>
      {err && <p style={{ textAlign: 'center', color: '#b0605c', fontSize: '0.82rem' }}>{err}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))', gap: '1rem' }}>
        {wishes.map(w => {
          const isTaken = taken[w.id]
          const isMine = !!mine[w.id]
          const link = w.url && /^https?:\/\//i.test(w.url) ? w.url : null
          return (
            <div key={w.id} style={{ background: '#fffaf0', border: '1px solid #e6dcc6', borderRadius: '14px', overflow: 'hidden', opacity: isTaken && !isMine ? 0.6 : 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ aspectRatio: '4 / 3', background: '#efe6d2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {w.image_url
                  // eslint-disable-next-line @next/next/no-img-element -- arbitrary shop hosts
                  ? <img src={w.image_url} alt="" referrerPolicy="no-referrer" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: '2rem', color: '#c9b999' }}>{w.name.charAt(0).toUpperCase()}</span>}
              </div>
              <div style={{ padding: '0.75rem 0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                <div style={{ fontSize: '0.92rem', lineHeight: 1.3 }}>
                  {link ? <a href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{w.name}</a> : w.name}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#8a7d6f' }}>{[money(w.price), w.store].filter(Boolean).join(' · ')}</div>
                {w.notes && <div style={{ fontSize: '0.76rem', color: '#6d6155', whiteSpace: 'pre-wrap' }}>{w.notes}</div>}
                <div style={{ marginTop: 'auto', paddingTop: '0.4rem' }}>
                  {isMine ? (
                    <button style={btn} disabled={busy} onClick={() => unclaim(w.id)}>You&rsquo;re getting this (undo)</button>
                  ) : isTaken ? (
                    <span style={{ fontSize: '0.76rem', color: '#8a7d6f' }}>Someone has this covered</span>
                  ) : asking === w.id ? (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name (optional)" maxLength={40}
                        style={{ flex: 1, minWidth: '7rem', padding: '0.4em 0.7em', borderRadius: '999px', border: '1px solid #cdbf9f', fontFamily: 'inherit', fontSize: '0.78rem' }} />
                      <button style={btn} disabled={busy} onClick={() => claim(w.id)}>{busy ? '…' : 'Confirm'}</button>
                    </div>
                  ) : (
                    <button style={btn} onClick={() => { setAsking(w.id); setErr(null) }}>I&rsquo;ll get this</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
