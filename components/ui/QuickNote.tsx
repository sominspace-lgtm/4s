'use client'

import { useEffect, useState } from 'react'
import CaptureBox from '@/components/capture/CaptureBox'

// The fast way to get a thought out of your head — ⌘K, the + button, the
// `c` key, the village mailbox all open this. The smart add itself lives in
// CaptureBox (2026-10-27), shared with the box on Today; this is the sheet
// around it. (Was "Quick Capture" writing to a separate `captures` table
// with an Inbox to triage; folded into Notes 2026-09-04.)
export default function QuickNote() {
  const [open, setOpen] = useState(false)
  // A fresh box every time it opens, with any words it was opened with.
  const [seed, setSeed] = useState({ n: 0, text: '' })

  useEffect(() => {
    function openFresh() {
      setOpen(o => !o)
      setSeed(s => ({ n: s.n + 1, text: '' }))
    }
    // Search and others can open it with words already in it (2026-10-26).
    function forceOpen(e: Event) {
      const pre = (e as CustomEvent<{ text?: string } | undefined>).detail?.text
      setOpen(true)
      setSeed(s => ({ n: s.n + 1, text: pre ?? '' }))
    }
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openFresh() }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handle)
    window.addEventListener('app:open-quick-capture', openFresh)
    // The mailbox / the Today "New note" button fire this — always open,
    // never toggle shut.
    window.addEventListener('app:focus-capture', forceOpen)
    return () => {
      window.removeEventListener('keydown', handle)
      window.removeEventListener('app:open-quick-capture', openFresh)
      window.removeEventListener('app:focus-capture', forceOpen)
    }
  }, [])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick note"
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'var(--scrim-modal)', backdropFilter: 'blur(6px)',
      }}
    >
      {/* Top-anchored, not centered — a vertically centered dialog is the one
          place a phone keyboard reliably covers. */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', top: '12%', left: '50%', transform: 'translateX(-50%)',
          width: 'min(540px, calc(100vw - 2rem))',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '20px', overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        }}
      >
        <CaptureBox key={seed.n} initialText={seed.text} autoFocus
          onSaved={() => setTimeout(() => setOpen(false), 900)} onEscape={() => setOpen(false)} />
      </div>
    </div>
  )
}
