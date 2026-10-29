'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import type { GuestInfo, MenuItem } from '@/lib/hooks/useGathering'
import { printGuestCard } from './printGuestCard'

// The guest page (2026-10-27): everything a guest would otherwise ask, one
// tap from the welcome sign. Wi-Fi with a code their phone can scan, where
// things are, the house rules, Somi, and what's on tonight. Nothing private
// is on it. On your own screen the same page has an Edit button.

const ACCENT = '#8a5a2c'

/** Wi-Fi join string phones understand when they scan it. */
function wifiCode(name: string, password: string): string {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1')
  return `WIFI:T:${password ? 'WPA' : 'nopass'};S:${esc(name)};${password ? `P:${esc(password)};` : ''};`
}

const lines = (s?: string) => (s ?? '').split('\n').map(l => l.trim()).filter(Boolean)

export default function GuestPage({ info, somi, menu = [], title = null, canEdit = false, onSave, onClose }: {
  info: GuestInfo
  somi?: { name: string; ageText: string; snack: string; tricks: string[]; notes: string | null } | null
  menu?: MenuItem[]
  /** The gathering's name, when there is one. */
  title?: string | null
  canEdit?: boolean
  onSave?: (info: GuestInfo) => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<GuestInfo>(info)
  const [showPass, setShowPass] = useState(false)
  const [qr, setQr] = useState<string | null>(null)

  useEffect(() => { setDraft(info) }, [info])
  useEffect(() => {
    if (!info.wifiName) { setQr(null); return }
    let alive = true
    QRCode.toDataURL(wifiCode(info.wifiName, info.wifiPassword ?? ''), { margin: 1, width: 220, color: { dark: '#2b2320', light: '#fffdf8' } })
      .then(u => { if (alive) setQr(u) }).catch(() => {})
    return () => { alive = false }
  }, [info.wifiName, info.wifiPassword])

  const places = lines(info.places)
  const rules = lines(info.rules)
  const dishes = menu.filter(m => m.name.trim())
  const empty = !info.wifiName && !places.length && !rules.length && !info.notes

  if (editing) {
    const set = (k: keyof GuestInfo) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(d => ({ ...d, [k]: e.target.value }))
    return (
      <div onClick={onClose} style={S.scrim}>
        <div onClick={e => e.stopPropagation()} style={S.card}>
          <div style={S.grabber} />
          <div style={S.head}>
            <span style={S.kicker}>Edit the guest page</span>
            <button onClick={onClose} style={S.x} aria-label="Close">✕</button>
          </div>
          <label style={S.label}>Welcome line
            <input value={draft.welcome ?? ''} onChange={set('welcome')} placeholder="Welcome to our home" style={S.input} />
          </label>
          <div style={S.row}>
            <label style={{ ...S.label, flex: 1 }}>Wi-Fi name
              <input value={draft.wifiName ?? ''} onChange={set('wifiName')} style={S.input} />
            </label>
            <label style={{ ...S.label, flex: 1 }}>Password
              <input value={draft.wifiPassword ?? ''} onChange={set('wifiPassword')} style={S.input} />
            </label>
          </div>
          <label style={S.label}>Where things are (one per line)
            <textarea value={draft.places ?? ''} onChange={set('places')} rows={4} placeholder={'Bathroom: down the hall, on the left\nTowels: hall closet\nCoffee: above the kettle'} style={{ ...S.input, resize: 'vertical' }} />
          </label>
          <label style={S.label}>House rules (one per line)
            <textarea value={draft.rules ?? ''} onChange={set('rules')} rows={3} placeholder={'Shoes off at the door\nKeep the back door shut for Somi'} style={{ ...S.input, resize: 'vertical' }} />
          </label>
          <label style={S.label}>Anything else
            <textarea value={draft.notes ?? ''} onChange={set('notes')} rows={2} placeholder="Help yourself to anything in the fridge." style={{ ...S.input, resize: 'vertical' }} />
          </label>
          <div style={S.row}>
            <button onClick={() => setEditing(false)} style={S.ghost}>Cancel</button>
            <button onClick={() => {
              const clean = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])) as GuestInfo
              onSave?.(clean); setEditing(false)
            }} style={S.primary}>Save</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div onClick={onClose} style={S.scrim}>
      <div onClick={e => e.stopPropagation()} style={S.card}>
        <div style={S.grabber} />
        <div style={S.head}>
          <span style={S.kicker}>{title ?? 'For our guests'}</span>
          <span style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            {canEdit && !empty && <button onClick={() => printGuestCard(info, qr)} style={S.link}>Print</button>}
            {canEdit && onSave && <button onClick={() => setEditing(true)} style={S.link}>Edit</button>}
            <button onClick={onClose} style={S.x} aria-label="Close">✕</button>
          </span>
        </div>
        <div style={S.big}>{info.welcome || 'Welcome to our home'}</div>

        {empty && (
          <div style={S.sub}>{canEdit ? 'Nothing here yet. Tap Edit to add the Wi-Fi, where things are and the house rules.' : 'Make yourself at home.'}</div>
        )}

        {info.wifiName && (
          <section style={{ ...S.block, flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
            {qr && <img src={qr} alt="Scan to join the Wi-Fi" width={110} height={110} style={{ borderRadius: 10, flexShrink: 0 }} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', minWidth: 0 }}>
              <div style={S.h}>Wi-Fi</div>
              <div style={{ fontSize: '1.05rem' }}>{info.wifiName}</div>
              {info.wifiPassword && (
                <button onClick={() => setShowPass(s => !s)} style={{ ...S.link, textAlign: 'left', fontSize: '0.95rem', fontFamily: '"DM Mono", ui-monospace, monospace' }}>
                  {showPass ? info.wifiPassword : 'Show password'}
                </button>
              )}
              {qr && <div style={S.sub}>Point your phone camera at the code to join.</div>}
            </div>
          </section>
        )}

        {places.length > 0 && (
          <section style={S.block}>
            <div style={S.h}>Where things are</div>
            {places.map((l, i) => {
              const [k, ...rest] = l.split(':')
              return rest.length
                ? <div key={i} style={S.item}><b style={{ fontWeight: 600 }}>{k.trim()}</b> <span style={{ color: '#7c6f69' }}>{rest.join(':').trim()}</span></div>
                : <div key={i} style={S.item}>{l}</div>
            })}
          </section>
        )}

        {rules.length > 0 && (
          <section style={S.block}>
            <div style={S.h}>House rules</div>
            {rules.map((l, i) => <div key={i} style={S.item}>{l}</div>)}
          </section>
        )}

        {dishes.length > 0 && (
          <section style={S.block}>
            <div style={S.h}>On the menu tonight</div>
            {dishes.map(m => <div key={m.id} style={S.item}>{m.name}{m.note ? <span style={{ color: '#7c6f69' }}> · {m.note}</span> : null}</div>)}
          </section>
        )}

        {somi && (
          <section style={S.block}>
            <div style={S.h}>Meet {somi.name}</div>
            <div style={S.item}>{somi.name} is {somi.ageText}. Favorite snack: {somi.snack}.</div>
            {somi.tricks.length > 0 && <div style={S.item}>Ask for a trick: {somi.tricks.join(', ')}.</div>}
            {somi.notes && <div style={S.item}>{somi.notes}</div>}
          </section>
        )}

        {info.notes && (
          <section style={S.block}>
            <div style={S.h}>Good to know</div>
            {lines(info.notes).map((l, i) => <div key={i} style={S.item}>{l}</div>)}
          </section>
        )}
      </div>
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  scrim: {
    position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    background: 'color-mix(in srgb, #2b2320 30%, transparent)',
  },
  card: {
    width: '100%', maxWidth: '36rem', maxHeight: '86vh',
    background: 'rgba(255, 253, 248, 0.9)',
    borderTop: '1px solid rgba(230, 216, 189, 0.9)', borderRadius: '20px 20px 0 0',
    backdropFilter: 'blur(20px) saturate(1.3)', WebkitBackdropFilter: 'blur(20px) saturate(1.3)',
    padding: '0.6rem 1.4rem 1.6rem', boxShadow: '0 -12px 50px rgba(74,33,28,0.35)',
    fontFamily: '"Manrope", system-ui, sans-serif', color: '#2b2320',
    display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', boxSizing: 'border-box',
  },
  grabber: { width: 36, height: 4, borderRadius: 2, background: 'rgba(138,90,44,0.35)', alignSelf: 'center', flexShrink: 0 },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontFamily: '"DM Mono", ui-monospace, monospace', fontSize: '0.66rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: ACCENT },
  x: { background: 'none', border: 'none', cursor: 'pointer', color: '#a8987f', fontSize: '0.95rem', lineHeight: 1, minWidth: 32, minHeight: 32 },
  link: { background: 'none', border: 'none', cursor: 'pointer', color: ACCENT, fontSize: '0.85rem', padding: 0, fontFamily: 'inherit' },
  big: { fontFamily: 'Georgia, "DM Serif Display", serif', fontSize: '1.6rem', color: '#2b2320', lineHeight: 1.15 },
  sub: { fontSize: '0.85rem', color: '#7c6f69', lineHeight: 1.5 },
  block: { display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingTop: '0.8rem', borderTop: '1px solid rgba(138,90,44,0.15)' },
  h: { fontFamily: '"DM Mono", ui-monospace, monospace', fontSize: '0.62rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7c6f69' },
  item: { fontSize: '0.95rem', lineHeight: 1.5 },
  row: { display: 'flex', gap: '0.6rem' },
  label: { display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.75rem', color: '#7c6f69' },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '0.55rem 0.7rem', border: '1px solid #e0d8cf', borderRadius: 10,
    fontSize: '0.9rem', fontFamily: 'inherit', color: '#2b2320', background: '#fffdf8', lineHeight: 1.5,
  },
  primary: { flex: 1, minHeight: 44, border: 'none', borderRadius: 12, background: ACCENT, color: '#fffdf8', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  ghost: { flex: 1, minHeight: 44, border: '1px solid #e0d8cf', borderRadius: 12, background: 'transparent', color: '#2b2320', fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' },
}
