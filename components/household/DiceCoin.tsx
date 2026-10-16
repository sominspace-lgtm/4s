'use client'

import { useEffect, useRef, useState } from 'react'

// Settle it (2026-10-15): flip a coin or roll dice, for "who does the dishes"
// and "which one do we watch". A short tumble before the answer lands, so it
// feels like a throw rather than a number appearing.

const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
const rnd = (n: number) => {
  const b = new Uint32Array(1)
  crypto.getRandomValues(b)
  return b[0] % n
}

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem' }
const big: React.CSSProperties = {
  minHeight: 48, flex: 1, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)',
  fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
}

export default function DiceCoin() {
  const [coin, setCoin] = useState<'Heads' | 'Tails' | null>(null)
  const [dice, setDice] = useState<number[]>([])
  const [count, setCount] = useState(2)
  const [rolling, setRolling] = useState<'coin' | 'dice' | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  function tumble(kind: 'coin' | 'dice') {
    if (timer.current) clearInterval(timer.current)
    setRolling(kind)
    let n = 0
    timer.current = setInterval(() => {
      n++
      if (kind === 'coin') setCoin(n % 2 ? 'Heads' : 'Tails')
      else setDice(Array.from({ length: count }, () => rnd(6) + 1))
      if (n >= 9) {
        clearInterval(timer.current!); timer.current = null
        if (kind === 'coin') setCoin(rnd(2) ? 'Heads' : 'Tails')
        else setDice(Array.from({ length: count }, () => rnd(6) + 1))
        setRolling(null)
        try { navigator.vibrate?.(20) } catch { /* not supported */ }
      }
    }, 70)
  }

  const total = dice.reduce((a, b) => a + b, 0)

  return (
    <section style={card}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)', marginBottom: '0.8rem' }}>Settle it</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(12rem, 100%), 1fr))', gap: '0.8rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
          <div aria-live="polite" style={{
            width: 84, height: 84, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'color-mix(in srgb, var(--gold) 18%, var(--surface2))', border: '2px solid color-mix(in srgb, var(--gold) 55%, transparent)',
            color: 'var(--text)', fontSize: '0.9rem', fontFamily: 'var(--font-display)',
            transform: rolling === 'coin' ? 'rotateY(180deg) scale(1.05)' : 'none', transition: 'transform 0.07s',
          }}>{coin ?? 'Flip'}</div>
          <button className="press" style={{ ...big, width: '100%' }} disabled={rolling !== null} onClick={() => tumble('coin')}>Flip a coin</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center' }}>
          <div aria-live="polite" style={{ minHeight: 84, display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '3.2rem', lineHeight: 1, color: 'var(--text)' }}>
            {dice.length ? dice.map((d, i) => <span key={i} style={{ display: 'inline-block', transform: rolling === 'dice' ? `rotate(${(i + 1) * 17}deg)` : 'none' }}>{FACES[d - 1]}</span>) : <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Roll</span>}
          </div>
          {dice.length > 1 && !rolling && <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '-0.4rem' }}>Total {total}</div>}
          <div style={{ display: 'flex', gap: '0.4rem', width: '100%' }}>
            {[1, 2, 3].map(n => (
              <button key={n} className="press" onClick={() => { setCount(n); setDice([]) }} aria-pressed={count === n} style={{
                ...big, flex: '0 0 44px', fontSize: '0.85rem',
                borderColor: count === n ? 'var(--gold)' : 'var(--border)', color: count === n ? 'var(--gold)' : 'var(--muted)',
              }}>{n}</button>
            ))}
            <button className="press" style={big} disabled={rolling !== null} onClick={() => tumble('dice')}>Roll {count === 1 ? 'a die' : `${count} dice`}</button>
          </div>
        </div>
      </div>
    </section>
  )
}
