'use client'

import { useEffect, useRef, useState } from 'react'

// The Places feature's shared sheet primitive (2026-08-12).
//
// There is no global Sheet component in this codebase — ConnectPanel and
// CustomizePanel each hand-roll their own right-side drawer. Rather than
// invent a global primitive as a side effect of this feature, this is a
// local one used by PlaceSheet, TripDetail and TravelAssistantPanel only.
//
// Desktop (>=768px): a direct copy of ConnectPanel's right-side drawer.
// Mobile (<768px): a bottom sheet — translateY, a drag handle, drag-down to
// dismiss past a 60px threshold, sitting above the bottom nav (same z-index
// tier as CustomizePanel/ConnectPanel: 199/200) so an open sheet doesn't
// leave the nav eating thumb space underneath it.
export default function PlacesSheet({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)

  useEffect(() => {
    function check() { setIsMobile(window.innerWidth < 768) }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open, onClose])

  // dragY resets to 0 in onTouchEnd on every drag, so it's already 0 by the
  // time a normal close happens — no open-triggered reset effect needed. The
  // one gap (closed via backdrop/✕ mid-drag) is a one-frame cosmetic offset
  // on next open, not worth an effect for.
  function onTouchStart(e: React.TouchEvent) { dragStart.current = e.touches[0].clientY }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStart.current == null) return
    const delta = e.touches[0].clientY - dragStart.current
    if (delta > 0) setDragY(delta)
  }
  function onTouchEnd() {
    if (dragY > 60) onClose()
    setDragY(0)
    dragStart.current = null
  }

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 500,
        maxHeight: '85vh', background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        borderRadius: 'var(--radius) var(--radius) 0 0',
        padding: '0.6rem 1.3rem calc(1.3rem + env(safe-area-inset-bottom))',
        transform: open ? `translateY(${dragY}px)` : 'translateY(100%)',
        transition: dragY ? 'none' : 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto',
      }
    : {
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '340px', zIndex: 200,
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        padding: '1.5rem',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto',
      }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: isMobile ? 499 : 199,
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none',
        transition: 'opacity 0.2s',
      }} />
      <div
        ref={ref}
        style={panelStyle}
        onTouchStart={isMobile ? onTouchStart : undefined}
        onTouchMove={isMobile ? onTouchMove : undefined}
        onTouchEnd={isMobile ? onTouchEnd : undefined}
      >
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.3rem 0' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: 'var(--border)' }} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
        {children}
      </div>
    </>
  )
}
