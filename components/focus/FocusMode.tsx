'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/LangContext'
import { t } from '@/lib/i18n'

interface WorkItem { id: string; title: string; project: string | null }
interface Habit    { id: string; name: string; category: string | null }

function pad(n: number) { return String(n).padStart(2, '0') }

interface Props {
  open: boolean
  onClose: () => void
}

export default function FocusMode({ open, onClose }: Props) {
  const lang = useLang()
  const supabase = createClient()

  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [habits,    setHabits]    = useState<Habit[]>([])
  const [selectedWork,  setSelectedWork]  = useState<string | null>(null)
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null)

  // Timer
  const [preset,   setPreset]   = useState(25)  // minutes
  const [custom,   setCustom]   = useState('')
  const [seconds,  setSeconds]  = useState(25 * 60)
  const [running,  setRunning]  = useState(false)
  const [finished, setFinished] = useState(false)
  // Session outcome — completing the work belongs to the session itself.
  const [loggedWork,  setLoggedWork]  = useState(false)
  const [loggedHabit, setLoggedHabit] = useState(false)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!open) return
    supabase.from('work_items').select('id, title, project').neq('status', 'done').limit(20)
      .then(({ data }) => setWorkItems(data ?? []))
    supabase.from('habits').select('id, name, category').limit(20)
      .then(({ data }) => setHabits(data ?? []))
  }, [open])

  // Esc leaves the session — an immersive surface needs an obvious exit.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function markWorkDone() {
    if (!selectedWork) return
    setLoggedWork(true)
    await supabase.from('work_items').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', selectedWork)
    window.dispatchEvent(new CustomEvent('4s:work-items-changed'))
  }

  async function logHabit() {
    if (!selectedHabit) return
    setLoggedHabit(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('habit_completions').insert({ habit_id: selectedHabit, completed_date: today, user_id: user.id })
    window.dispatchEvent(new CustomEvent('4s:habits-changed'))
  }

  const stop = useCallback(() => {
    if (interval.current) clearInterval(interval.current)
    setRunning(false)
  }, [])

  useEffect(() => {
    if (!running) return
    interval.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { stop(); setFinished(true); return 0 }
        return s - 1
      })
    }, 1000)
    return stop
  }, [running, stop])

  function startTimer() {
    setSeconds(preset * 60)
    setFinished(false)
    setLoggedWork(false)
    setLoggedHabit(false)
    setRunning(true)
  }

  function resetTimer() {
    stop()
    setSeconds(preset * 60)
    setFinished(false)
  }

  function changePreset(mins: number) {
    setPreset(mins)
    stop()
    setSeconds(mins * 60)
    setFinished(false)
  }

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const pct  = 1 - seconds / (preset * 60)
  const circumference = 2 * Math.PI * 54

  const selectedWorkItem  = workItems.find(w => w.id === selectedWork)
  const selectedHabitItem = habits.find(h => h.id === selectedHabit)

  if (!open) return null

  return (
    <div className="fade-in" style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(ellipse at top right, var(--aurora-1) 0%, transparent 55%), radial-gradient(ellipse at bottom left, var(--aurora-2) 0%, transparent 55%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '2rem',
    }}>
      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem', opacity: 0.5 }}
      >✕</button>

      <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5 }}>Focus Session</div>

      {/* Timer ring */}
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle
            cx="70" cy="70" r="54" fill="none"
            stroke={finished ? 'var(--emerald)' : 'var(--gold)'}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '0.15rem',
        }}>
          {finished ? (
            <div style={{ fontSize: '1.6rem' }}>✓</div>
          ) : (
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: 'var(--text)', letterSpacing: '0.02em', lineHeight: 1 }}>
              {pad(mins)}:{pad(secs)}
            </div>
          )}
        </div>
      </div>

      {/* Preset buttons */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[15, 25, 45, 60, 90].map(m => (
          <button key={m} onClick={() => { setCustom(''); changePreset(m) }} style={{
            padding: '0.3rem 0.7rem', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '0.7rem',
            border: `1px solid ${preset === m && !custom ? 'var(--gold)' : 'var(--border)'}`,
            background: preset === m && !custom ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
            color: preset === m && !custom ? 'var(--gold)' : 'var(--muted)',
          }}>{m}m</button>
        ))}
        <input
          type="number"
          value={custom}
          onChange={e => {
            setCustom(e.target.value)
            const v = parseInt(e.target.value)
            if (v > 0 && v <= 480) changePreset(v)
          }}
          placeholder="custom"
          min={1} max={480}
          style={{
            width: '68px', padding: '0.3rem 0.6rem', borderRadius: '8px',
            background: custom ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
            border: `1px solid ${custom ? 'var(--gold)' : 'var(--border)'}`,
            color: custom ? 'var(--gold)' : 'var(--muted)',
            fontFamily: 'var(--font-body)', fontSize: '0.7rem', outline: 'none',
          }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {!running && !finished && (
          <button onClick={startTimer} style={{
            padding: '0.55rem 1.5rem', borderRadius: '10px', cursor: 'pointer',
            background: 'var(--gold)', border: 'none', color: 'var(--bg)',
            fontFamily: 'var(--font-body)', fontSize: '0.8rem',
          }}>{t('start', lang)}</button>
        )}
        {running && (
          <button onClick={stop} style={{
            padding: '0.55rem 1.5rem', borderRadius: '10px', cursor: 'pointer',
            background: 'none', border: '1px solid var(--border)', color: 'var(--muted)',
            fontFamily: 'var(--font-body)', fontSize: '0.8rem',
          }}>{t('pause', lang)}</button>
        )}
        {(seconds < preset * 60) && (
          <button onClick={resetTimer} style={{
            padding: '0.55rem 1rem', borderRadius: '10px', cursor: 'pointer',
            background: 'none', border: '1px solid var(--border)', color: 'var(--muted)',
            fontFamily: 'var(--font-body)', fontSize: '0.8rem',
          }}>{t('reset', lang)}</button>
        )}
      </div>

      {finished && (
        <div style={{ fontSize: '0.85rem', color: 'var(--emerald)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.7rem', alignItems: 'center' }}>
          {t('Session complete — great work.', lang)}
          {/* Close the loop here — the session owns its outcome */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {selectedWorkItem && (
              <button onClick={markWorkDone} disabled={loggedWork} className="btn btn-secondary" style={{ fontSize: '0.72rem', opacity: loggedWork ? 0.6 : 1 }}>
                {loggedWork ? '✓ Task done' : `Mark "${selectedWorkItem.title.slice(0, 28)}${selectedWorkItem.title.length > 28 ? '…' : ''}" done`}
              </button>
            )}
            {selectedHabitItem && (
              <button onClick={logHabit} disabled={loggedHabit} className="btn btn-secondary" style={{ fontSize: '0.72rem', opacity: loggedHabit ? 0.6 : 1 }}>
                {loggedHabit ? '✓ Habit logged' : `Log "${selectedHabitItem.name.slice(0, 28)}${selectedHabitItem.name.length > 28 ? '…' : ''}"`}
              </button>
            )}
          </div>
          <button onClick={startTimer} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}>{t('go again', lang)}</button>
        </div>
      )}

      {/* Selection */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: 440 }}>
        <Select
          label={t('Working on', lang)}
          placeholder={t('Pick a task…', lang)}
          options={workItems.map(w => ({ id: w.id, label: w.title, sub: w.project ?? undefined }))}
          value={selectedWork}
          onChange={setSelectedWork}
        />
        <Select
          label={t('Building', lang)}
          placeholder={t('Pick a habit…', lang)}
          options={habits.map(h => ({ id: h.id, label: h.name, sub: h.category ?? undefined }))}
          value={selectedHabit}
          onChange={setSelectedHabit}
        />
      </div>

      {/* Selected display */}
      {(selectedWorkItem || selectedHabitItem) && (
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {selectedWorkItem && (
            <div style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: 'color-mix(in srgb, var(--gold) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--gold) 20%, transparent)', fontSize: '0.75rem', color: 'var(--gold)' }}>
              ◈ {selectedWorkItem.title}
            </div>
          )}
          {selectedHabitItem && (
            <div style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: 'color-mix(in srgb, var(--emerald) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--emerald) 20%, transparent)', fontSize: '0.75rem', color: 'var(--emerald)' }}>
              ◉ {selectedHabitItem.name}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Select({ label, placeholder, options, value, onChange }: {
  label: string
  placeholder: string
  options: { id: string; label: string; sub?: string }[]
  value: string | null
  onChange: (id: string | null) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: '180px' }}>
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.5 }}>{label}</div>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value || null)}
        style={{
          background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '9px',
          color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
          padding: '0.45rem 0.75rem', outline: 'none', cursor: 'pointer',
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}
