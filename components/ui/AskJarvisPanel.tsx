'use client'

import { useEffect, useRef, useState } from 'react'
import { goToSection } from '@/lib/utils/navigate'
import { useAppSnapshot } from '@/lib/hooks/useAppSnapshot'

interface Props {
  open: boolean
  userId: string
  calendarConnected?: boolean
  onClose: () => void
}

const PROMPTS = [
  { label: 'What needs attention?',    run: () => goToSection('brief') },
  { label: 'What was shared with me?', run: () => goToSection('shared') },
  { label: 'Summarize my week',        run: () => goToSection('week-review') },
]

// Free-text questions go to /api/ai with a compact snapshot of the dashboard
// (counts, titles, dates — no note bodies). If the AI route is unavailable,
// the canned prompts below still navigate to the right summaries.
export default function AskJarvisPanel({ open, userId, calendarConnected = false, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const buildSnapshot = useAppSnapshot(userId, calendarConnected)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'unavailable'>('idle')

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) {
      document.addEventListener('mousedown', handle)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  async function ask() {
    const q = question.trim()
    if (!q || status === 'loading') return
    setStatus('loading')
    setAnswer(null)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'jarvis', question: q, snapshot: buildSnapshot() }),
      })
      if (res.status === 503) { setStatus('unavailable'); return }
      if (!res.ok) { setStatus('error'); return }
      const data = await res.json()
      setAnswer(typeof data.result === 'string' ? data.result : null)
      setStatus(typeof data.result === 'string' ? 'idle' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (!open) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500, backdropFilter: 'blur(4px)' }} />
      <div ref={ref} style={{
        position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
        width: 'min(460px, 92vw)', zIndex: 501,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)' }}>✦ Ask Jarvis</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        {/* Free-text question */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.6rem' }}>
          <input
            ref={inputRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') ask() }}
            placeholder="Ask about your day, tasks, money…"
            style={{
              flex: 1, minWidth: 0, background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: '9px', padding: '0.55rem 0.8rem', color: 'var(--text)',
              fontFamily: 'var(--font-body)', fontSize: '0.8rem', outline: 'none',
            }}
          />
          <button onClick={ask} disabled={status === 'loading' || !question.trim()} className="btn btn-primary" style={{ fontSize: '0.72rem' }}>
            {status === 'loading' ? '…' : 'Ask'}
          </button>
        </div>

        {status === 'loading' && (
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', padding: '0.3rem 0 0.6rem' }}>Reading your dashboard…</div>
        )}
        {status === 'unavailable' && (
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.6, padding: '0.3rem 0 0.6rem' }}>
            AI isn&rsquo;t configured yet — add an <code style={{ fontSize: '0.65rem' }}>ANTHROPIC_API_KEY</code> to enable questions. The shortcuts below still work.
          </div>
        )}
        {status === 'error' && (
          <div style={{ fontSize: '0.72rem', color: 'var(--rose)', padding: '0.3rem 0 0.6rem' }}>
            Couldn&rsquo;t get an answer right now — try again in a moment.
          </div>
        )}
        {answer && (
          <div style={{
            fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.65, fontWeight: 300,
            background: 'var(--hover-bg)', border: '1px solid var(--border)', borderRadius: '10px',
            padding: '0.8rem 0.95rem', marginBottom: '0.7rem', whiteSpace: 'pre-wrap',
          }}>
            {answer}
          </div>
        )}

        <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.75, margin: '0.4rem 0 0.4rem' }}>Shortcuts</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {PROMPTS.map(p => (
            <button
              key={p.label}
              onClick={() => { p.run(); onClose() }}
              className="btn btn-secondary"
              style={{ textAlign: 'left', fontSize: '0.78rem', padding: '0.65rem 0.9rem' }}
            >{p.label}</button>
          ))}
        </div>

        <div style={{ marginTop: '0.8rem', fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.7, lineHeight: 1.5 }}>
          Answers use a summary of your dashboard (counts, titles, dates) — never your note contents.
        </div>
      </div>
    </>
  )
}
