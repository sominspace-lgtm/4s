'use client'

import { useState, useEffect } from 'react'
import { useHabits, type ScheduleType } from '@/lib/hooks/useHabits'
import { getLast7Days, DOMAIN_COLORS } from '@/lib/utils/habits'
import HabitRow from './HabitRow'
import { SkeletonRow } from '@/components/ui/Skeleton'

const DOW = [{ id: 0, label: 'S' }, { id: 1, label: 'M' }, { id: 2, label: 'T' }, { id: 3, label: 'W' }, { id: 4, label: 'T' }, { id: 5, label: 'F' }, { id: 6, label: 'S' }]

const DOMAINS = [
  { id: 'biz-active', label: 'Business (Active)' },
  { id: 'biz-future', label: 'Business (Future)' },
  { id: 'money', label: 'Money' },
  { id: 'health', label: 'Health' },
  { id: 'relationship', label: 'Relationship' },
  { id: 'creative', label: 'Creative' },
  { id: 'home', label: 'Home' },
  { id: 'self', label: 'Self' },
]

export default function HabitTracker() {
  const { habits, completions, loading, toggleDay, addHabit, updateSchedule, togglePaused, deleteHabit } = useHabits()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [scheduleType, setScheduleType] = useState<ScheduleType>('daily')
  const [intervalDays, setIntervalDays] = useState('2')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([])
  const days = getLast7Days()

  useEffect(() => {
    function onOpenRequest() { setShowForm(true) }
    window.addEventListener('app:open-add-habit', onOpenRequest)
    return () => window.removeEventListener('app:open-add-habit', onOpenRequest)
  }, [])

  function toggleDow(id: number) {
    setDaysOfWeek(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id].sort())
  }

  async function handleAdd() {
    if (!name.trim()) return
    await addHabit(name.trim(), category, {
      schedule_type: scheduleType,
      interval_days: scheduleType === 'interval' ? (parseInt(intervalDays) || 2) : null,
      days_of_week: scheduleType === 'weekly' ? (daysOfWeek.length > 0 ? daysOfWeek : [1]) : null,
    })
    setName('')
    setCategory('')
    setScheduleType('daily')
    setIntervalDays('2')
    setDaysOfWeek([])
    setShowForm(false)
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.78rem',
    fontWeight: 300, padding: '0.45rem 0.7rem', outline: 'none',
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.4rem 1.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 400, letterSpacing: '0.02em' }}>Streaks</div>
        <button onClick={() => setShowForm(o => !o)} style={{
          fontSize: '0.68rem', letterSpacing: '0.06em', color: 'var(--muted)',
          background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
          padding: '0.3em 0.8em', cursor: 'pointer', fontFamily: 'var(--font-body)',
        }}>
          {showForm ? 'cancel' : '+ add habit'}
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
        </div>
      )}

      {!loading && habits.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '1.2rem 0', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{ fontSize: '1.2rem', opacity: 0.3 }}>○</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.78 }}>No streaks yet. Start with one small promise.</p>
        </div>
      )}

      {!loading && habits.map(h => (
        <HabitRow key={h.id} habit={h} completions={completions[h.id] || []} days={days} onToggle={toggleDay} onDelete={deleteHabit} onTogglePaused={togglePaused} onUpdateSchedule={updateSchedule} />
      ))}

      {showForm && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--faint)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Habit name (e.g. Walk, Journal)"
              aria-label="Habit name"
              style={{ ...inputStyle, flex: 2, minWidth: '140px' }}
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              aria-label="Category"
              style={{ ...inputStyle, flex: 1, minWidth: '130px', color: category ? 'var(--text)' : 'var(--muted)', cursor: 'pointer' }}
            >
              <option value="">No category</option>
              {DOMAINS.map(d => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--muted)', opacity: 0.7 }}>Schedule</span>
            {(['daily', 'weekly', 'interval'] as ScheduleType[]).map(s => (
              <button key={s} onClick={() => setScheduleType(s)} style={{
                fontSize: '0.65rem', padding: '0.2em 0.6em', borderRadius: '99px', cursor: 'pointer',
                border: scheduleType === s ? '1px solid color-mix(in srgb, var(--gold) 40%, transparent)' : '1px solid var(--border)',
                background: scheduleType === s ? 'color-mix(in srgb, var(--gold) 10%, transparent)' : 'transparent',
                color: scheduleType === s ? 'var(--text)' : 'var(--muted)', fontFamily: 'var(--font-body)',
              }}>{s === 'daily' ? 'Every day' : s === 'weekly' ? 'Specific days' : 'Every N days'}</button>
            ))}

            {scheduleType === 'weekly' && (
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                {DOW.map(d => (
                  <button key={d.id} onClick={() => toggleDow(d.id)} style={{
                    width: '22px', height: '22px', borderRadius: '5px', cursor: 'pointer', fontSize: '0.6rem',
                    border: daysOfWeek.includes(d.id) ? '1px solid var(--gold)' : '1px solid var(--border)',
                    background: daysOfWeek.includes(d.id) ? 'color-mix(in srgb, var(--gold) 20%, transparent)' : 'transparent',
                    color: daysOfWeek.includes(d.id) ? 'var(--text)' : 'var(--muted)',
                  }}>{d.label}</button>
                ))}
              </div>
            )}
            {scheduleType === 'interval' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>every</span>
                <input value={intervalDays} onChange={e => setIntervalDays(e.target.value)} type="number" min={2} style={{ ...inputStyle, width: '54px', padding: '0.2em 0.4em' }} />
                <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>days</span>
              </div>
            )}
          </div>

          <button onClick={handleAdd} style={{
            alignSelf: 'flex-start', padding: '0.45em 1em', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--gold) 30%, transparent)',
            background: 'color-mix(in srgb, var(--gold) 8%, transparent)', color: 'var(--gold)',
            fontFamily: 'var(--font-body)', fontSize: '0.73rem', cursor: 'pointer',
          }}>
            Add
          </button>
        </div>
      )}
    </div>
  )
}
