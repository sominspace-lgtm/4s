'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

// One sheet for every add and edit form (2026-10-21 redesign). On a phone it
// slides up from the bottom, in thumb reach, and the list behind it stays
// put instead of jumping around an inline form. On a wider screen it sits in
// the middle as a card. Tap outside, the ✕, or Escape to close.

export default function Sheet({ open, title, onClose, children, footer }: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  /** Buttons pinned to the bottom of the sheet (Save, Cancel). */
  footer?: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- portals need the DOM, which only exists after mount
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    // Keep the page behind still while the sheet is open.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className="sheet-backdrop" onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 960, background: 'rgba(20, 14, 8, 0.42)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div role="dialog" aria-modal="true" aria-label={title} className="sheet" onClick={e => e.stopPropagation()} style={{
        width: 'min(560px, 100%)', maxHeight: '88dvh', display: 'flex', flexDirection: 'column',
        background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none',
        borderRadius: '22px 22px 0 0', boxShadow: '0 -12px 40px rgba(20, 14, 8, 0.25)',
      }}>
        <div aria-hidden style={{ width: 40, height: 5, borderRadius: 3, background: 'var(--border)', margin: '0.55rem auto 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.4rem 1.1rem 0.2rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--text)' }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ minWidth: 44, minHeight: 44, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1.05rem' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '0.4rem 1.1rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {children}
        </div>
        {footer && (
          <div style={{
            display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center',
            padding: '0.7rem 1.1rem calc(0.7rem + env(safe-area-inset-bottom))', borderTop: '1px solid var(--border)',
          }}>{footer}</div>
        )}
        {!footer && <div style={{ height: 'env(safe-area-inset-bottom)' }} />}
      </div>
    </div>,
    document.body,
  )
}
