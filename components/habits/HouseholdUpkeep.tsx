'use client'

import { useState } from 'react'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useHousehold, choreDue } from '@/lib/hooks/useHousehold'
import { goToHousehold } from '@/lib/utils/navigate'

// The house's recurring chores, surfaced read-mostly inside the Habits
// section (2026-09-03, trimmed 2026-09-09). Adding, editing and folders
// live in Household's Upkeep tab; here you see what's due and tick it off,
// writing the same row Household reads so the two stay in sync. Routines
// were removed from Household, so this is chores only now.
export default function HouseholdUpkeep({ userId }: { userId: string }) {
  const { spaces, members } = useSharedSpaces(userId)
  // The space the household actually uses — first one with an accepted
  // member, same rule HouseholdHub picks (not spaces[0], which can be an
  // empty solo space).
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? null

  const { chores, markChoreDone } = useHousehold(spaceId)
  const [open, setOpen] = useState(true)

  if (!spaceId) return null

  // Somi's chores moved to the care log — don't show them on a cadence here.
  const rows = chores
    .filter(c => !/somi/i.test(c.folder ?? ''))
    .map(c => ({ id: c.id, name: c.name, due: choreDue(c), last: c.last_done_at }))
    .sort((a, b) => a.due - b.due)

  const overdue = rows.filter(r => r.due < 0).length

  const lastLabel = (iso: string | null) => {
    if (!iso) return 'not yet'
    const d = differenceInCalendarDays(new Date(), parseISO(iso))
    if (d <= 0) return 'today'
    if (d === 1) return 'yesterday'
    if (d < 14) return `${d}d ago`
    return `${Math.round(d / 7)}w ago`
  }

  return (
    <details
      open={open}
      onToggle={e => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.1rem 1.4rem', marginTop: '1rem' }}
    >
      <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}>▸</span>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', fontWeight: 400 }}>Household chores</span>
        {overdue > 0 && (
          <span style={{ fontSize: '0.6rem', color: 'var(--rose)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{overdue} overdue</span>
        )}
      </summary>

      <div style={{ marginTop: '0.9rem' }}>
        {rows.length === 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
            No chores set up. Add them in Household&rsquo;s Upkeep tab.
          </div>
        )}

        {rows.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0', borderBottom: '1px solid var(--faint)' }}>
            <button
              onClick={() => markChoreDone(r.id)}
              aria-label={`Mark ${r.name} done`}
              className="press"
              style={{
                flexShrink: 0, width: 18, height: 18, borderRadius: '50%', cursor: 'pointer',
                border: `1.5px solid ${r.due <= 0 ? 'var(--emerald)' : 'var(--border)'}`,
                background: r.due <= 0 ? 'color-mix(in srgb, var(--emerald) 16%, transparent)' : 'transparent',
              }}
            />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{r.name}</span>
              <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.72 }}>last done {lastLabel(r.last)}</span>
            </div>
            <span style={{ flexShrink: 0, fontSize: '0.66rem', color: r.due < 0 ? 'var(--rose)' : 'var(--muted)', opacity: r.due < 0 ? 1 : 0.75 }}>
              {r.due < 0 ? `${-r.due}d overdue` : r.due === 0 ? 'due now' : `in ${r.due}d`}
            </span>
          </div>
        ))}

        <button
          onClick={() => goToHousehold('upkeep')}
          className="press"
          style={{ marginTop: '0.7rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.66rem', padding: 0, opacity: 0.7 }}
        >
          Open Upkeep in Household →
        </button>
      </div>
    </details>
  )
}
