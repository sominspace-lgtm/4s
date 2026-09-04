'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Small kitchen timers for the village's Kitchen overlay (2026-09-03).
// Per-device, localStorage only — a timer is a "this oven, right now"
// thing, not shared household state. A short beep on zero (WebAudio, same
// approach as Kitchen Cheat Sheet's Timers view).

export interface KitchenTimer {
  id: string
  label: string
  /** Total seconds the timer was set to. */
  total: number
  /** Seconds remaining. */
  left: number
  running: boolean
  /** Set once it hits zero, cleared on reset — drives the "done" state. */
  rang: boolean
}

const KEY = '4s:kitchen-timers'

function load(): KitchenTimer[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw.map((t: Partial<KitchenTimer>) => ({ ...t, running: false } as KitchenTimer)).filter(t => t.id && t.total > 0)
  } catch { return [] }
}

function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.setValueAtTime(0.001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9)
    o.start()
    o.stop(ctx.currentTime + 0.95)
    o.onended = () => ctx.close()
  } catch { /* no audio, no problem */ }
}

export function useKitchenTimers() {
  const [timers, setTimers] = useState<KitchenTimer[]>([])
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setTimers(load()) }, [])
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(timers)) } catch { /* ignore */ }
  }, [timers])

  useEffect(() => {
    const anyRunning = timers.some(t => t.running && t.left > 0)
    if (anyRunning && !tick.current) {
      tick.current = setInterval(() => {
        setTimers(prev => prev.map(t => {
          if (!t.running || t.left <= 0) return t
          const left = t.left - 1
          if (left <= 0) { beep(); return { ...t, left: 0, running: false, rang: true } }
          return { ...t, left }
        }))
      }, 1000)
    } else if (!anyRunning && tick.current) {
      clearInterval(tick.current); tick.current = null
    }
    return () => { if (tick.current && !timers.some(t => t.running && t.left > 0)) { clearInterval(tick.current); tick.current = null } }
  }, [timers])

  const add = useCallback((label: string, seconds: number) => {
    if (seconds <= 0) return
    setTimers(prev => [...prev, {
      id: crypto.randomUUID(), label: label.trim() || 'Timer',
      total: seconds, left: seconds, running: true, rang: false,
    }])
  }, [])
  const start = useCallback((id: string) => setTimers(p => p.map(t => (t.id === id && t.left > 0 ? { ...t, running: true, rang: false } : t))), [])
  const pause = useCallback((id: string) => setTimers(p => p.map(t => (t.id === id ? { ...t, running: false } : t))), [])
  const reset = useCallback((id: string) => setTimers(p => p.map(t => (t.id === id ? { ...t, left: t.total, running: false, rang: false } : t))), [])
  const remove = useCallback((id: string) => setTimers(p => p.filter(t => t.id !== id)), [])

  return { timers, add, start, pause, reset, remove }
}
