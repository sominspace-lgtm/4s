'use client'

import { useState } from 'react'
import { isSameDay, parseISO } from 'date-fns'
import type { SectionConfig } from '@/components/ui/SectionCustomizer'
import { useHousehold, choreDue } from '@/lib/hooks/useHousehold'
import { useDateIdeas } from '@/lib/hooks/useDateIdeas'
import type { VillageState } from '@/lib/village/state'
import NowNext from './NowNext'
import VillagePanelBlocks from './VillagePanelBlocks'

// The dock under the village scene for personal browsing (the wall's
// swipe-up counterpart is VillageHomeSheet). Collapsed = a one-line
// "what's happening" + Now/Next; expanded = the customizable home panel
// (VillagePanelBlocks, variant "dock"). The block set is shared with the
// wall and edited from the village ⋯ → Customize panel drawer.
export default function VillageWidgets({ userId, spaceId, village, panelBlocks }: {
  userId: string
  spaceId: string | null
  village?: VillageState | null
  panelBlocks?: SectionConfig[]
}) {
  const h = useHousehold(spaceId)
  const { ideas } = useDateIdeas(spaceId)
  const [open, setOpen] = useState(false)

  const today = new Date()
  const tonight = h.meals.find(m => m.slot === 'dinner' && isSameDay(parseISO(m.meal_date), today))
  const choresToday = h.chores.filter(c => choreDue(c) <= 0)
  const plannedIdeas = ideas.filter(i => i.status === 'planned')

  const happenings: { label: string; sub: string }[] = plannedIdeas
    .slice(0, 3)
    .map(i => ({ label: i.title, sub: 'planned' }))
  if (tonight && happenings.length < 3) {
    happenings.push({ label: tonight.title, sub: tonight.kind === 'eating_out' ? 'eating out tonight' : 'dinner tonight' })
  }

  const observation = happenings.length > 0
    ? `${happenings.length} thing${happenings.length > 1 ? 's are' : ' is'} happening`
    : choresToday.length > 0
      ? `Quiet, but ${choresToday.length} thing${choresToday.length > 1 ? 's' : ''} could use your attention.`
      : 'The village is quiet — nothing waiting on you right now.'

  return (
    <div className="lift organic" style={{
      marginTop: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      background: 'var(--surface)', overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="press"
        style={{
          width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)',
          background: 'none', border: 'none', padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{observation}</span>
          <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{open ? '▾ less' : '▸ more'}</span>
        </div>
        {happenings.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            {happenings.map((it, i) => (
              <div key={i} style={{ fontSize: '0.68rem', color: 'var(--muted)', display: 'flex', gap: '0.4rem' }}>
                <span style={{ color: 'var(--text)' }}>{it.label}</span>
                <span style={{ opacity: 0.7 }}>· {it.sub}</span>
              </div>
            ))}
          </div>
        )}
      </button>

      <div style={{ padding: '0 1rem 0.8rem' }}>
        <NowNext spaceId={spaceId} />
      </div>

      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '0.9rem 1rem 1.1rem' }}>
          <VillagePanelBlocks
            blocks={panelBlocks ?? []}
            variant="dock"
            spaceId={spaceId}
            userId={userId}
            village={village}
          />
        </div>
      )}
    </div>
  )
}
