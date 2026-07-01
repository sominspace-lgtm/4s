'use client'

import { useState } from 'react'
import { useFocusItems } from '@/lib/hooks/useFocusItems'
import EnergyToggle, { type Energy } from './EnergyToggle'
import PulseItem from './PulseItem'

export default function PulseSection() {
  const { items, snooze } = useFocusItems()
  const [energy, setEnergy] = useState<Energy>('any')

  const filtered = energy === 'any' ? items : items.filter(i => i.energy === energy)
  const focus = filtered.filter(i => i.type === 'focus')
  const problems = filtered.filter(i => i.type === 'problem')

  const colLabel: React.CSSProperties = {
    fontSize: '0.62rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)',
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.4rem 1.6rem' }}>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={colLabel}>On your mind</span>
            <EnergyToggle value={energy} onChange={setEnergy} />
          </div>
          {focus.length === 0
            ? <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>Nothing flagged</p>
            : focus.map(i => <PulseItem key={i.id} item={i} onSnooze={snooze} />)
          }
        </div>
        <div style={{ flex: 1, minWidth: '160px' }}>
          <div style={{ marginBottom: '0.6rem' }}>
            <span style={colLabel}>Quietly becoming a problem</span>
          </div>
          {problems.length === 0
            ? <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontStyle: 'italic' }}>All clear</p>
            : problems.map(i => <PulseItem key={i.id} item={i} onSnooze={snooze} />)
          }
        </div>
      </div>
    </div>
  )
}
