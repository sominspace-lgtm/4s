'use client'

import { useState } from 'react'
import { useSmartHome, deviceView } from '@/lib/hooks/useSmartHome'
import { SCENE_PRESETS } from '@/lib/smarthome/apply'
import Icon, { type IconName } from '@/components/ui/Icon'
import { goToSection } from '@/lib/utils/navigate'

// Smart Home on Today (2026-11-19): how the house is right now in one line,
// the scenes one tap away, and Home's Smart Home page behind "Controls".

const SCENES_SHOWN = 4

export default function TodaySmartHome({ spaceId }: { spaceId: string | null }) {
  const { devices, scenes, activeScene, loading, applyPreset, allOff } = useSmartHome(spaceId)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  if (!spaceId || loading) return null

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '1rem 1.15rem', boxShadow: 'var(--elev-1)' }

  if (devices.length === 0) {
    return (
      <button onClick={() => goToSection('smarthome')} className="press" style={{ ...card, display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
        <span aria-hidden style={{ width: 34, height: 34, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'color-mix(in srgb, var(--gold) 14%, transparent)', color: 'var(--gold)' }}>
          <Icon name="lightbulb" size={17} />
        </span>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          <span style={{ fontSize: '0.92rem', color: 'var(--text)' }}>Smart Home</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>Connect your lights and scenes</span>
        </span>
        <span aria-hidden style={{ color: 'var(--muted)' }}>›</span>
      </button>
    )
  }

  const views = devices.map(d => deviceView(d))
  const lightsOn = views.filter(v => v.kind === 'light' && v.state.on).length
  const lights = views.filter(v => v.kind === 'light').length
  const thermo = views.find(v => v.kind === 'thermostat')
  const unlocked = views.filter(v => v.kind === 'lock' && !v.state.locked).length
  const anyOn = devices.some(d => d.on_state)
  const summary = [
    lights ? (lightsOn ? `${lightsOn} of ${lights} light${lights === 1 ? '' : 's'} on` : 'Lights off') : null,
    thermo?.state.temperature != null ? `${thermo.state.temperature}°` : null,
    unlocked ? `${unlocked} unlocked` : null,
  ].filter(Boolean).join('  ·  ')

  const custom = scenes.filter(s => !SCENE_PRESETS.some(p => p.name.toLowerCase() === s.name.toLowerCase()))
  const sceneRows = [
    ...SCENE_PRESETS.map(p => ({ name: p.name, icon: scenes.find(s => s.name.toLowerCase() === p.name.toLowerCase())?.icon || p.icon })),
    ...custom.map(s => ({ name: s.name, icon: s.icon })),
  ].slice(0, SCENES_SHOWN)
  const active = activeScene?.name.trim().toLowerCase()

  async function run(key: string, p: Promise<string | null>) {
    setErr(null); setBusy(key)
    const e = await p
    setBusy(null)
    if (e) setErr(e)
  }

  return (
    <section style={card} aria-label="Smart Home">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.7rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-label">Smart Home</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginTop: 2 }}>
            {activeScene ? `${activeScene.name}${summary ? `  ·  ${summary}` : ''}` : summary || 'All quiet'}
          </div>
        </div>
        {anyOn && (
          <button onClick={() => run('off', allOff())} disabled={busy !== null} className="btn btn-ghost press" style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}>All off</button>
        )}
        <button onClick={() => goToSection('smarthome')} className="btn btn-ghost press" style={{ fontSize: '0.78rem', padding: '0.4rem 0.7rem' }}>Controls</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${sceneRows.length}, minmax(0, 1fr))`, gap: '0.45rem' }}>
        {sceneRows.map(s => {
          const on = active === s.name.trim().toLowerCase()
          return (
            <button key={s.name} onClick={() => run(s.name, applyPreset(s.name, s.icon))} disabled={busy !== null} aria-pressed={on} className="press" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem', minWidth: 0,
              padding: '0.6rem', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left',
              border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`,
              background: on ? 'color-mix(in srgb, var(--gold) 16%, var(--surface))' : 'var(--surface2)',
              color: on ? 'var(--gold)' : 'var(--text)', opacity: busy && busy !== s.name ? 0.6 : 1,
            }}>
              <Icon name={(s.icon as IconName) || 'sparkle'} size={17} />
              <span style={{ fontSize: '0.78rem', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
            </button>
          )
        })}
      </div>
      {err && <div style={{ fontSize: '0.76rem', color: 'var(--rose)', marginTop: '0.5rem' }}>{err}</div>}
    </section>
  )
}
