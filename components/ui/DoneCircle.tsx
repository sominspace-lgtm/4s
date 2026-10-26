'use client'

// The one "done" button every list uses (2026-10-26): tasks, chores,
// shopping. An empty circle, half-filled while something is in progress, and
// a tick that draws itself in when it is done.

export default function DoneCircle({ done, partial = false, onClick, label, size = 30 }: {
  done: boolean
  partial?: boolean
  onClick: () => void
  label: string
  size?: number
}) {
  return (
    <button onClick={onClick} aria-pressed={done} aria-label={label} title={label} className="press" style={{
      width: size, height: size, flexShrink: 0, borderRadius: '50%', cursor: 'pointer', padding: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      border: `1.5px solid ${done || partial ? 'var(--emerald)' : 'var(--border)'}`,
      background: done
        ? 'color-mix(in srgb, var(--emerald) 28%, transparent)'
        : partial ? 'linear-gradient(90deg, color-mix(in srgb, var(--emerald) 22%, transparent) 50%, transparent 50%)' : 'transparent',
      transition: 'background 0.15s, border-color 0.15s',
    }}>
      {done && (
        <svg className="tick" width={size * 0.45} height={size * 0.45} viewBox="0 0 12 12" aria-hidden>
          <path d="M2.5 6.2 L4.9 8.6 L9.5 3.6" fill="none" stroke="var(--emerald)" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}
