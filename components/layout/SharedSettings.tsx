'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SectionConfig } from '@/components/ui/SectionCustomizer'
import { DEVICE_EVENT, DEVICE_KEYS, readDevice, writeDevice } from '@/lib/utils/deviceSettings'

// One settings page for the shared iPad (2026-10-19): guest view, older-iPad
// mode, the screen staying on, the bedtime dim, and what the village panel
// shows. Everything except the panel is this device only.

export default function SharedSettings({ open, onClose, guestView, onToggleGuestView }: {
  open: boolean; onClose: () => void
  guestView: boolean; onToggleGuestView?: () => void
  panelBlocks: SectionConfig[]; onChangePanelBlocks: (b: SectionConfig[]) => void
}) {
  const [lite, setLite] = useState<string>('auto')
  const [awake, setAwake] = useState(true)
  const [bedtime, setBedtime] = useState(true)

  useEffect(() => {
    const read = () => {
      setLite(readDevice(DEVICE_KEYS.lite) ?? 'auto')
      setAwake(readDevice(DEVICE_KEYS.keepAwake) !== '0')
      setBedtime(readDevice(DEVICE_KEYS.bedtime) !== '0')
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read this device's settings when opened
    read()
    window.addEventListener(DEVICE_EVENT, read)
    return () => window.removeEventListener(DEVICE_EVENT, read)
  }, [open])

  if (!open) return null
  const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.8rem', padding: '0.75rem 0', borderBottom: '1px solid var(--faint)' }
  const name: React.CSSProperties = { fontSize: '0.95rem', color: 'var(--text)' }
  const hint: React.CSSProperties = { fontSize: '0.76rem', color: 'var(--muted)', marginTop: '0.15rem', lineHeight: 1.4 }
  const toggle = (on: boolean, click: () => void, disabled = false) => (
    <button role="switch" aria-checked={on} disabled={disabled} onClick={click} style={{
      width: 52, height: 30, borderRadius: 999, border: 'none', cursor: disabled ? 'default' : 'pointer', flexShrink: 0, position: 'relative',
      background: on ? 'var(--gold)' : 'var(--surface2)', opacity: disabled ? 0.5 : 1, transition: 'background 0.2s',
    }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 25 : 3, width: 24, height: 24, borderRadius: '50%', background: 'var(--bg)', transition: 'left 0.2s' }} />
    </button>
  )

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="iPad settings" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(480px, 100%)', maxHeight: '90dvh', overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '1.2rem 1.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--text)' }}>iPad settings</span>
          <button onClick={onClose} aria-label="Close" style={{ minWidth: 40, minHeight: 40, border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>

        <div style={row}>
          <div><div style={name}>Guests are over</div><div style={hint}>Shows only the village and the guest card: wifi, house rules, Somi.{!onToggleGuestView ? ' A gathering is running, so it is on.' : ''}</div></div>
          {toggle(guestView, () => onToggleGuestView?.(), !onToggleGuestView)}
        </div>
        <div style={row}>
          <div><div style={name}>Older iPad mode</div><div style={hint}>Stills the village&rsquo;s little animations so it runs smoothly. Auto turns it on when the iPad struggles.</div></div>
          <select value={lite} onChange={e => writeDevice(DEVICE_KEYS.lite, e.target.value === 'auto' ? null : e.target.value)}
            style={{ minHeight: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', padding: '0 0.6rem', fontSize: '1rem' }}>
            <option value="auto">Auto</option><option value="on">On</option><option value="off">Off</option>
          </select>
        </div>
        <div style={row}>
          <div><div style={name}>Keep the screen on</div><div style={hint}>The iPad stays lit like a picture frame.</div></div>
          {toggle(awake, () => writeDevice(DEVICE_KEYS.keepAwake, awake ? '0' : null))}
        </div>
        <div style={row}>
          <div><div style={name}>Dim at bedtime</div><div style={hint}>From 10pm to 5:30am the village goes dim and still.</div></div>
          {toggle(bedtime, () => writeDevice(DEVICE_KEYS.bedtime, bedtime ? '0' : null))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
