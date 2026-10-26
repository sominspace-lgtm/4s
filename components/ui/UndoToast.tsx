'use client'

import { useEffect, useRef, useState } from 'react'
import { UNDO_EVENT, type UndoRequest } from '@/lib/ui/undo'

// The Undo bar (2026-10-26). See lib/ui/undo.ts.

const WAIT = 5000

export default function UndoToast() {
  const [item, setItem] = useState<(UndoRequest & { key: number }) | null>(null)
  const pending = useRef<(UndoRequest & { key: number }) | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function flush() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const p = pending.current
    pending.current = null
    if (p) { try { void p.commit() } catch { /* the caller reports its own errors */ } }
  }

  useEffect(() => {
    function on(e: Event) {
      flush()
      const next = { ...(e as CustomEvent<UndoRequest>).detail, key: Date.now() }
      pending.current = next
      setItem(next)
      timer.current = setTimeout(() => { flush(); setItem(null) }, WAIT)
    }
    // Leaving the page finishes what was waiting, so nothing is lost or kept by accident.
    const onHide = () => flush()
    window.addEventListener(UNDO_EVENT, on)
    window.addEventListener('pagehide', onHide)
    return () => { window.removeEventListener(UNDO_EVENT, on); window.removeEventListener('pagehide', onHide); flush() }
  }, [])

  function undo() {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    const p = pending.current
    pending.current = null
    setItem(null)
    p?.onUndo?.()
  }

  if (!item) return null
  return (
    <div role="status" style={{
      position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: 900,
      bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', width: 'min(420px, calc(100vw - 32px))',
      background: 'var(--text)', color: 'var(--bg)', borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 12px 30px -10px rgba(0,0,0,0.45)', fontFamily: 'var(--font-body)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0.6rem 0.55rem 1rem' }}>
        <span style={{ flex: 1, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
        <button onClick={undo} className="press" style={{ minHeight: 40, padding: '0 0.9rem', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'color-mix(in srgb, var(--bg) 18%, transparent)', color: 'var(--bg)', fontSize: '0.88rem', fontWeight: 600, fontFamily: 'var(--font-body)' }}>Undo</button>
      </div>
      <div key={item.key} style={{ height: 3, background: 'var(--gold)', animation: `undo-shrink ${WAIT}ms linear forwards`, transformOrigin: 'left' }} />
      <style>{'@keyframes undo-shrink { from { transform: scaleX(1) } to { transform: scaleX(0) } }'}</style>
    </div>
  )
}
