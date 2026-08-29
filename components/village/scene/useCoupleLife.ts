'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Sylvia & Harry's day (round 53, 2026-08-28, "figures can wander around the
// map / walk to clicked area and interact / usually still and smiling but
// wander and interact time to time"). Replaces the fixed CSS wander loop
// (village-wander-*, retired) with a small JS state machine:
//
//   still  — the default. Both stand at home, idle pose + periodic smile.
//   wander — every ~15-30s one beat: each picks a random walkable point,
//            strolls there, mills about, comes home.
//   meet   — the other beat: both walk to a gather point (random, or a
//            spot the user tapped) and an interaction pose plays there,
//            a different one each time, then they head home.
//
// Positions are absolute scene coords; the caller renders each figure at
// `pos - home` with a CSS transition sized to `dur`, so the glide reads as
// a walk. `pose` drives which sprite set VillagerShape shows.

export interface FigureLife {
  x: number
  y: number
  pose: 'idle' | 'walk' | 'wave'
  face: 1 | -1
  /** ms for the CSS transform transition to this position. */
  dur: number
}

export interface CoupleLife {
  sylvia: FigureLife
  harry: FigureLife
  together: boolean
  interactPose: number
  interactAt: { x: number; y: number }
  /** Send both to a tapped spot for an interaction, then resume the loop. */
  walkTo: (x: number, y: number) => void
  /** Tapped a single figure — they walk a few steps toward the front,
   *  wave, then head home (round 68). Pose goes 'wave' while they're there. */
  greet: (who: 'sylvia' | 'harry') => void
  /** Which figure is mid-greeting, so the caller can force the wave pose. */
  greeting: 'sylvia' | 'harry' | null
}

const SPEED = 24 // scene units / second — an unhurried stroll (round 55)
const HOME_IF_UNATTENDED_MS = 22_000 // away this long with nothing queued -> walk home

interface Pt { x: number; y: number }

export interface RestSpot { x: number; y: number; frame: number }

export function useCoupleLife(opts: {
  enabled: boolean
  sylviaHome: Pt
  harryHome: Pt
  bounds: { x0: number; x1: number; y0: number; y1: number }
  /** Benches / picnic spot — when the couple gather here they do that
   *  spot's specific interaction instead of a random one (round 59). */
  restSpots?: RestSpot[]
}): CoupleLife {
  const { enabled, sylviaHome, harryHome, bounds, restSpots } = opts
  const restKey = (restSpots ?? []).map(r => `${Math.round(r.x)},${Math.round(r.y)},${r.frame}`).join('|')
  const shx = sylviaHome.x, shy = sylviaHome.y, hhx = harryHome.x, hhy = harryHome.y

  const [sylvia, setSylvia] = useState<FigureLife>({ x: shx, y: shy, pose: 'idle', face: 1, dur: 0 })
  const [harry, setHarry] = useState<FigureLife>({ x: hhx, y: hhy, pose: 'idle', face: 1, dur: 0 })
  const [together, setTogether] = useState(false)
  const [interactPose, setInteractPose] = useState(0)
  const [interactAt, setInteractAt] = useState<Pt>({ x: (shx + hhx) / 2, y: (shy + hhy) / 2 })
  const [greeting, setGreeting] = useState<'sylvia' | 'harry' | null>(null)
  const greetRef = useRef<(who: 'sylvia' | 'harry') => void>(() => {})

  // Live positions + facing, so a move can size its own duration and pick a
  // facing off where the figure actually is without threading React state.
  const liveRef = useRef({ sx: shx, sy: shy, sf: 1 as 1 | -1, hx: hhx, hy: hhy, hf: 1 as 1 | -1 })
  const timers = useRef<number[]>([])
  const meetRef = useRef<(pt: Pt | null) => void>(() => {})

  const clearTimers = () => { timers.current.forEach(t => clearTimeout(t)); timers.current = [] }

  useEffect(() => {
    const clampX = (x: number) => Math.max(bounds.x0, Math.min(bounds.x1, x))
    const clampY = (y: number) => Math.max(bounds.y0, Math.min(bounds.y1, y))
    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    if (!enabled) {
      clearTimers()
      liveRef.current = { sx: shx, sy: shy, sf: 1, hx: hhx, hy: hhy, hf: 1 }
      setSylvia({ x: shx, y: shy, pose: 'idle', face: 1, dur: 0 })
      setHarry({ x: hhx, y: hhy, pose: 'idle', face: 1, dur: 0 })
      setTogether(false)
      return
    }

    let alive = true
    let lastActive = Date.now()
    const at = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(() => { if (alive) fn() }, ms))
    }

    // Move one figure toward (tx,ty); returns the glide duration in ms.
    const walk = (who: 'sylvia' | 'harry', tx: number, ty: number): number => {
      const L = liveRef.current
      const cx = who === 'sylvia' ? L.sx : L.hx
      const cy = who === 'sylvia' ? L.sy : L.hy
      const dist = Math.hypot(tx - cx, ty - cy)
      // Slower now (round 55) — the walk cycle sells a stroll, not a dash.
      const dur = dist < 3 ? 0 : Math.max(600, Math.min(6500, (dist / SPEED) * 1000))
      // Face the way we're about to move (round 55, fixed round 56 — the
      // walk art faces RIGHT natively, so moving right is scale 1 and
      // moving left is the mirror). A hair either side of dead-ahead is
      // enough to commit.
      const curFace = who === 'sylvia' ? L.sf : L.hf
      const face: 1 | -1 = tx > cx + 0.5 ? 1 : tx < cx - 0.5 ? -1 : curFace
      if (who === 'sylvia') { L.sx = tx; L.sy = ty; L.sf = face } else { L.hx = tx; L.hy = ty; L.hf = face }
      const set = who === 'sylvia' ? setSylvia : setHarry
      set(pr => ({ x: tx, y: ty, pose: dist < 3 ? pr.pose : 'walk', face, dur }))
      if (dist >= 3) { lastActive = Date.now(); at(dur, () => set(pr => ({ ...pr, pose: 'idle', dur: 0 }))) }
      return dur
    }

    const atHome = () => {
      const L = liveRef.current
      return Math.hypot(L.sx - shx, L.sy - shy) < 4 && Math.hypot(L.hx - hhx, L.hy - hhy) < 4
    }

    const goHome = () => {
      setTogether(false)
      walk('sylvia', shx, shy)
      walk('harry', hhx, hhy)
    }

    const wander = () => {
      const sd = walk('sylvia', clampX(shx + rand(-180, 180)), clampY(shy + rand(-8, 60)))
      const hd = walk('harry', clampX(hhx + rand(-180, 180)), clampY(hhy + rand(-8, 60)))
      at(Math.max(sd, hd) + rand(3500, 8000), () => {
        if (Math.random() < 0.5) {
          walk('sylvia', clampX(liveRef.current.sx + rand(-60, 60)), clampY(liveRef.current.sy + rand(-18, 18)))
          walk('harry', clampX(liveRef.current.hx + rand(-60, 60)), clampY(liveRef.current.hy + rand(-18, 18)))
        }
        at(rand(3000, 6000), () => { goHome(); at(4600, loop) })
      })
    }

    const spots = restSpots ?? []
    const nearSpot = (x: number, y: number): RestSpot | null =>
      spots.find(s => Math.hypot(s.x - x, s.y - y) < 26) ?? null

    const meet = (pt: Pt | null) => {
      // A tapped point near a bench/picnic snaps to it; an idle "meet" beat
      // goes to a rest spot ~45% of the time when there is one.
      let spot: RestSpot | null = null
      let gx: number, gy: number
      if (pt) {
        spot = nearSpot(pt.x, pt.y)
        gx = clampX(spot ? spot.x : pt.x)
        gy = clampY(spot ? spot.y : pt.y)
      } else if (spots.length && Math.random() < 0.45) {
        spot = spots[Math.floor(Math.random() * spots.length)]
        gx = clampX(spot.x); gy = clampY(spot.y)
      } else {
        gx = clampX((shx + hhx) / 2 + rand(-140, 140))
        gy = clampY((shy + hhy) / 2 + rand(-6, 46))
      }
      setInteractAt({ x: gx, y: gy })
      const sd = walk('sylvia', gx - 9, gy)
      const hd = walk('harry', gx + 9, gy)
      at(Math.max(sd, hd) + 250, () => {
        if (spot) setInteractPose(spot.frame)
        else setInteractPose(p => (p >= 9 ? 0 : (p + 1) % 9))
        setTogether(true)
        at(rand(spot ? 8000 : 6000, spot ? 13000 : 10000), () => { setTogether(false); goHome(); at(4600, loop) })
      })
    }
    meetRef.current = meet

    // Tapped a single figure (round 68) — they take a few steps toward the
    // front of the scene, wave there, then walk home. The other figure is
    // left alone. Interrupts whatever they were doing.
    const greet = (who: 'sylvia' | 'harry') => {
      const L = liveRef.current
      const cx = who === 'sylvia' ? L.sx : L.hx
      const cy = who === 'sylvia' ? L.sy : L.hy
      const set = who === 'sylvia' ? setSylvia : setHarry
      const home = who === 'sylvia' ? { x: shx, y: shy } : { x: hhx, y: hhy }
      const tx = clampX(cx + (400 - cx) * 0.25 + rand(-10, 10))
      const ty = clampY(Math.max(cy, bounds.y1 - 12))
      const d = walk(who, tx, ty)
      setGreeting(who)
      at(d + 150, () => {
        set(pr => ({ ...pr, pose: 'wave', dur: 0 }))
        at(1900, () => {
          setGreeting(null)
          const hd = walk(who, home.x, home.y)
          at(hd + 800, loop)
        })
      })
    }
    greetRef.current = greet

    const loop = () => {
      goHome()
      at(rand(13000, 30000), () => {
        if (Math.random() < 0.55) wander()
        else meet(null)
      })
    }

    at(600, loop)

    // Safety net (round 55, "always walk back home if unattended") — if the
    // couple end up away from home and nothing has moved them for a while
    // (a dropped timer, a rapid tap that cut a sequence short), march them
    // home and restart the rhythm.
    const guard = window.setInterval(() => {
      if (!alive) return
      if (!atHome() && Date.now() - lastActive > HOME_IF_UNATTENDED_MS) {
        clearTimers()
        setTogether(false)
        goHome()
        at(5000, loop)
      }
    }, 3000)

    return () => { alive = false; clearTimers(); clearInterval(guard) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, shx, shy, hhx, hhy, bounds.x0, bounds.x1, bounds.y0, bounds.y1, restKey])

  const walkTo = useCallback((x: number, y: number) => {
    if (!enabled) return
    clearTimers()
    setTogether(false)
    meetRef.current({ x, y })
  }, [enabled])

  const greet = useCallback((who: 'sylvia' | 'harry') => {
    if (!enabled) return
    clearTimers()
    setTogether(false)
    greetRef.current(who)
  }, [enabled])

  return { sylvia, harry, together, interactPose, interactAt, walkTo, greet, greeting }
}
