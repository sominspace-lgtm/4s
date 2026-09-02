'use client'

import { useState } from 'react'
import { useSmartHome } from '@/lib/hooks/useSmartHome'
import { SCENE_PRESETS } from '@/lib/smarthome/apply'
import Icon, { type IconName } from '@/components/ui/Icon'

// The wall-facing house controls: big scene buttons and big device toggles.
// Scenes flip the shared device board (and, once a hub is linked, the real
// lights — see lib/smarthome/apply.ts). The full device manager stays in
// Household → Smart Home; this is the "tap it on your way to bed" surface.

export default function ScenesCard({ spaceId, onInteract }: { spaceId: string | null; onInteract?: () => void }) {
  const { devices, scenes, loading, toggleDevice, saveScene, applyScene } = useSmartHome(spaceId)
  const [saving, setSaving] = useState(false)

  if (loading && devices.length === 0 && scenes.length === 0) return null

  const onCount = devices.filter(d => d.on_state).length
  const usedNames = new Set(scenes.map(s => s.name.toLowerCase()))
  const openPresets = SCENE_PRESETS.filter(p => !usedNames.has(p.name.toLowerCase()))

  return (
    <div className="organic" style={{
      background: 'color-mix(in srgb, var(--gold) 9%, var(--surface2))',
      border: '1px solid color-mix(in srgb, var(--gold) 22%, var(--border))',
      borderRadius: '14px', padding: '0.65rem 0.75rem',
      display: 'flex', flexDirection: 'column', gap: '0.5rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span aria-hidden style={{ display: 'inline-flex', color: 'var(--gold)' }}><Icon name="household" size={16} /></span>
        <span style={{ fontSize: '0.74rem', fontWeight: 500, color: 'var(--text)', flex: 1 }}>House</span>
        {devices.length > 0 && (
          <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.75 }}>{onCount} of {devices.length} on</span>
        )}
      </div>

      {/* Scenes */}
      {scenes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))', gap: '0.4rem' }}>
          {scenes.map(s => (
            <button
              key={s.id}
              onClick={() => { applyScene(s.id); onInteract?.() }}
              className="press"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem',
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
                padding: '0.6rem 0.4rem', cursor: 'pointer', color: 'var(--text)', fontFamily: 'inherit',
              }}
            >
              <Icon name={(s.icon as IconName) || 'sparkle'} size={20} />
              <span style={{ fontSize: '0.68rem' }}>{s.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Device toggles */}
      {devices.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          {devices.map(d => (
            <button
              key={d.id}
              onClick={() => { toggleDevice(d.id, !d.on_state); onInteract?.() }}
              className="press"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                background: d.on_state ? 'color-mix(in srgb, var(--emerald) 12%, var(--surface))' : 'var(--surface)',
                border: `1px solid ${d.on_state ? 'color-mix(in srgb, var(--emerald) 35%, var(--border))' : 'var(--border)'}`,
                borderRadius: 10, padding: '0.5rem 0.65rem', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{
                width: 34, height: 20, borderRadius: 99, flexShrink: 0, padding: 2, position: 'relative',
                background: d.on_state ? 'color-mix(in srgb, var(--emerald) 40%, transparent)' : 'var(--surface2)',
                border: '1px solid var(--border)',
              }}>
                <span style={{
                  display: 'block', width: 14, height: 14, borderRadius: '50%',
                  background: d.on_state ? 'var(--emerald)' : 'var(--muted)',
                  transform: d.on_state ? 'translateX(14px)' : 'translateX(0)', transition: 'transform 0.15s',
                }} />
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: 'left', fontSize: '0.78rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.name}
              </span>
              <span style={{ fontSize: '0.62rem', color: d.on_state ? 'var(--emerald)' : 'var(--muted)', opacity: 0.8 }}>
                {d.on_state ? 'on' : 'off'}
              </span>
            </button>
          ))}
        </div>
      )}

      {devices.length === 0 && (
        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontStyle: 'italic' }}>
          Add your lights and locks in Household → Smart Home, then save scenes here.
        </div>
      )}

      {/* Save the current state as a scene */}
      {devices.length > 0 && (
        saving ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.64rem', color: 'var(--muted)' }}>Save this as</span>
            {openPresets.map(p => (
              <button key={p.name} onClick={() => { saveScene(p.name, p.icon); setSaving(false) }} className="press" style={pill}>
                {p.name}
              </button>
            ))}
            {scenes.map(s => (
              <button key={s.id} onClick={() => { saveScene(s.name, s.icon); setSaving(false) }} className="press" style={pill}>
                Update {s.name}
              </button>
            ))}
            <button onClick={() => setSaving(false)} style={{ ...pill, color: 'var(--muted)' }}>cancel</button>
          </div>
        ) : (
          <button onClick={() => setSaving(true)} style={{
            alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--gold)', fontSize: '0.64rem', opacity: 0.85, padding: 0,
          }}>+ Save current state as a scene</button>
        )
      )}
    </div>
  )
}

const pill: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 999,
  padding: '0.2rem 0.6rem', fontSize: '0.66rem', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit',
}
