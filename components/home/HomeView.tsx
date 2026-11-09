'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import VillageScene from '@/components/village/scene/VillageScene'
import { buildVillage } from '@/lib/village/state'
import { seasonPalette } from '@/lib/village/palette'
import { celestialOf } from '@/lib/village/sky'
import { forestSlots, districtSlots } from '@/lib/village/layout'
import { sceneMood } from '@/lib/smarthome/sceneMood'
import { loadWeather, weatherMeta, type WeatherNow } from '@/lib/village/weather'
import { THEMES } from '@/lib/constants/themes'
import { useWakeLock } from '@/lib/hooks/useWakeLock'
import { GROUND_Y } from '@/components/village/scene/sceneData'
import type { HomeSnapshot } from '@/lib/home/snapshot'
import { binLineFor, partOfDayOf, FACES, type Face } from '@/lib/home/faces'

// HomeView (2026-11-08): the wall iPad's whole screen. The village fills it,
// with one of three clock faces over the top. Everything comes from
// /api/home/state on the screen's own key, so there is nothing personal here
// to open. Taps on the village just say so.

const FACE_KEY = 'home-face'
const REFRESH_MS = 2 * 60_000
const WEATHER_MS = 30 * 60_000

function readFace(): Face {
  try { const f = localStorage.getItem(FACE_KEY); if (f && (FACES as readonly string[]).includes(f)) return f as Face } catch {}
  return 'village'
}

