'use client'

import { useEffect, useRef } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const PROMPTS = [
  { label: 'What needs attention?',    run: () => goTo('section-brief') },
  { label: 'What should I do next?',   run: () => goTo('section-brief') },
  { label: 'What was shared with me?', run: () => goTo('section-shared') },
  { label: 'Summarize my week',        run: () => goTo('week-review') },
]

// Not heavy AI yet — routes canned prompts to the existing summaries
// (Brief's Needs Attention / Suggested next action, Shared With Me, Week in
// Review) rather than recomputing anything new.
export default function AskJarvisPanel({ open, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 500, backdropFilter: 'blur(4px)' }} />
      <div ref={ref} style={{
        position: 'fixed', top: '22%', left: '50%', transform: 'translateX(-50%)',
        width: 'min(420px, 92vw)', zIndex: 501,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: '16px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.9rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)' }}>Ask Jarvis</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
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
      </div>
    </>
  )
}
