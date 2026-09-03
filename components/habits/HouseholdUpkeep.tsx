'use client'

import { useState } from 'react'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useHousehold, choreDue } from '@/lib/hooks/useHousehold'
import { useRoutines, routineDue } from '@/lib/hooks/useRoutines'
import { goToHousehold } from '@/lib/utils/navigate'

// Household chores + routines, surfaced read-mostly inside the Habits
// section (2026-09-03). Same recurring-upkeep shape as personal routines
// just above; this is "what does the house need" without leaving the tab.
// Adding, editing and folders all still live in Household — here you can
// only see what's due and tick it off, which writes the same row Household
// reads so the two stay in sync.
export default function HouseholdUpkeep({ userId }: { userId: string }) {
  const { spaces, members } = useSharedSpaces(userId)
  // The space the household actually uses — first one with an accepted
  // member, same rule HouseholdHub picks (not spaces[0], which can be an
  // empty solo space).
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null

  const { chores, markChoreDone } = useHousehold(spaceId)
  const { routines, markRoutineDone } = useRoutines(spaceId)
  const [open, setOpen] = useState(false)

  if (!spaceId) return null

  const rows: { id: string; name: string; due: number; done: () => void }[] = [
    ...chores.map(c => ({ id: `c-${c.id}`, name: c.name, due: choreDue(c), done: () => markChoreDone(c.id) })),
    ...routines
      .filter(r => r.kind === 'routine')
      .map(r => ({ id: `r-${r.id}`, name: r.name, due: routineDue(r), done: () => markRoutineDone(r.id) })),
  ].sort((a, b) => a.due - b.due)

  const overdue = rows.filter(r => r.due < 0).length

  return (
    <details
      open={open}
      onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.1rem 1.4rem', marginTop: '1rem' }}
    >
      <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>▸</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', fontWeight: 400 }}>Household upkeep</span>
        {overdue > 0 && (
          <span style={{ fontSize: '0.6rem', color: 'var(--rose)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{overdue} overdue</span>
        )}
      </summary>

      <div style={{ marginTop: '0.9rem' }}>
        {rows.length === 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
            Nothing set up. Add chores and routines in Household.
          </div>
        )}

        {rows.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0', borderBottom: '1px solid var(--faint)' }}>
            <button
              onClick={r.done}
              aria-label={`Mark ${r.name} done`}
              className="press"
              style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--border)', background: 'transparent', cursor: 'pointer' }}
            />
            <span style={{ flex: 1, minWidth: 0, fontSize: '0.8rem', color: 'var(--text)' }}>{r.name}</span>
            <span style={{ flexShrink: 0, fontSize: '0.66rem', color: r.due < 0 ? 'var(--rose)' : 'var(--muted)', opacity: r.due < 0 ? 1 : 0.75 }}>
              {r.due < 0 ? `${-r.due}d overdue` : r.due === 0 ? 'due now' : `in ${r.due}d`}
            </span>
          </div>
        ))}

        <button
          onClick={() => goToHousehold('reference')}
          className="press"
          style={{ marginTop: '0.7rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.66rem', padding: 0, opacity: 0.7 }}
        >
          See in Household →
        </button>
      </div>
    </details>
  )
}
