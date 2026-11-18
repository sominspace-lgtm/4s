'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSmartHome, deviceView, type SmartHomeDevice } from '@/lib/hooks/useSmartHome'
import { SCENE_PRESETS } from '@/lib/smarthome/apply'
import { can, describe, TEMP_MAX, TEMP_MIN, type DeviceKind, type DeviceState } from '@/lib/smarthome/capabilities'
import type { NowPlaying } from '@/lib/spotify/server'
import Icon, { type IconName } from '@/components/ui/Icon'
import { DeviceControls } from './HouseholdSmartHome'

// The home control panel (2026-11-18): what opens when you tap Home on the
// Village or the Controls tab. Big tiles made for the wall iPad: scenes up
// top, the music, then every device by room. Tap a tile to switch it, tap
// Adjust for brightness, colour, volume or how far open. Setting things up
// (adding devices, Home Assistant, saving scenes) stays one tap away.

const KIND_ICON: Record<DeviceKind, IconName> = {
  light: 'lightbulb', plug: 'link', switch: 'controls', thermostat: 'fire', lock: 'lock',
  blinds: 'sunrise', speaker: 'bell', fan: 'cloud', tv: 'tv',
}

function tileOn(kind: DeviceKind, s: DeviceState): boolean {
  if (kind === 'lock') return !!s.locked
  if (kind === 'blinds') return (s.position ?? 0) > 0
  return !!s.on
}

/** What one tap does: the obvious opposite. */
function tapChange(kind: DeviceKind, s: DeviceState): DeviceState | null {
  if (kind === 'lock') return { locked: !s.locked }
  if (kind === 'blinds') return { position: (s.position ?? 0) > 0 ? 0 : 100 }
  if (can(kind, 'power')) return { on: !s.on }
  return null
}

function MusicTile() {
  const [people, setPeople] = useState<NowPlaying[] | null>(null)
  const load = useCallback(async () => {
    const r = await fetch('/api/home/music', { cache: 'no-store' }).catch(() => null)
    if (r?.ok) setPeople((await r.json()).people ?? [])
  }, [])
  useEffect(() => { load(); const id = setInterval(load, 10_000); return () => clearInterval(id) }, [load])
  const p = people?.find(x => x.playing?.isPlaying) ?? people?.find(x => x.playing) ?? people?.[0]
  if (!p) return null
  const np = p.playing
  const send = async (action: string) => {
    if (np) setPeople(ps => ps && ps.map(x => (x.userId === p.userId && x.playing ? { ...x, playing: { ...x.playing, isPlaying: action === 'play' ? true : action === 'pause' ? false : x.playing.isPlaying } } : x)))
    await fetch('/api/home/music', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: p.userId, action }) }).catch(() => null)
    setTimeout(load, 700)
  }
  const btn: React.CSSProperties = { width: 44, height: 44, borderRadius: 22, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: '1rem' }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem', borderRadius: 16, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <div style={{ width: 52, height: 52, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--surface)', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
        {np?.art ? <img src={np.art} alt="" width={52} height={52} style={{ width: 52, height: 52, objectFit: 'cover' }} /> : '♪'}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{np ? np.title : 'Nothing playing'}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {np ? [np.artist, np.device].filter(Boolean).join(' · ') : 'Pick a playlist from the music on the Village'}
        </div>
      </div>
      {np && <button style={btn} aria-label="Previous" onClick={() => send('previous')}>⏮</button>}
      {np && <button style={{ ...btn, background: 'var(--text)', color: 'var(--surface)' }} aria-label={np.isPlaying ? 'Pause' : 'Play'} onClick={() => send(np.isPlaying ? 'pause' : 'play')}>{np.isPlaying ? '⏸' : '▶'}</button>}
      {np && <button style={btn} aria-label="Next" onClick={() => send('next')}>⏭</button>}
    </div>
  )
}

