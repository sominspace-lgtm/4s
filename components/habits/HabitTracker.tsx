'use client'

import { useState, useEffect } from 'react'
import { useHabits } from '@/lib/hooks/useHabits'
import { getLast7Days, DOMAIN_COLORS } from '@/lib/utils/habits'
import HabitRow from './HabitRow'
import { SkeletonRow } from '@/components/ui/Skeleton'

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
  const { habits, completions, loading, toggleDay, addHabit, deleteHabit } = useHabits()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const days = getLast7Days()

  useEffect(() => {
    function onOpenRequest() { setShowForm(true) }
    window.addEventListener('app:open-add-habit', onOpenRequest)
    return () => window.removeEventListener('app:open-add-habit', onOpenRequest)
  }, [])

  async function handleAdd() {
    if (!name.trim()) return
    await addHabit(name.trim(), category)
    setName('')
    setCategory('')
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
          <p style={{ fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.6 }}>No streaks yet. Start with one small promise.</p>
        </div>
      )}

      {!loading && habits.map(h => (
        <HabitRow key={h.id} habit={h} completions={completions[h.id] || []} days={days} onToggle={toggleDay} onDelete={deleteHabit} />
      ))}

      {showForm && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px solid var(--faint)', flexWrap: 'wrap' }}>
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
          <button onClick={handleAdd} style={{
            padding: '0.45em 1em', borderRadius: '8px', border: '1px solid rgba(232,160,192,0.3)',
            background: 'rgba(232,160,192,0.08)', color: 'var(--gold)',
            fontFamily: 'var(--font-body)', fontSize: '0.73rem', cursor: 'pointer',
          }}>
            Add
          </button>
        </div>
      )}
    </div>
  )
}
