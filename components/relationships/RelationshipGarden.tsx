'use client'

import { useMemo, useRef } from 'react'
import { usePeople } from '@/lib/hooks/usePeople'
import { usePersonPreferenceCounts } from '@/lib/hooks/usePersonPreferences'
import { treeFor } from '@/lib/relationships/garden'
import { gardenSlots } from '@/lib/village/layout'
import RelationshipScene from './scene/RelationshipScene'
import RelationshipMemory from './RelationshipMemory'

const GROUND_Y = 200

// "Make relationships into the systems like village" — People gets the same
// treatment Habits/Tasks got: a picture above the practical list, not a
// replacement for it. The garden is read-only navigation (click a tree,
// jump to that person's card); every actual edit — adding someone, logging
// a preference, marking a hello — still happens in RelationshipMemory below,
// unchanged. This file only computes what the picture needs to show.
export default function RelationshipGarden() {
  const { people, loading } = usePeople()
  const prefCounts = usePersonPreferenceCounts()
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const trees = useMemo(
    () => people.map(p => treeFor(p, prefCounts[p.id] ?? 0)),
    [people, prefCounts]
  )

  const slots = useMemo(() => {
    const byId = new Map(trees.map(t => [t.id, t]))
    return gardenSlots(trees.map(t => t.id), GROUND_Y)
      .map(s => ({ ...s, tree: byId.get(s.id)! }))
  }, [trees])

  function scrollToPerson(id: string) {
    const el = cardRefs.current[id]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.add('village-changed')
    setTimeout(() => el.classList.remove('village-changed'), 1200)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {!loading && (
        <div className="organic" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
          <RelationshipScene trees={trees} slots={slots} onSelect={scrollToPerson} />
        </div>
      )}
      <RelationshipMemory cardRef={(id, el) => { cardRefs.current[id] = el }} />
    </div>
  )
}
