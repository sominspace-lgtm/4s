'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

function pad(n: number) { return String(n).padStart(2, '0') }

export default function TimerWidget() {
  const [preset,  setPreset]  = useState(25)
  const [seconds, setSeconds] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current)
    setRunning(false)
  }, [])

  useEffect(() => {
    if (!running) return
    interval.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { stop(); setFinished(true); return 0 }
        return s - 1
      })
    }, 1000)
    return stop
  }, [running, stop])

  function changePreset(mins: number) {
    setPreset(mins); stop(); setSeconds(mins * 60); setFinished(false)
  }

  function start() { setSeconds(preset * 60); setFinished(false); setRunning(true) }
  function reset() { stop(); setSeconds(preset * 60); setFinished(false) }

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const pct = 1 - seconds / (preset * 60)
  const circumference = 2 * Math.PI * 30

  return (
    <div className="card-interactive" style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px',
      padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
    }}>
      <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
        <svg width="76" height="76" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="38" cy="38" r="30" fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle
            cx="38" cy="38" r="30" fill="none"
            stroke={finished ? 'var(--emerald)' : 'var(--gold)'} strokeWidth="3"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {finished
            ? <span style={{ fontSize: '1.1rem' }}>✓</span>
            : <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', color: 'var(--text)' }}>{pad(mins)}:{pad(secs)}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {[15, 25, 45, 60].map(m => (
            <button key={m} onClick={() => changePreset(m)} style={{
              padding: '0.2rem 0.55rem', borderRadius: '6px', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '0.65rem',
              border: `1px solid ${preset === m ? 'var(--gold)' : 'var(--border)'}`,
              background: preset === m ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
              color: preset === m ? 'var(--gold)' : 'var(--muted)',
            }}>{m}m</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {!running && !finished && (
            <button onClick={start} className="btn btn-primary" style={{ fontSize: '0.68rem', padding: '0.3em 0.9em' }}>start</button>
          )}
          {running && (
            <button onClick={stop} className="btn btn-secondary" style={{ fontSize: '0.68rem', padding: '0.3em 0.9em' }}>pause</button>
          )}
          {(seconds < preset * 60) && (
            <button onClick={reset} className="btn btn-ghost" style={{ fontSize: '0.68rem', padding: '0.3em 0.9em' }}>reset</button>
          )}
        </div>
      </div>
    </div>
  )
}
