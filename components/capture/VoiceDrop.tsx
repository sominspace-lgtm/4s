'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { useHousehold } from '@/lib/hooks/useHousehold'
import { useCareLog } from '@/lib/hooks/useCareLog'
import { useEvents } from '@/lib/hooks/useEvents'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useNotes } from '@/lib/hooks/useNotes'
import Icon from '@/components/ui/Icon'

// Voice drop (2026-09-08) — hold the mic, say one line ("we're out of
// coffee and Somi barely ate"), and it splits into actions you confirm
// before anything is filed. Transcription is the browser's own speech API
// (nothing leaves the device); parsing is /api/ai, which falls back to a
// plain note when AI isn't configured. Where speech isn't supported, the
// same box takes typed text.

interface CaptureAction {
  type: 'shopping' | 'care' | 'event' | 'task' | 'note'
  label: string
  name?: string | null
  qty?: string | null
  category?: string | null
  subject?: 'somi' | 'self' | 'home' | null
  careKind?: string | null
  note?: string | null
  title?: string | null
  date?: string | null
  time?: string | null
  energy?: 'light' | 'medium' | 'deep' | null
  text?: string | null
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function getRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null
  const Ctor = (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike })
  const R = Ctor.SpeechRecognition ?? Ctor.webkitSpeechRecognition
  return R ? new R() : null
}

export default function VoiceDrop({ spaceId, compact = false }: { spaceId: string | null; compact?: boolean }) {
  const h = useHousehold(spaceId)
  const somi = useCareLog('somi')
  const self = useCareLog('self')
  const home = useCareLog('home')
  const events = useEvents()
  const work = useWorkItems()
  const notes = useNotes(null)

  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [actions, setActions] = useState<CaptureAction[] | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const recRef = useRef<SpeechRecognitionLike | null>(null)
  const speechOk = useRef(false)

  useEffect(() => { speechOk.current = !!getRecognition() }, [])

  const stopListening = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  const startListening = useCallback(() => {
    const rec = getRecognition()
    if (!rec) return
    recRef.current = rec
    rec.lang = 'en-US'
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = e => {
      let full = ''
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript
      setText(full)
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => setListening(false)
    setActions(null); setStatus(null); setText('')
    rec.start()
    setListening(true)
  }, [])

  useEffect(() => () => { recRef.current?.stop() }, [])

  async function parse() {
    const t = text.trim()
    if (!t) return
    stopListening()
    setBusy(true); setStatus(null)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'route-capture', text: t }),
      })
      if (res.ok) {
        const { result } = await res.json() as { result: { actions: CaptureAction[] } }
        const list = Array.isArray(result?.actions) ? result.actions : []
        setActions(list.length ? list : [{ type: 'note', label: t, text: t }])
      } else {
        // 503 not-configured / 502 — file it as a note
        setActions([{ type: 'note', label: t, text: t }])
      }
    } catch {
      setActions([{ type: 'note', label: t, text: t }])
    } finally {
      setBusy(false)
    }
  }

  const careHook = (s: CaptureAction['subject']) => (s === 'self' ? self : s === 'home' ? home : somi)

  async function runAction(a: CaptureAction) {
    switch (a.type) {
      case 'shopping':
        return h.addShopping((a.name || a.label).slice(0, 120), a.qty ?? null, a.category ?? null)
      case 'care':
        return careHook(a.subject).log((a.careKind || 'note').slice(0, 40), { note: a.note ?? a.label })
      case 'event':
        return events.add((a.title || a.label).slice(0, 160), a.date || format(new Date(), 'yyyy-MM-dd'), a.note ?? null, a.time ?? null)
      case 'task':
        return work.add({
          title: (a.title || a.label).slice(0, 160), notes: a.note ?? null,
          due_date: a.date ?? null, energy: a.energy ?? null, domain: null, recur_days: null,
        })
      case 'note':
      default:
        return notes.add({ body: (a.text || a.label).slice(0, 4000) })
    }
  }

  async function addAll() {
    if (!actions) return
    setBusy(true)
    for (const a of actions) { try { await runAction(a) } catch { /* keep going */ } }
    setBusy(false)
    setStatus(`Filed ${actions.length} ${actions.length === 1 ? 'thing' : 'things'}.`)
    setActions(null); setText('')
    setTimeout(() => { setOpen(false); setStatus(null) }, 1400)
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); if (speechOk.current) startListening() }}
        className="press" aria-label="Voice drop"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem', minHeight: 32,
          padding: '0.3rem 0.6rem', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit',
          background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)', fontSize: '0.7rem',
        }}
      >
        <Icon name="mic" size={13} />
        {!compact && 'Say it'}
      </button>
    )
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
      padding: '0.7rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', flex: 1 }}>
          {listening ? 'Listening…' : busy ? 'Reading it…' : 'Say or type one line'}
        </span>
        <button onClick={() => { stopListening(); setOpen(false); setActions(null); setText('') }}
          aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.8rem' }}>✕</button>
      </div>

      <textarea
        value={text} onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); parse() } }}
        rows={2}
        placeholder="we're out of coffee, and Somi barely ate today"
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit',
          background: 'var(--surface2, var(--bg))', border: '1px solid var(--border)', borderRadius: 8,
          padding: '0.45rem 0.6rem', fontSize: '0.78rem', color: 'var(--text)', outline: 'none',
        }}
      />

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {speechOk.current && (
          <button onClick={() => (listening ? stopListening() : startListening())} className="press"
            style={pill(listening)}>
            <Icon name="mic" size={12} /> {listening ? 'Stop' : 'Speak'}
          </button>
        )}
        <button onClick={parse} disabled={!text.trim() || busy} className="press"
          style={{ ...pill(false), opacity: !text.trim() || busy ? 0.5 : 1 }}>
          Read it
        </button>
      </div>

      {actions && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {actions.length === 0 && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic' }}>Nothing to file.</div>}
          {actions.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.74rem',
              background: 'var(--surface2, var(--bg))', border: '1px solid var(--faint)', borderRadius: 8, padding: '0.35rem 0.5rem',
            }}>
              <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', width: '3.6rem', flexShrink: 0 }}>{a.type}</span>
              <span style={{ flex: 1, color: 'var(--text)' }}>{a.label}</span>
              <button onClick={() => setActions(actions.filter((_, j) => j !== i))} aria-label="Drop"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.5, fontSize: '0.62rem' }}>✕</button>
            </div>
          ))}
          {actions.length > 0 && (
            <button onClick={addAll} disabled={busy} className="press"
              style={{ ...pill(true), justifyContent: 'center', opacity: busy ? 0.5 : 1 }}>
              Add {actions.length === 1 ? 'it' : 'all'}
            </button>
          )}
        </div>
      )}

      {status && <div style={{ fontSize: '0.72rem', color: 'var(--emerald)' }}>{status}</div>}
    </div>
  )
}

function pill(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem', minHeight: 32,
    padding: '0.35rem 0.7rem', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.72rem',
    border: `1px solid ${active ? 'var(--emerald)' : 'var(--border)'}`,
    background: active ? 'color-mix(in srgb, var(--emerald) 14%, transparent)' : 'var(--surface)',
    color: active ? 'var(--emerald)' : 'var(--text)',
  }
}
