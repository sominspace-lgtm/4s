'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Jarvis (2026-10-18): one chat, reachable from every page, that can look at
// your calendar, tasks, email, documents, the weather and food data. Anything
// that would change something comes back as a card with Confirm; nothing is
// added, drafted or ticked off until you tap it. The conversation lives only
// in this tab (session storage), never on the server.

interface Pending { token: string; summary: string; state: 'waiting' | 'busy' | 'done' | 'failed' | 'dismissed'; note?: string; link?: string | null }
interface Msg { role: 'user' | 'assistant'; content: string; pending?: Pending[] }

const KEY = '4s:jarvis-chat'
const SUGGESTIONS = [
  "What's on my calendar today?",
  'Find an hour next week for tennis',
  "What's the weather tomorrow?",
  'Create a task to finish my BloomScan updates',
]

export default function Jarvis() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal target exists only after mount
    setMounted(true)
    try { const raw = sessionStorage.getItem(KEY); if (raw) setMsgs(JSON.parse(raw) as Msg[]) } catch { /* private mode */ }
    const onOpen = () => setOpen(true)
    window.addEventListener('4s:open-jarvis', onOpen)
    return () => window.removeEventListener('4s:open-jarvis', onOpen)
  }, [])
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-40))) } catch { /* private mode */ }
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [msgs, open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function ask(text: string) {
    const t = text.trim()
    if (!t || busy) return
    const next: Msg[] = [...msgs, { role: 'user', content: t }]
    setMsgs(next); setDraft(''); setBusy(true); setErr(null)
    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) }),
      })
      const j = await res.json() as { reply?: string; pending?: { token: string; summary: string }[]; error?: string }
      if (!res.ok) { setErr(j.error ?? 'Jarvis could not answer.'); return }
      setMsgs(m => [...m, {
        role: 'assistant', content: j.reply ?? '',
        pending: (j.pending ?? []).map(p => ({ ...p, state: 'waiting' as const })),
      }])
    } catch { setErr('Could not reach 4S. Check your connection.') }
    finally { setBusy(false) }
  }

  function setPending(mi: number, pi: number, patch: Partial<Pending>) {
    setMsgs(m => m.map((x, i) => (i !== mi ? x : { ...x, pending: x.pending?.map((p, k) => (k === pi ? { ...p, ...patch } : p)) })))
  }

  async function confirm(mi: number, pi: number, p: Pending) {
    setPending(mi, pi, { state: 'busy' })
    try {
      const res = await fetch('/api/jarvis/act', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: p.token }) })
      const j = await res.json() as { ok?: boolean; error?: string; result?: { link?: string | null } }
      if (res.ok && j.ok) {
        setPending(mi, pi, { state: 'done', link: j.result?.link ?? null })
        // A plain note in the conversation, so Jarvis knows it happened.
        setMsgs(m => [...m, { role: 'assistant', content: `Done: ${p.summary}.` }])
      } else setPending(mi, pi, { state: 'failed', note: j.error ?? 'That did not go through.' })
    } catch { setPending(mi, pi, { state: 'failed', note: 'Could not reach 4S. It may not have gone through; check before trying again.' }) }
  }

  const sheet = open && (
    <div role="dialog" aria-modal="true" aria-label="Jarvis" onClick={() => setOpen(false)} style={{
      position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} className="jarvis-sheet" style={{
        background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        width: 'min(440px, 100vw)', height: 'min(640px, 88dvh)', borderRadius: '18px 18px 0 0', margin: 0,
        boxShadow: '0 -8px 40px var(--shadow)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.8rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text)' }}>Jarvis</span>
          <span style={{ display: 'flex', gap: '0.3rem' }}>
            {msgs.length > 0 && <button onClick={() => { setMsgs([]); setErr(null) }} style={chromeBtn}>New chat</button>}
            <button onClick={() => setOpen(false)} aria-label="Close" style={chromeBtn}>✕</button>
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          {msgs.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                Ask about your calendar, tasks, email, documents, the weather, or what is in a food. I will ask before changing anything.
              </div>
              {SUGGESTIONS.map(s => <button key={s} onClick={() => ask(s)} style={suggestBtn}>{s}</button>)}
            </div>
          )}
          {msgs.map((m, mi) => (
            <div key={mi} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {m.content && (
                <div style={{
                  whiteSpace: 'pre-wrap', fontSize: '0.92rem', lineHeight: 1.5, padding: '0.55rem 0.8rem', borderRadius: 14,
                  background: m.role === 'user' ? 'color-mix(in srgb, var(--gold) 16%, var(--surface2))' : 'var(--surface2)', color: 'var(--text)',
                }}>{m.content}</div>
              )}
              {m.pending?.map((p, pi) => (
                <div key={pi} style={{ border: '1px solid color-mix(in srgb, var(--gold) 40%, var(--border))', borderRadius: 12, padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.45 }}>{p.summary}</div>
                  {p.state === 'waiting' && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-primary press" style={{ minHeight: 40 }} onClick={() => confirm(mi, pi, p)}>Confirm</button>
                      <button className="btn btn-ghost press" style={{ minHeight: 40 }} onClick={() => setPending(mi, pi, { state: 'dismissed' })}>No</button>
                    </div>
                  )}
                  {p.state === 'busy' && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Working…</div>}
                  {p.state === 'done' && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--emerald)' }}>
                      Done.{p.link && <> <a href={p.link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)' }}>Open ↗</a></>}
                    </div>
                  )}
                  {p.state === 'failed' && <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>{p.note}</div>}
                  {p.state === 'dismissed' && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Left alone.</div>}
                </div>
              ))}
            </div>
          ))}
          {busy && <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Thinking…</div>}
          {err && <div style={{ fontSize: '0.85rem', color: 'var(--rose)' }}>{err}</div>}
          <div ref={endRef} />
        </div>

        <form onSubmit={e => { e.preventDefault(); void ask(draft) }} style={{ display: 'flex', gap: '0.4rem', padding: '0.7rem 0.8rem calc(0.7rem + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)' }}>
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Ask Jarvis" autoFocus
            style={{ flex: 1, minWidth: 0, minHeight: 44, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', padding: '0 0.8rem', fontSize: '1rem', fontFamily: 'var(--font-body)', outline: 'none' }} />
          <button type="submit" disabled={busy || !draft.trim()} className="btn btn-primary press" style={{ minHeight: 44 }}>Ask</button>
        </form>
      </div>
    </div>
  )

  return (
    <>
      <button className="jarvis-fab press" onClick={() => setOpen(true)} aria-label="Ask Jarvis" title="Ask Jarvis" style={{
        position: 'fixed', right: '1.25rem', zIndex: 480, width: 48, height: 48, borderRadius: '50%',
        border: '1px solid color-mix(in srgb, var(--gold) 45%, var(--border))', background: 'var(--surface)', color: 'var(--gold)',
        fontFamily: 'var(--font-display)', fontSize: '1.15rem', cursor: 'pointer', boxShadow: '0 4px 18px var(--shadow)',
      }}>J</button>
      {mounted && sheet ? createPortal(sheet, document.body) : null}
    </>
  )
}

const chromeBtn: React.CSSProperties = {
  minHeight: 36, minWidth: 36, padding: '0 0.7rem', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent',
  color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)',
}
const suggestBtn: React.CSSProperties = {
  textAlign: 'left', minHeight: 44, padding: '0 0.8rem', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)',
  color: 'var(--text)', cursor: 'pointer', fontSize: '0.88rem', fontFamily: 'var(--font-body)',
}
