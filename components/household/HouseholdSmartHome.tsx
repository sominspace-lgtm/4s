'use client'

import { useState } from 'react'
import { useSmartHome, deviceView, type SmartHomeDevice } from '@/lib/hooks/useSmartHome'
import { SCENE_PRESETS } from '@/lib/smarthome/apply'
import { KINDS, KIND_INFO, can, describe, TEMP_MIN, TEMP_MAX, type DeviceKind, type DeviceState } from '@/lib/smarthome/capabilities'
import Icon, { type IconName } from '@/components/ui/Icon'
import IconButton from '@/components/ui/IconButton'
import HomeAssistantCard from './HomeAssistantCard'

// The Controller (2026-11-08). Rooms, each device with the controls its kind
// supports, and scenes. No real hub is connected yet: devices are either your
// own list (records what you set) or the Practice home (pretend devices to
// try it all with). Both are labeled so it is never mistaken for the real
// house. Every change is checked and sent on the server.
//
// Home Assistant (2026-11-10): connect your own Home Assistant and its
// devices come in with their rooms. Changes to those go to the real devices,
// and their status is brought in again every 30 seconds while this is open.

const input: React.CSSProperties = {
  background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px',
  padding: '0.45rem 0.6rem', color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', outline: 'none',
}

const ROOMS = ['Living room', 'Kitchen', 'Bedroom', 'Bathroom', 'Hallway', 'Office', 'Outside']

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (on: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} aria-label={label} aria-pressed={on} className="press" style={{
      width: 38, height: 22, borderRadius: 99, flexShrink: 0, cursor: 'pointer', padding: 2,
      border: '1px solid var(--border)', position: 'relative',
      background: on ? 'color-mix(in srgb, var(--emerald) 35%, transparent)' : 'var(--surface2)',
    }}>
      <span style={{
        display: 'block', width: 16, height: 16, borderRadius: '50%',
        background: on ? 'var(--emerald)' : 'var(--muted)',
        transform: on ? 'translateX(16px)' : 'translateX(0)', transition: 'transform var(--t-base, 0.15s)',
      }} />
    </button>
  )
}

function Slider({ value, min, max, label, onCommit }: { value: number; min: number; max: number; label: string; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<number | null>(null)
  return (
    <input type="range" min={min} max={max} value={draft ?? value} aria-label={label}
      onChange={e => setDraft(Number(e.target.value))}
      onPointerUp={() => { if (draft !== null) { onCommit(draft); setDraft(null) } }}
      onKeyUp={() => { if (draft !== null) { onCommit(draft); setDraft(null) } }}
      style={{ flex: 1, minWidth: 90, accentColor: 'var(--gold)' }} />
  )
}

function DeviceControls({ d, set }: { d: SmartHomeDevice; set: (change: DeviceState) => void }) {
  const { kind, state } = deviceView(d)
  const step = (n: number) => set({ temperature: Math.min(TEMP_MAX, Math.max(TEMP_MIN, (state.temperature ?? 68) + n)) })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
      {can(kind, 'power') && <Toggle on={!!state.on} label={`Turn ${d.name} ${state.on ? 'off' : 'on'}`} onChange={on => set({ on })} />}
      {can(kind, 'brightness') && state.on && (
        <Slider value={state.brightness ?? 80} min={1} max={100} label={`${d.name} brightness`} onCommit={v => set({ brightness: v })} />
      )}
      {can(kind, 'volume') && state.on && (
        <Slider value={state.volume ?? 30} min={0} max={100} label={`${d.name} volume`} onCommit={v => set({ volume: v })} />
      )}
      {can(kind, 'temperature') && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <button className="btn btn-ghost press" aria-label="Cooler" onClick={() => step(-1)} style={{ padding: '0.15rem 0.6rem', fontSize: '0.9rem' }}>−</button>
          <span style={{ fontSize: '0.95rem', minWidth: '2.6rem', textAlign: 'center', color: 'var(--text)' }}>{state.temperature}°</span>
          <button className="btn btn-ghost press" aria-label="Warmer" onClick={() => step(1)} style={{ padding: '0.15rem 0.6rem', fontSize: '0.9rem' }}>+</button>
        </span>
      )}
      {can(kind, 'lock') && (
        <button className="btn btn-ghost press" onClick={() => set({ locked: !state.locked })} style={{ fontSize: '0.72rem', padding: '0.25rem 0.8rem' }}>
          {state.locked ? 'Unlock' : 'Lock'}
        </button>
      )}
      {can(kind, 'position') && (
        <>
          <button className="btn btn-ghost press" onClick={() => set({ position: 0 })} style={{ fontSize: '0.68rem', padding: '0.2rem 0.6rem' }}>Close</button>
          <Slider value={state.position ?? 0} min={0} max={100} label={`${d.name} open amount`} onCommit={v => set({ position: v })} />
          <button className="btn btn-ghost press" onClick={() => set({ position: 100 })} style={{ fontSize: '0.68rem', padding: '0.2rem 0.6rem' }}>Open</button>
        </>
      )}
    </div>
  )
}

