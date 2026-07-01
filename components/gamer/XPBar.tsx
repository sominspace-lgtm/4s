'use client'

import { XP_PER_LEVEL, useXP } from '@/lib/hooks/useXP'

export default function XPBar({ onGainRef }: { onGainRef?: (fn: (n: number) => void) => void }) {
  const { xp, level, progress, flash } = useXP(true)

  // expose gain fn via ref callback so parent can trigger XP gains
  // (not needed here — XPBar is display only; gains happen in hooks)

  const pct = (progress / XP_PER_LEVEL) * 100

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
      {/* Level badge */}
      <div style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: '6px',
        background: 'color-mix(in srgb, var(--gold) 15%, var(--surface2))',
        border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.6rem', color: 'var(--gold)', fontWeight: 600, letterSpacing: '0.02em',
      }}>
        {level}
      </div>

      {/* XP bar */}
      <div style={{ flex: 1, minWidth: 60, maxWidth: 120 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
          <span style={{ fontSize: '0.5rem', color: 'var(--muted)', opacity: 0.6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>XP</span>
          <span style={{ fontSize: '0.5rem', color: 'var(--gold)', opacity: 0.8 }}>{progress}/{XP_PER_LEVEL}</span>
        </div>
        <div style={{ height: 4, background: 'var(--surface2)', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '99px',
            background: 'linear-gradient(90deg, var(--gold), var(--amber))',
            width: `${pct}%`, transition: 'width 0.4s ease',
          }} />
        </div>
      </div>

      {/* Flash animation */}
      {flash !== null && (
        <span style={{
          fontSize: '0.62rem', color: 'var(--gold)', fontWeight: 600,
          animation: 'xpflash 1.8s ease forwards',
          position: 'absolute', pointerEvents: 'none',
        }}>
          +{flash} XP
        </span>
      )}

      <style>{`
        @keyframes xpflash {
          0%   { opacity: 1; transform: translateY(0); }
          80%  { opacity: 0.8; transform: translateY(-12px); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
      `}</style>
    </div>
  )
}
