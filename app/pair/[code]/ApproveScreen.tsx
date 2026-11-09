'use client'

import { useState } from 'react'
import { SHELL, CARD, H1, P, BTN, INPUT } from '@/components/devices/styles'

export default function ApproveScreen({ code, spaces }: { code: string; spaces: { id: string; name: string }[] }) {
  const [name, setName] = useState('Wall iPad')
  const [spaceId, setSpaceId] = useState(spaces[0].id)
  const [state, setState] = useState<'idle' | 'saving' | 'done'>('idle')
  const [err, setErr] = useState<string | null>(null)

  async function approve() {
    setState('saving'); setErr(null)
    const res = await fetch('/api/devices/pair/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, name, spaceId }),
    }).catch(() => null)
    const data = res ? await res.json().catch(() => ({})) : {}
    if (res?.ok) setState('done')
    else { setErr(data.error ?? 'No connection. Try again.'); setState('idle') }
  }

  return (
    <main style={SHELL}>
      <div style={CARD}>
        {state === 'done' ? (
          <>
            <h1 style={H1}>Approved</h1>
            <p style={P}>The screen will open by itself in a few seconds. You can remove it any time in Settings.</p>
          </>
        ) : (
          <>
            <h1 style={H1}>Add this screen?</h1>
            <p style={{ ...P, marginBottom: '0.4rem' }}>
              Check that the screen shows <strong style={{ color: '#4a3f35', letterSpacing: '0.1em' }}>{code.slice(0, 4)}-{code.slice(4)}</strong>.
            </p>
            <p style={{ ...P, fontSize: '0.8rem', marginBottom: '1.2rem' }}>
              It will show the home screen and run scenes. It can&rsquo;t open anything personal.
            </p>
            <label style={{ display: 'block', textAlign: 'left', fontSize: '0.8rem', color: '#8a7d6f', marginBottom: '0.3rem' }}>Name</label>
            <input style={{ ...INPUT, marginBottom: '0.9rem' }} value={name} maxLength={40} onChange={e => setName(e.target.value)} />
            {spaces.length > 1 && (
              <>
                <label style={{ display: 'block', textAlign: 'left', fontSize: '0.8rem', color: '#8a7d6f', marginBottom: '0.3rem' }}>Household</label>
                <select style={{ ...INPUT, marginBottom: '0.9rem' }} value={spaceId} onChange={e => setSpaceId(e.target.value)}>
                  {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </>
            )}
            {err && <p style={{ ...P, color: '#b4553f', marginBottom: '0.8rem' }}>{err}</p>}
            <button style={{ ...BTN, width: '100%', opacity: state === 'saving' ? 0.6 : 1 }} disabled={state === 'saving'} onClick={approve}>
              {state === 'saving' ? 'Approving…' : 'Approve'}
            </button>
          </>
        )}
      </div>
    </main>
  )
}