/** `preview` (dev only, /ui-preview) draws from sample data and skips the server. */
export default function HomeView({ screenName, preview }: { screenName: string; preview?: HomeSnapshot }) {
  const [now, setNow] = useState<Date | null>(null)
  const [snap, setSnap] = useState<HomeSnapshot | null>(preview ?? null)
  const [weather, setWeather] = useState<WeatherNow | null>(null)
  const [face, setFace] = useState<Face>('village')
  const [menu, setMenu] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [aspect, setAspect] = useState<number | null>(null)
  useWakeLock(true)

  // Clock, sized screen and remembered face, all after mount so the server
  // render (in UTC, no window) never disagrees with the iPad's own.
  useEffect(() => {
    setFace(readFace())
    const tick = () => setNow(new Date())
    const size = () => setAspect(window.innerWidth / window.innerHeight)
    tick(); size()
    const id = setInterval(tick, 15_000)
    window.addEventListener('resize', size)
    return () => { clearInterval(id); window.removeEventListener('resize', size) }
  }, [])

  const refresh = useCallback(async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const res = await fetch(`/api/home/state?today=${today}`, { cache: 'no-store' }).catch(() => null)
    if (res?.status === 401) { window.location.replace('/pair'); return }
    if (res?.ok) setSnap(await res.json())
  }, [])

  useEffect(() => {
    if (preview) return
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    const onVis = () => { if (document.visibilityState === 'visible') { refresh(); setNow(new Date()) } }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [refresh, preview])

  useEffect(() => {
    loadWeather().then(setWeather)
    const id = setInterval(() => loadWeather(true).then(w => { if (w) setWeather(w) }), WEATHER_MS)
    return () => clearInterval(id)
  }, [])

  const accountCreated = snap?.accountCreated ? new Date(snap.accountCreated) : null
  const v = useMemo(() => buildVillage({
    habits: snap?.habits ?? [], completions: snap?.completions ?? {}, workItems: snap?.workItems ?? [],
    reflectionDays: 3, accountCreated, now: now ?? undefined,
  }), [snap, now, accountCreated])
  const palette = useMemo(() => seasonPalette(v.season, true), [v.season])
  const celestial = useMemo(() => (now ? celestialOf(now) : null), [now])
  const mood = useMemo(() => sceneMood(snap?.activeScene ?? null), [snap?.activeScene])
  const layout = snap?.layout ?? {}
  const plantSlots = useMemo(() => {
    const byId = new Map(v.plants.map(p => [p.id, p]))
    return forestSlots(v.plants.map(p => p.id), GROUND_Y)
      .map(s => ({ ...s, ...(layout[s.id] ?? {}), plant: byId.get(s.id)! }))
      .sort((a, b) => Number(b.back) - Number(a.back))
  }, [v.plants, layout])
  const buildingSlots = useMemo(() => {
    const byId = new Map(v.buildings.map(b => [b.id, b]))
    return districtSlots(v.buildings.map(b => b.id), GROUND_Y)
      .map(s => ({ ...s, building: byId.get(s.id)! }))
      .sort((a, b) => Number(b.back) - Number(a.back))
  }, [v.buildings])

  const partOfDay = partOfDayOf(now)
  const binLine = binLineFor(snap?.binDays ?? {}, now)
  const line = binLine ?? (snap?.dinner ? `Dinner: ${snap.dinner}` : null) ?? (snap?.activeScene ? snap.activeScene.name : null)
  const time = now ? format(now, 'h:mm') : ''
  const ampm = now ? format(now, 'a') : ''
  const date = now ? format(now, 'EEEE, MMMM d') : ''
  const weatherText = weather ? `${weather.tempF}° ${weatherMeta(weather.condition).label.toLowerCase()}` : null

  function pickFace(f: Face) {
    setFace(f); setMenu(false)
    try { localStorage.setItem(FACE_KEY, f) } catch {}
  }

  function hint() {
    setToast('Open 4S on your phone for that')
    setTimeout(() => setToast(null), 2200)
  }

  // The village's own cards still offer "Open Home" and friends. There is no
  // app behind this screen to open, so any of those just gets the hint.
  useEffect(() => {
    const names = ['4s:navigate', '4s:open-goals', 'app:open-smarthome', 'app:open-archive']
    const on = () => {
      setToast('Open 4S on your phone for that')
      setTimeout(() => setToast(null), 2200)
    }
    names.forEach(n => window.addEventListener(n, on))
    return () => names.forEach(n => window.removeEventListener(n, on))
  }, [])

  async function forget() {
    if (!window.confirm('Unpair this screen? It goes back to the pairing code.')) return
    await fetch('/api/devices/me', { method: 'DELETE' }).catch(() => null)
    window.location.replace('/pair')
  }

  const calm = face === 'calm'
  const dim = face === 'clock' ? 0.45 : calm ? 0.85 : 0

  return (
    <main style={{ ...THEMES.bloom, position: 'fixed', inset: 0, overflow: 'hidden', background: calm ? '#15131a' : 'var(--bg)', userSelect: 'none' } as React.CSSProperties}>
      {!calm && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <VillageScene village={v} live={now !== null} palette={palette}
            celestial={mood.forceNight ? null : celestial} sceneMood={mood}
            plantSlots={plantSlots} buildingSlots={buildingSlots} layout={layout} grown={snap?.grown ?? 0}
            idle={face !== 'village'} frozen={face !== 'village' && partOfDay === 'night'}
            weather={weather} partOfDay={partOfDay} binLine={binLine}
            dateKey={now ? format(now, 'yyyy-MM-dd') : null}
            containerAspect={aspect} locked onLockedNavigate={hint} />
        </div>
      )}
      {dim > 0 && !calm && <div style={{ position: 'absolute', inset: 0, background: `rgba(20, 18, 26, ${dim})`, pointerEvents: 'none', transition: 'background 0.6s' }} />}

      {face === 'village' ? (
        <div style={{
          position: 'absolute', top: 18, left: 18, padding: '0.8rem 1.1rem', borderRadius: 16, color: '#3f362e',
          background: 'rgba(255, 252, 245, 0.72)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(230, 216, 189, 0.8)', pointerEvents: 'none', maxWidth: '60vw',
        }}>
          <div style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: '2.4rem', lineHeight: 1 }}>
            {time}<span style={{ fontSize: '0.95rem', marginLeft: 6, opacity: 0.6 }}>{ampm}</span>
          </div>
          <div style={{ fontSize: '0.9rem', marginTop: 6, opacity: 0.75 }}>{date}{weatherText ? `  ·  ${weatherText}` : ''}</div>
          {line && <div style={{ fontSize: '0.9rem', marginTop: 4 }}>{line}</div>}
        </div>
      ) : (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: calm ? 'rgba(240, 228, 210, 0.72)' : '#fffaf0', pointerEvents: 'none', textAlign: 'center', padding: '0 1rem',
          textShadow: calm ? 'none' : '0 2px 18px rgba(0,0,0,0.35)',
        }}>
          <div style={{ fontFamily: 'var(--font-display, Georgia, serif)', fontSize: calm ? 'min(22vw, 13rem)' : 'min(26vw, 16rem)', lineHeight: 1, fontWeight: 300, fontVariantNumeric: 'tabular-nums' }}>
            {time}
          </div>
          <div style={{ fontSize: 'min(4.2vw, 1.6rem)', marginTop: '1.2rem', opacity: 0.85 }}>{date}</div>
          {!calm && (weatherText || line) && (
            <div style={{ fontSize: 'min(3.4vw, 1.25rem)', marginTop: '0.6rem', opacity: 0.8 }}>
              {[weatherText, line].filter(Boolean).join('  ·  ')}
            </div>
          )}
        </div>
      )}

      {toast && (
        <div style={{
          position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)', padding: '0.6rem 1rem', borderRadius: 999,
          background: 'rgba(40, 34, 30, 0.82)', color: '#fffaf0', fontSize: '0.9rem', pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>{toast}</div>
      )}

      <button onClick={() => setMenu(m => !m)} aria-label="Screen options" style={{
        position: 'absolute', right: 14, bottom: 14, width: 44, height: 44, borderRadius: 22, border: 'none',
        background: calm ? 'rgba(255,255,255,0.06)' : 'rgba(255, 252, 245, 0.55)', color: calm ? 'rgba(240,228,210,0.5)' : '#5a4d40',
        fontSize: '1.2rem', cursor: 'pointer', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
      }}>⋯</button>

      {menu && (
        <div style={{
          position: 'absolute', right: 14, bottom: 66, width: 230, padding: '0.6rem', borderRadius: 16,
          background: 'rgba(255, 252, 245, 0.96)', border: '1px solid #e6d8bd', boxShadow: '0 10px 30px rgba(0,0,0,0.15)', color: '#4a3f35',
        }}>
          <div style={{ fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.55, padding: '0.3rem 0.5rem' }}>Face</div>
          {FACES.map(f => (
            <button key={f} onClick={() => pickFace(f)} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '0.65rem 0.6rem', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: f === face ? '#f3e7cf' : 'transparent', color: 'inherit', fontSize: '0.98rem', fontFamily: 'inherit',
            }}>{FACE_LABEL[f]}</button>
          ))}
          <div style={{ height: 1, background: '#eee2cc', margin: '0.4rem 0' }} />
          <div style={{ fontSize: '0.78rem', opacity: 0.6, padding: '0.3rem 0.6rem' }}>{screenName}{snap?.household ? ` · ${snap.household}` : ''}</div>
          <button onClick={forget} style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '0.65rem 0.6rem', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'transparent', color: '#b4553f', fontSize: '0.95rem', fontFamily: 'inherit',
          }}>Unpair this screen</button>
        </div>
      )}
    </main>
  )
}

const FACE_LABEL: Record<Face, string> = { village: 'Village', clock: 'Big clock', calm: 'Night' }
