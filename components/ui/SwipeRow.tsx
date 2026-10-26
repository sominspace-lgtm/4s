'use client'

import { useRef, useState } from 'react'

// Swipe to act (2026-10-26). On a phone, swipe a row right to finish it and
// left for its second action (tomorrow, remove, skip). A drag only counts
// once it is clearly sideways, so scrolling and taps inside still work.

const TRIGGER = 72
const MAX = 110

export default function SwipeRow({ onRight, rightLabel = 'Done', onLeft, leftLabel, disabled = false, children, style, className }: {
  onRight?: () => void
  rightLabel?: string
  onLeft?: () => void
  leftLabel?: string
  disabled?: boolean
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}) {
  const [dx, setDx] = useState(0)
  const start = useRef<{ x: number; y: number } | null>(null)
  const swiping = useRef(false)

  function onTouchStart(e: React.TouchEvent) {
    if (disabled) return
    start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    swiping.current = false
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!start.current) return
    const x = e.touches[0].clientX - start.current.x
    const y = e.touches[0].clientY - start.current.y
    if (!swiping.current) {
      if (Math.abs(x) < 10) return
      if (Math.abs(y) > Math.abs(x)) { start.current = null; return }
      swiping.current = true
    }
    const min = onLeft ? -MAX : 0, max = onRight ? MAX : 0
    setDx(Math.max(min, Math.min(max, x)))
  }
  function onTouchEnd() {
    if (swiping.current) {
      if (dx > TRIGGER) onRight?.()
      else if (dx < -TRIGGER) onLeft?.()
    }
    start.current = null
    swiping.current = false
    setDx(0)
  }

  const armed = Math.abs(dx) > TRIGGER
  const tint = dx > 0 ? 'var(--emerald)' : 'var(--gold)'
  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {dx !== 0 && (
        <div aria-hidden style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
          justifyContent: dx > 0 ? 'flex-start' : 'flex-end', padding: '0 1rem',
          background: `color-mix(in srgb, ${tint} ${armed ? 26 : 12}%, transparent)`,
          color: tint, fontSize: '0.8rem', fontWeight: 500,
        }}>{dx > 0 ? rightLabel : leftLabel}</div>
      )}
      <div
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}
        style={{
          position: 'relative', background: dx !== 0 ? 'var(--surface)' : undefined,
          transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : 'transform 0.2s ease',
          touchAction: 'pan-y',
        }}
      >{children}</div>
    </div>
  )
}
