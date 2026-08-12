'use client'

import SectionCustomizer, { type SectionConfig } from '@/components/ui/SectionCustomizer'
import { saveLayout, type LayoutState } from '@/lib/persistence/saveLayout'
import { TODAY_BLOCK_META, REORDERABLE, DEFAULT_TODAY_BLOCKS, type TodayBlockConfig } from '@/lib/utils/todayBlocks'

// Thin wrapper around the shared drawer (components/ui/SectionCustomizer.tsx)
// — this used to be its own hand-copy of CustomizePanel.tsx; now both wrap
// the same component. TodayBlockConfig only carries {id, hidden}, with the
// label/hint looked up from TODAY_BLOCK_META, so the boundary here maps to
// and from SectionConfig{id,label,hidden,hint} rather than persisting the
// label twice.
interface Props {
  open: boolean
  blocks: TodayBlockConfig[]
  current: LayoutState
  userId: string
  onChange: (blocks: TodayBlockConfig[]) => void
  onClose: () => void
}

function toSectionConfig(blocks: TodayBlockConfig[]): SectionConfig[] {
  return blocks.map(b => ({ id: b.id, label: TODAY_BLOCK_META[b.id].label, hint: TODAY_BLOCK_META[b.id].hint, hidden: b.hidden }))
}

function toTodayBlocks(sections: SectionConfig[]): TodayBlockConfig[] {
  return sections.map(s => ({ id: s.id as TodayBlockConfig['id'], hidden: s.hidden }))
}

export default function TodayCustomizePanel({ open, blocks, current, userId, onChange, onClose }: Props) {
  async function update(next: SectionConfig[]) {
    const nextBlocks = toTodayBlocks(next)
    onChange(nextBlocks)
    await saveLayout(userId, current, { todayBlocks: nextBlocks })
  }

  return (
    <SectionCustomizer
      open={open}
      title="Customize Today"
      intro="Reorder with ↑↓ or hide blocks with the eye toggle. One thing stays recommended at the top, but nothing here is required."
      sections={toSectionConfig(blocks)}
      reorderable={REORDERABLE}
      defaultSections={toSectionConfig(DEFAULT_TODAY_BLOCKS)}
      onChange={update}
      onClose={onClose}
    />
  )
}
