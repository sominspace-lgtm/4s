'use client'

import { useState } from 'react'
import { useDomains } from '@/lib/hooks/useDomains'
import { useDomainTouched } from '@/lib/hooks/useDomainTouched'
import DomainTile from './DomainTile'
import DomainCustomizePanel from './DomainCustomizePanel'

export default function DomainGrid() {
  const { domains, visible, move, toggle, addDomain, removeDomain, resetToDefault } = useDomains()
  const { touched, touch } = useDomainTouched()
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <>
      <DomainCustomizePanel
        open={panelOpen}
        domains={domains}
        onClose={() => setPanelOpen(false)}
        onMove={move}
        onToggle={toggle}
        onAdd={addDomain}
        onRemove={removeDomain}
        onReset={resetToDefault}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
        <button
          onClick={() => setPanelOpen(true)}
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: '8px',
            padding: '0.28rem 0.7rem', color: 'var(--muted)', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '0.65rem', letterSpacing: '0.06em',
          }}
        >⊹ edit domains</button>
      </div>

      {visible.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', fontSize: '0.75rem', color: 'var(--muted)', opacity: 0.5 }}>
          All domains hidden. Click <strong>⊹ edit domains</strong> to show some.
        </div>
      ) : (
        <div className="grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {visible.map(d => (
            <DomainTile
              key={d.id}
              domain={d}
              lastTouched={touched[d.id] ?? null}
              onOpen={() => touch(d.id)}
            />
          ))}
        </div>
      )}
    </>
  )
}
