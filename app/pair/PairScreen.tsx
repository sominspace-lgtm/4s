'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { SHELL, CARD, H1, P, BTN } from '@/components/devices/styles'

type Phase = 'starting' | 'waiting' | 'expired' | 'paired' | 'error'

export default function PairScreen() {
  const [phase, setPhase] = useState<Phase>('starting')
  const [code, setCode] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const secretRef = useRef<string | null>(null)

  const start = useCallback(async () => {
    setPhase('starting'); setErr(null); setQr(null); setCode(null)
    try {
      const res = await fetch('/api/devices/pair/start', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.code) { setErr(data.error ?? 'Could not start pairing.'); setPhase('error'); return }
      secretRef.current = data.secret
      setCode(data.code)
      setQr(await QRCode.toDataURL(`${window.location.origin}/pair/${data.code}`, { margin: 1, width: 280, color: { dark: '#2b2320', light: '#fffdf7' } }))
      setPhase('waiting')
    } catch {
      setErr('No connection. Check the Wi-Fi.'); setPhase('error')
    }
  }, [])

  useEffect(() => { start() }, [start])

  useEffect(() => {
    if (phase !== 'waiting') return
    const id = setInterval(async () => {
      try {
        const res = await fetch('/api/devices/pair/poll', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: secretRef.current }),
        })
        const data = await res.json().catch(() => ({}))
        if (data.status === 'paired') { setPhase('paired'); window.location.replace('/home') }
        else if (data.status === 'expired') setPhase('expired')
      } catch { /* try again on the next tick */ }
    }, 3000)
    return () => clearInterval(id)
  }, [phase])

  return (
    <main style={SHELL}>
      <div style={CARD}>
        <h1 style={H1}>Pair this screen</h1>
        {phase === 'waiting' && code && (
          <>
            <p style={P}>Scan this with your phone and tap Approve.</p>
            {qr && <img src={qr} alt="Pairing QR code" width={240} height={240} style={{ display: 'block', margin: '1.2rem auto 0.8rem', borderRadius: 12 }} />}
            <div style={{ fontSize: '1.4rem', letterSpacing: '0.2em', color: '#a8865a', fontVariantNumeric: 'tabular-nums' }}>
              {code.slice(0, 4)}-{code.slice(4)}
            </div>
            <p style={{ ...P, fontSize: '0.78rem', marginTop: '0.8rem' }}>This code works for 10 minutes.</p>
          </>
        )}
        {phase === 'starting' && <p style={P}>Getting a code…</p>}
        {phase === 'paired' && <p style={P}>Paired. Opening…</p>}
        {(phase === 'expired' || phase === 'error') && (
          <>
            <p style={{ ...P, marginBottom: '1.2rem' }}>{phase === 'expired' ? 'That code ran out.' : err}</p>
            <button style={BTN} onClick={start}>Get a new code</button>
          </>
        )}
      </div>
    </main>
  )
}
