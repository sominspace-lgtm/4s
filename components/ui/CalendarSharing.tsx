'use client'

import { useEffect, useState } from 'react'
import { notifyGoogleChanged } from '@/lib/hooks/useGoogle'

// Share your own Google Calendar (2026-10-24): with the other person, on the
// shared screen, and with or without the details. Everything starts off.

interface Shares { calendar_partner: boolean; calendar_household: boolean; details: boolean }

export default function CalendarSharing() {
  const [mine, setMine] = useState<Shares | null>(null)
  const [partnerShares, setPartnerShares] = useState(false)
  const [hasPartner, setHasPartner] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/google/sharing').then(r => (r.ok ? r.json() : null)).then((j: { mine: Shares; partnerShares: boolean; hasPartner: boolean } | null) => {
      if (!j) return
      setMine(j.mine); setPartnerShares(j.partnerShares); setHasPartner(j.hasPartner)
    }).catch(() => {})
  }, [])

  async function set(patch: Partial<Shares>) {
    if (!mine) return
    const next = { ...mine, ...patch }
    setMine(next); setErr(null)
    const res = await fetch('/api/google/sharing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patch) })
    if (!res.ok) { setErr('That did not save.'); setMine(mine); return }
    notifyGoogleChanged()
  }

  if (!mine) return null

  const row = (label: string, hint: string, on: boolean, flip: () => void) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', minHeight: 48, cursor: 'pointer' }}>
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: '0.86rem', color: 'var(--text)' }}>{label}</span>
        <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)' }}>{hint}</span>
      </span>
      <button type="button" role="switch" aria-checked={on} onClick={flip} style={{
        width: 48, height: 28, borderRadius: 999, border: 'none', cursor: 'pointer', flexShrink: 0, position: 'relative',
        background: on ? 'var(--gold)' : 'var(--surface2)', transition: 'background 0.2s',
      }}>
        <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 22, height: 22, borderRadius: '50%', background: 'var(--bg)', transition: 'left 0.2s' }} />
      </button>
    </label>
  )

  return (
    <div style={{ borderTop: '1px solid var(--faint)', paddingTop: '0.7rem', marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <div style={{ fontSize: '0.82rem', color: 'var(--text)', marginBottom: '0.2rem' }}>Share my calendar</div>
      {hasPartner && row('With my partner', 'Your events show in their calendars too.', mine.calendar_partner, () => set({ calendar_partner: !mine.calendar_partner }))}
      {row('On the shared screen', 'Your events show on the iPad. Never while guests are over.', mine.calendar_household, () => set({ calendar_household: !mine.calendar_household }))}
      {(mine.calendar_partner || mine.calendar_household) && row('Show the details', 'Off shows only "Busy", with no titles or places.', mine.details, () => set({ details: !mine.details }))}
      {hasPartner && <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{partnerShares ? 'Your partner shares their calendar with you.' : 'Your partner is not sharing their calendar with you.'}</div>}
      {err && <div style={{ fontSize: '0.76rem', color: 'var(--rose)' }}>{err}</div>}
    </div>
  )
}
