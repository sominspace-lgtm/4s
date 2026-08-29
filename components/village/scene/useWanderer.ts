'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// A single free-roaming figure (round 65, "allow somi to wander") — the
// same idea as useCoupleLife's state machine, pared down for one actor with
// no meet/interact beat: idle at home, then every so often pick a random
// walkable point, stroll there, mill about, wander once more or head home.
// Somi was on a fixed 90s CSS loop with one 15px amble (round 58); this
// lets her actually cover ground the way Sylvia and Harry do.
//
// Position is absolute scene coords; the caller renders the figure at
// `pos - home` with a CSS transform transition sized to `dur`, so the glide
// reads as a walk, and swaps to the walk-pose sprite set while `pose` is
// 'walk'.

export interface WandererLife {
  x: number
  y: number
  pose: 'idle' | 'walk'
  face: 1 | -1
  dur: number
}

const SPEED = 20 // scene units / second — a cat's unhurried pad

export function useWanderer(opts: {
  enabled: boolean
  home: { x: number; y: number }
  bounds: { x0: number; x1: number; y0: number; y1: number }
  /** Fraction of each beat spent simply sitting (0..1). Somi sits a lot. */
  restfulness?: number
}): WandererLife & { walkTo: (x: number, y: number) => void } {
  const { enabled, bounds } = opts
  const hx = opts.home.x, hy = opts.home.y
  const rest = opts.restfulness ?? 0.6

  const [life, setLife] = useState<WandererLife>({ x: hx, y: hy, pose: 'idle', face: 1, dur: 0 })
  const pos = useRef({ x: hx, y: hy, f: 1 as 1 | -1 })
  const timers = useRef<number[]>([])
  const walkToRef = useRef<(x: number, y: number) => void>(() => {})
  const clearTimers = () => { timers.current.forEach(t => clearTimeout(t)); timers.current = [] }

  useEffect(() => {
    const clampX = (x: number) => Math.max(bounds.x0, Math.min(bounds.x1, x))
    const clampY = (y: number) => Math.max(bounds.y0, Math.min(bounds.y1, y))
    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    if (!enabled) {
      clearTimers()
      pos.current = { x: hx, y: hy, f: 1 }
      setLife({ x: hx, y: hy, pose: 'idle', face: 1, dur: 0 })
      return
    }

    let alive = true
    const at = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(() => { if (alive) fn() }, ms))
    }

    const walk = (tx: number, ty: number): number => {
      const P = pos.current
      const dist = Math.hypot(tx - P.x, ty - P.y)
      const dur = dist < 3 ? 0 : Math.max(500, Math.min(5000, (dist / SPEED) * 1000))
      const face: 1 | -1 = tx > P.x + 0.5 ? 1 : tx < P.x - 0.5 ? -1 : P.f
      pos.current = { x: tx, y: ty, f: face }
      setLife({ x: tx, y: ty, pose: dist < 3 ? 'idle' : 'walk', face, dur })
      if (dist >= 3) at(dur, () => setLife(pr => ({ ...pr, pose: 'idle', dur: 0 })))
      return dur
    }

    const loop = () => {
      // Sit a while, then move (round 70 "figures are not moving" — shorter
      // sits so she visibly roams).
      at(rand(3500, 9000) * (0.6 + rest * 0.6), () => {
        if (Math.random() < rest * 0.3) { loop(); return } // sometimes just keep sitting
        const d1 = walk(clampX(pos.current.x + rand(-160, 160)), clampY(pos.current.y + rand(-24, 24)))
        at(d1 + rand(2000, 5000), () => {
          // A second short hop, or amble back toward home.
          const goHome = Math.random() < 0.5
          const tx = goHome ? hx + rand(-20, 20) : clampX(pos.current.x + rand(-70, 70))
          const ty = goHome ? hy + rand(-8, 8) : clampY(pos.current.y + rand(-16, 16))
          const d2 = walk(tx, ty)
          at(d2 + rand(1500, 4000), loop)
        })
      })
    }
    at(800, loop)

    // Tapped — pad over to the point, pause, then resume wandering (round
    // 68). Used to send Somi toward the front when she's clicked.
    walkToRef.current = (tx: number, ty: number) => {
      clearTimers()
      const d = walk(clampX(tx), clampY(ty))
      at(d + 1600, () => { const b = walk(hx + rand(-16, 16), hy + rand(-6, 6)); at(b + 900, loop) })
    }

    return () => { alive = false; clearTimers() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, hx, hy, bounds.x0, bounds.x1, bounds.y0, bounds.y1, rest])

  const walkTo = useCallback((x: number, y: number) => {
    if (enabled) walkToRef.current(x, y)
  }, [enabled])

  return { ...life, walkTo }
}