export default function ControlPanel({ spaceId, onSetup }: { spaceId: string | null; onSetup: () => void }) {
  const { devices, scenes, activeScene, loading, setDevice, applyPreset, allOff } = useSmartHome(spaceId)
  const [room, setRoom] = useState('All')
  const [adjust, setAdjust] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const views = devices.map(d => ({ d, ...deviceView(d) }))
  const rooms = [...new Set(views.map(v => v.room))].sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
  const shown = room === 'All' ? views : views.filter(v => v.room === room)
  const lightsOn = views.filter(v => v.kind === 'light' && v.state.on).length
  const thermo = views.find(v => v.kind === 'thermostat')
  const unlocked = views.filter(v => v.kind === 'lock' && !v.state.locked).length
  const anyOn = devices.some(d => d.on_state)
  const custom = scenes.filter(s => !SCENE_PRESETS.some(p => p.name.toLowerCase() === s.name.toLowerCase()))
  const sceneRows = [...SCENE_PRESETS.map(p => ({ name: p.name, icon: scenes.find(s => s.name.toLowerCase() === p.name.toLowerCase())?.icon || p.icon })), ...custom.map(s => ({ name: s.name, icon: s.icon }))]
  const active = activeScene?.name.trim().toLowerCase()
  const adjusting = devices.find(d => d.id === adjust) ?? null

  async function run(p: Promise<string | null>) {
    setErr(null)
    const e = await p
    if (e) setErr(e)
  }

  const summary = [
    `${lightsOn} light${lightsOn === 1 ? '' : 's'} on`,
    thermo ? `${thermo.state.temperature}°` : null,
    unlocked ? `${unlocked} unlocked` : null,
  ].filter(Boolean).join('  ·  ')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--text)', lineHeight: 1.1 }}>Home</div>
          {devices.length > 0 && <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 2 }}>{summary}</div>}
        </div>
        {anyOn && (
          <button onClick={() => run(allOff())} className="press" style={{ padding: '0.55rem 1rem', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.82rem', cursor: 'pointer' }}>All off</button>
        )}
      </div>

      {err && <div style={{ fontSize: '0.78rem', color: 'var(--rose)' }}>{err}</div>}

      {spaceId && (
        <div style={{ display: 'grid', gridAutoFlow: 'column', gridAutoColumns: 'minmax(6.2rem, 1fr)', gap: '0.5rem', overflowX: 'auto', paddingBottom: 2 }}>
          {sceneRows.map(s => {
            const on = active === s.name.trim().toLowerCase()
            return (
              <button key={s.name} onClick={() => run(applyPreset(s.name, s.icon))} className="press" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.6rem',
                minHeight: '4.6rem', padding: '0.7rem', borderRadius: 16, cursor: 'pointer', fontFamily: 'var(--font-body)', textAlign: 'left',
                border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`,
                background: on ? 'color-mix(in srgb, var(--gold) 18%, var(--surface))' : 'var(--surface2)',
                color: on ? 'var(--gold)' : 'var(--text)',
              }}>
                <Icon name={(s.icon as IconName) || 'sparkle'} size={20} />
                <span style={{ fontSize: '0.84rem' }}>{s.name}</span>
              </button>
            )
          })}
        </div>
      )}

      <MusicTile />

      {rooms.length > 1 && (
        <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
          {['All', ...rooms].map(r => (
            <button key={r} onClick={() => setRoom(r)} className="press" style={{
              flexShrink: 0, minHeight: 36, padding: '0 0.95rem', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.82rem',
              border: `1px solid ${room === r ? 'var(--text)' : 'var(--border)'}`,
              background: room === r ? 'var(--text)' : 'transparent', color: room === r ? 'var(--surface)' : 'var(--muted)',
            }}>{r}</button>
          ))}
        </div>
      )}

      {!loading && devices.length === 0 && (
        <div style={{ padding: '1.2rem', borderRadius: 16, background: 'var(--surface2)', color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
          No devices yet. Connect Home Assistant or try a practice home in Set up.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9.5rem, 1fr))', gap: '0.6rem' }}>
        {shown.map(({ d, kind, state, room: r, practice }) => {
          const on = tileOn(kind, state)
          const tint = kind === 'light' && on ? state.color ?? '#ffb46b' : null
          const tap = tapChange(kind, state)
          const adjustable = can(kind, 'brightness') || can(kind, 'volume') || can(kind, 'position') || can(kind, 'temperature')
          const offline = (d as SmartHomeDevice).meta?.offline
          return (
            <div key={d.id} style={{
              position: 'relative', minHeight: '7rem', borderRadius: 18, padding: '0.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
              border: `1px solid ${on ? 'transparent' : 'var(--border)'}`,
              background: tint ? `linear-gradient(150deg, color-mix(in srgb, ${tint} 55%, var(--surface)), color-mix(in srgb, ${tint} 22%, var(--surface)))`
                : on ? 'color-mix(in srgb, var(--gold) 20%, var(--surface))' : 'var(--surface2)',
              boxShadow: on ? '0 6px 18px color-mix(in srgb, var(--text) 12%, transparent)' : 'none',
              opacity: offline ? 0.5 : 1,
            }}>
              <button onClick={() => tap && run(setDevice(d.id, tap))} disabled={!tap || !!offline} aria-pressed={on} aria-label={`${d.name}: ${describe(kind, state)}`} style={{
                position: 'absolute', inset: 0, borderRadius: 18, background: 'transparent', border: 'none', cursor: tap ? 'pointer' : 'default',
              }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pointerEvents: 'none' }}>
                <span style={{ width: 36, height: 36, borderRadius: 18, display: 'grid', placeItems: 'center', background: on ? 'color-mix(in srgb, var(--surface) 70%, transparent)' : 'var(--surface)', color: on ? 'var(--text)' : 'var(--muted)' }}>
                  <Icon name={KIND_ICON[kind]} size={18} />
                </span>
                {practice && <span style={{ fontSize: '0.56rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold)' }}>Practice</span>}
              </div>
              <div style={{ pointerEvents: 'none' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 600, lineHeight: 1.2 }}>{d.name}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--muted)', marginTop: 2 }}>
                  {offline ? 'Offline' : describe(kind, state)}{room === 'All' && rooms.length > 1 ? ` · ${r}` : ''}
                </div>
              </div>
              {kind === 'thermostat' && (
                <div style={{ position: 'absolute', right: 8, bottom: 8, display: 'flex', gap: 4 }}>
                  {[-1, 1].map(n => (
                    <button key={n} aria-label={n < 0 ? 'Cooler' : 'Warmer'} onClick={() => run(setDevice(d.id, { temperature: Math.min(TEMP_MAX, Math.max(TEMP_MIN, (state.temperature ?? 68) + n)) }))} style={{
                      width: 34, height: 34, borderRadius: 17, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer', fontSize: '1rem', position: 'relative',
                    }}>{n < 0 ? '−' : '+'}</button>
                  ))}
                </div>
              )}
              {adjustable && kind !== 'thermostat' && (
                <button onClick={() => setAdjust(d.id)} aria-label={`Adjust ${d.name}`} style={{
                  position: 'absolute', right: 8, top: 8, padding: '0.3rem 0.6rem', borderRadius: 999, border: 'none', cursor: 'pointer',
                  background: 'color-mix(in srgb, var(--surface) 75%, transparent)', color: 'var(--text)', fontSize: '0.7rem', fontFamily: 'var(--font-body)',
                }}>Adjust</button>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={onSetup} className="press" style={{ alignSelf: 'center', marginTop: '0.4rem', background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'var(--font-body)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
        Set up devices, scenes and Home Assistant
      </button>

      {adjusting && (
        <div onClick={() => setAdjust(null)} style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'color-mix(in srgb, var(--text) 25%, transparent)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-label={`Adjust ${adjusting.name}`} style={{
            width: 'min(30rem, 100%)', padding: '1.1rem 1.2rem 1.6rem', borderRadius: '20px 20px 0 0', background: 'var(--surface)', border: '1px solid var(--border)', borderBottom: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ flex: 1, fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}>{adjusting.name}</div>
              <button onClick={() => setAdjust(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-body)' }}>Done</button>
            </div>
            <DeviceControls d={adjusting} set={change => { run(setDevice(adjusting.id, change)) }} />
          </div>
        </div>
      )}
    </div>
  )
}