export default function HouseholdSmartHome({ spaceId }: { spaceId: string | null }) {
  const { devices, scenes, activeScene, binDays, loading, reload, allOff, addDevice, setDevice, updateNote, updateRoom, removeDevice, practice, saveScene, deleteScene, applyPreset, saveBinDays } = useSmartHome(spaceId)
  const [savingScene, setSavingScene] = useState(false)
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  const [kind, setKind] = useState<DeviceKind>('light')
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [roomTab, setRoomTab] = useState('All')

  const byRoom = new Map<string, SmartHomeDevice[]>()
  for (const d of devices) {
    const key = deviceView(d).room
    byRoom.set(key, [...(byRoom.get(key) ?? []), d])
  }
  const roomNames = [...byRoom.keys()].sort((a, b) => (a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b)))
  const hasPractice = devices.some(d => d.provider === 'practice')
  const hasReal = devices.some(d => d.provider === 'home_assistant')
  const shownRooms = roomTab !== 'All' && roomNames.includes(roomTab) ? [roomTab] : roomNames
  const onCount = devices.filter(d => d.on_state).length

  async function act(p: Promise<string | null>) {
    setErr(null)
    const e = await p
    if (e) setErr(e)
  }

  async function runPractice(action: 'add' | 'remove') {
    if (action === 'remove' && !window.confirm('Remove the practice devices? Your own devices stay.')) return
    setBusy(true); await act(practice(action)); setBusy(false)
  }

  async function saveNote(d: SmartHomeDevice) {
    await updateNote(d.id, (noteDraft[d.id] ?? '').trim() || null)
    setEditing(e => ({ ...e, [d.id]: false }))
  }

  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div className="t-card">Home controls</div>
        {devices.length > 0 && <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{onCount} of {devices.length} on</span>}
        {spaceId && onCount > 0 && <button className="btn btn-ghost press" onClick={() => act(allOff())} style={{ marginLeft: 'auto', fontSize: '0.7rem' }}>All off</button>}
      </div>

      {spaceId && <HomeAssistantCard spaceId={spaceId} onSynced={reload} />}

      {/* Always said plainly: nothing here reaches real hardware yet. */}
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.55, padding: '0.6rem 0.8rem', borderRadius: 10, background: 'color-mix(in srgb, var(--gold) 8%, var(--surface2))' }}>
        {hasReal
          ? <>Devices from <strong style={{ color: 'var(--text)' }}>Home Assistant</strong> are your real ones: changes here happen in the house.{hasPractice ? ' The ones marked Practice are pretend.' : ''}</>
          : hasPractice
          ? <>The devices marked <strong style={{ color: 'var(--gold)' }}>Practice</strong> are pretend, so you can try everything. Nothing in the house changes.</>
          : 'No smart home hub is connected yet. Devices you add here keep track of what you set, but do not control anything real.'}
      </div>

      {err && <div style={{ fontSize: '0.72rem', color: 'var(--rose)' }}>{err}</div>}

      {spaceId && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {hasPractice
            ? <button className="btn btn-ghost press" disabled={busy} onClick={() => runPractice('remove')} style={{ fontSize: '0.7rem' }}>Remove practice home</button>
            : <button className="btn btn-secondary press" disabled={busy} onClick={() => runPractice('add')} style={{ fontSize: '0.7rem' }}>{busy ? 'Setting up…' : 'Try a practice home'}</button>}
        </div>
      )}

      {devices.length === 0 && !loading && !spaceId && (
        <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>Nothing added yet.</div>
      )}

      {spaceId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div className="t-label">Scenes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {(() => {
              const activeName = activeScene?.name.trim().toLowerCase()
              const custom = scenes.filter(s => !SCENE_PRESETS.some(p => p.name.toLowerCase() === s.name.toLowerCase()))
              const byName = new Map(scenes.map(s => [s.name.toLowerCase(), s]))
              const rows = [
                ...SCENE_PRESETS.map(p => ({ name: p.name, icon: (byName.get(p.name.toLowerCase())?.icon) || p.icon, custom: null as (typeof scenes)[number] | null })),
                ...custom.map(s => ({ name: s.name, icon: s.icon, custom: s })),
              ]
              return rows.map(r => {
                const on = activeName === r.name.trim().toLowerCase()
                return (
                  <span key={r.name} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: on ? 'color-mix(in srgb, var(--gold) 16%, var(--surface2))' : 'var(--surface2)', border: `1px solid ${on ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 999, padding: r.custom ? '0.3rem 0.35rem 0.3rem 0.7rem' : '0.3rem 0.7rem' }}>
                    <button onClick={() => act(applyPreset(r.name, r.icon))} className="press" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'none', border: 'none', cursor: 'pointer', color: on ? 'var(--gold)' : 'var(--text)', fontSize: '0.74rem', fontFamily: 'inherit' }}>
                      <Icon name={(r.icon as IconName) || 'sparkle'} size={13} />{r.name}
                    </button>
                    {r.custom && <IconButton label={`Delete ${r.name}`} onClick={() => deleteScene(r.custom!.id)} size={10} style={{ opacity: 0.5 }}>✕</IconButton>}
                  </span>
                )
              })
            })()}
          </div>
          {devices.length === 0 ? null : savingScene ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.64rem', color: 'var(--muted)' }}>Save how things are now as</span>
              {SCENE_PRESETS.filter(p => !scenes.some(s => s.name.toLowerCase() === p.name.toLowerCase())).map(p => (
                <button key={p.name} onClick={() => { saveScene(p.name, p.icon); setSavingScene(false) }} className="btn btn-ghost press" style={{ fontSize: '0.64rem', padding: '0.2rem 0.5rem' }}>{p.name}</button>
              ))}
              {scenes.map(s => (
                <button key={s.id} onClick={() => { saveScene(s.name, s.icon); setSavingScene(false) }} className="btn btn-ghost press" style={{ fontSize: '0.64rem', padding: '0.2rem 0.5rem' }}>Update {s.name}</button>
              ))}
              <button onClick={() => setSavingScene(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.62rem' }}>cancel</button>
            </div>
          ) : (
            <button onClick={() => setSavingScene(true)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.64rem', opacity: 0.85, padding: 0 }}>
              + Save how things are now as a scene
            </button>
          )}
        </div>
      )}

      {roomNames.length > 1 && (
        <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '0.1rem' }}>
          {['All', ...roomNames].map(r => (
            <button key={r} onClick={() => setRoomTab(r)} className="press" style={{
              flexShrink: 0, minHeight: 32, padding: '0 0.75rem', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '0.72rem',
              border: `1px solid ${roomTab === r ? 'var(--gold)' : 'var(--border)'}`,
              background: roomTab === r ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
              color: roomTab === r ? 'var(--gold)' : 'var(--muted)',
            }}>{r}</button>
          ))}
        </div>
      )}

      {shownRooms.map(r => (
        <div key={r}>
          <div className="t-label" style={{ marginBottom: '0.35rem' }}>{r}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))', gap: '0.5rem' }}>
            {byRoom.get(r)!.map(d => {
              const v = deviceView(d)
              return (
                <div key={d.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0.6rem 0.75rem', background: d.on_state ? 'color-mix(in srgb, var(--gold) 6%, var(--surface))' : 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.82rem', color: 'var(--text)' }}>{d.name}</span>
                    {v.practice && (
                      <span style={{ fontSize: '0.58rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold)', border: '1px solid color-mix(in srgb, var(--gold) 45%, transparent)', borderRadius: 99, padding: '0.05rem 0.4rem' }}>Practice</span>
                    )}
                    <IconButton label={`Remove ${d.name}`} onClick={() => removeDevice(d.id)} size={10} style={{ opacity: 0.4 }}>✕</IconButton>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.1rem' }}>{KIND_INFO[v.kind].label}{v.real ? ' · Home Assistant' : ''} · {describe(v.kind, v.state)}</div>
                  <DeviceControls d={d} set={change => act(setDevice(d.id, change))} />
                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.35rem' }}>
                    <button onClick={() => { setEditing(e => ({ ...e, [d.id]: !e[d.id] })); setNoteDraft(nd => ({ ...nd, [d.id]: d.note ?? '' })) }} className="press"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)', opacity: 0.7, fontSize: '0.62rem', padding: 0 }}>
                      {d.note ? 'note' : '+ note'}
                    </button>
                    {!v.practice && (
                      <select value={d.room ?? ''} onChange={e => updateRoom(d.id, e.target.value || null)} aria-label={`${d.name} room`}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.62rem', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                        <option value="">move to room…</option>
                        {ROOMS.map(x => <option key={x} value={x}>{x}</option>)}
                      </select>
                    )}
                  </div>
                  {editing[d.id] ? (
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                      <input value={noteDraft[d.id] ?? ''} onChange={e => setNoteDraft(nd => ({ ...nd, [d.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveNote(d) } }}
                        placeholder="e.g. guest code 4471" style={{ ...input, flex: 1, fontSize: '0.68rem', padding: '0.25rem 0.5rem' }} autoFocus />
                      <button onClick={() => saveNote(d)} className="btn btn-ghost press" style={{ fontSize: '0.62rem', padding: '0.2rem 0.5rem' }}>Save</button>
                    </div>
                  ) : d.note ? (
                    <div style={{ fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.75, marginTop: '0.2rem' }}>{d.note}</div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <form
        onSubmit={async e => {
          e.preventDefault()
          if (!name.trim()) return
          await act(addDevice(name.trim(), room || null, kind))
          setName('')
        }}
        style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.2rem' }}
      >
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Add a device" style={{ ...input, flex: 1, minWidth: '140px' }} />
        <select value={kind} onChange={e => setKind(e.target.value as DeviceKind)} aria-label="Kind" style={{ ...input, cursor: 'pointer' }}>
          {KINDS.map(k => <option key={k} value={k}>{KIND_INFO[k].label}</option>)}
        </select>
        <select value={room} onChange={e => setRoom(e.target.value)} aria-label="Room" style={{ ...input, cursor: 'pointer' }}>
          <option value="">Room</option>
          {ROOMS.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
        <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
      </form>

      {spaceId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div className="t-label">Bin day</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
            {(['trash', 'recycling'] as const).map(k => (
              <label key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text)' }}>
                <span style={{ color: 'var(--muted)', textTransform: 'capitalize' }}>{k}</span>
                <select value={binDays[k] ?? ''}
                  onChange={e => saveBinDays({ ...binDays, [k]: e.target.value === '' ? undefined : Number(e.target.value) })}
                  style={{ fontSize: '0.72rem', fontFamily: 'inherit', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.2rem 0.4rem', color: 'var(--text)' }}>
                  <option value="">not set</option>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </label>
            ))}
          </div>
          <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.75 }}>
            The village puts a bin by the gate the evening before and the morning of.
          </div>
        </div>
      )}
    </section>
  )
}
