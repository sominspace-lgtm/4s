'use client'

import { useRef, useState } from 'react'
import { useGoogleStatus } from '@/lib/hooks/useGoogle'

// "From Google Photos" (2026-10-24). Opens Google's own photo picker in a new
// window; when you are done choosing, the photos come back here as files, so
// they go through the same upload as a photo from the phone. Hidden until
// Google is connected with the Photos permission.

type State = 'idle' | 'picking' | 'loading'

export default function GooglePhotosButton({ onPick, max = 1, label = 'From Google Photos', account: want }: {
  onPick: (files: File[]) => void | Promise<void>
  max?: number
  label?: string
  /** Pin to one Google account; by default your own, else the shared one. */
  account?: 'mine' | 'shared'
}) {
  const { status } = useGoogleStatus()
  const [state, setState] = useState<State>('idle')
  const [err, setErr] = useState<string | null>(null)
  const cancelled = useRef(false)

  const mine = status.connected && !!status.photos
  const shared = !!status.household?.connected
  const use = want ?? (mine ? 'mine' : 'shared')
  if (use === 'mine' ? !mine : !shared) return null
  const account = use === 'shared' ? 'account=shared' : ''
  const q = (extra: string) => [extra, account].filter(Boolean).join('&')

  async function start() {
    setErr(null); cancelled.current = false
    // Open the window now, inside the tap, so the phone does not block it.
    const win = window.open('', '_blank')
    setState('picking')
    try {
      const res = await fetch(`/api/google/photos?${q('')}`, { method: 'POST' })
      const j = await res.json().catch(() => ({})) as { session?: string; url?: string; poll?: string; error?: string }
      if (!res.ok || !j.session || !j.url) { win?.close(); setErr(j.error ?? 'Could not open Google Photos.'); setState('idle'); return }
      if (win) win.location.href = `${j.url}/autoclose`
      else window.location.href = j.url
      const every = Math.max(2, parseFloat(j.poll ?? '3')) * 1000
      const until = Date.now() + 10 * 60_000
      while (!cancelled.current && Date.now() < until) {
        await new Promise(r => setTimeout(r, every))
        const p = await fetch(`/api/google/photos?${q(`session=${encodeURIComponent(j.session)}`)}`)
        const pj = await p.json().catch(() => ({})) as { done?: boolean }
        if (pj.done) break
      }
      if (cancelled.current) { setState('idle'); return }
      setState('loading')
      const l = await fetch(`/api/google/photos?${q(`session=${encodeURIComponent(j.session)}&list=1`)}`)
      const lj = await l.json().catch(() => ({})) as { items?: { n: number; name: string }[] }
      const picked = (lj.items ?? []).slice(0, max)
      const files: File[] = []
      for (const it of picked) {
        const r = await fetch(`/api/google/photos?${q(`session=${encodeURIComponent(j.session)}&file=${it.n}`)}`)
        if (!r.ok) continue
        const blob = await r.blob()
        files.push(new File([blob], it.name.replace(/\.\w+$/, '') + '.jpg', { type: blob.type || 'image/jpeg' }))
      }
      void fetch(`/api/google/photos?${q(`session=${encodeURIComponent(j.session)}`)}`, { method: 'DELETE' })
      if (files.length === 0) setErr('No photos came back. Pick at least one photo.')
      else await onPick(files)
    } catch { setErr('Google Photos did not answer. Try again.') }
    setState('idle')
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
      {state === 'picking' ? (
        <span style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Choose in Google Photos, then tap Done there.</span>
          <button onClick={() => { cancelled.current = true }} className="btn btn-ghost press">Cancel</button>
        </span>
      ) : (
        <button onClick={start} disabled={state === 'loading'} className="btn btn-secondary press" style={{ minHeight: 44 }}>
          {state === 'loading' ? 'Bringing them over…' : label}
        </button>
      )}
      {err && <span style={{ fontSize: '0.76rem', color: 'var(--rose)' }}>{err}</span>}
    </span>
  )
}
