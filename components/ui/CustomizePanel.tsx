'use client'

import SectionCustomizer, { type SectionConfig } from '@/components/ui/SectionCustomizer'
import { saveLayout, type LayoutState } from '@/lib/persistence/saveLayout'

// Re-exported so every existing importer (DashboardClient, app/dashboard/
// page.tsx, saveLayout.ts, FocusViewPanel) keeps working unchanged — the
// type itself now lives in SectionCustomizer.tsx, the shared drawer this
// file wraps. See that file's header for why it's shared rather than
// hand-copied per screen.
export type { SectionConfig }

export interface FocusConfig {
  sections: string[]
}

export const DEFAULT_FOCUS_CONFIG: FocusConfig = {
  sections: ['brief', 'work'],
}

// Today · Tasks · Village · Personal · Household · Places
//
// Six tabs, ordered by how often you actually open them, each answering a
// question nobody has to guess at:
//   Today      — what's happening now?   (brief · inbox · calendar)
//   Tasks      — what do I need to do?   (the notice board)
//   Village    — what does my life look like?
//   Personal   — everything about me     (habits · life · money · people · council)
//   Household  — everything we share     (chores · meals)
//   Places     — where do we want to be? (a themed map, saved pins, trips)
//
// The organising split is mine vs ours. That's the distinction a person
// actually feels day to day, and it's a better dividing line than the
// previous one, where Money and People each owned a top-level tab despite
// being opened far less often than Today or Tasks.
//
// Calendar stopped being a tab (2026-08-07). A calendar isn't a place you go
// to live, it's something you check — and once it was 4S's own data rather
// than a Google iframe, "Calendar" and "Today" were the same question asked
// twice. It's a panel inside Today now.
// Four top-level tabs (2026-08-20), down from six: Tasks folded into
// Personal as a sub-tab, Places folded into Household (now labeled "Shared")
// as a sub-tab. Both used to be their own top-level entries that happened to
// share a SECTION_GROUPS grouping ('now' with Today, 'ours' with Household)
// with something else — this just makes that grouping literal instead of
// two same-labeled tabs sitting side by side. See personalTabs.ts and
// householdLayout.ts for where they actually live now.
export const DEFAULT_SECTIONS: SectionConfig[] = [
  // Today — the Brief, Needs Attention, Quick Add/Inbox, and the calendar.
  // Section id stays 'brief': it's referenced by saved layouts, the
  // 'brief-inbox'/'week-review' scroll anchors, and every goToSection call.
  // Renaming the id to match the label would be a migration with nothing to
  // gain — the label is the only part anyone sees.
  { id: 'brief',    label: 'Today',    hidden: false },
  // Personal — Tasks, Habits, Life, Money, People and Council as flat
  // sub-tabs. Flat on purpose: nesting Growth inside Personal would have put
  // Council three levels deep. See components/personal/PersonalHub.tsx.
  { id: 'personal', label: 'Personal', hidden: false },
  // The village — your life as a place, not a dashboard.
  { id: 'village',  label: 'Village',  hidden: false },
  // Shared (id stays 'household' — see the label-vs-id note in
  // DashboardClient.tsx's LABELS map) — chores, meals, and now Places, for
  // the people you live with.
  { id: 'household', label: 'Shared', hidden: false },
]

interface CustomizePanelProps {
  open: boolean
  sections: SectionConfig[]
  /** The COMPLETE current layout. See the note in update(). */
  current: LayoutState
  userId: string
  onChange: (sections: SectionConfig[]) => void
  onClose: () => void
}

export default function CustomizePanel({ open, sections, current, userId, onChange, onClose }: CustomizePanelProps) {
  async function update(next: SectionConfig[]) {
    onChange(next)
    // `current` must be the COMPLETE LayoutState. This used to be built here
    // from four props, so reordering your sections silently reset your Today
    // blocks and your Personal and Household tab arrangements — the exact bug
    // lib/persistence/saveLayout.ts was written to end, reintroduced by
    // rebuilding the object by hand in a second place.
    await saveLayout(userId, current, { sections: next })
  }

  return (
    <SectionCustomizer
      open={open}
      title="Customize layout"
      sections={sections}
      defaultSections={DEFAULT_SECTIONS}
      onChange={update}
      onClose={onClose}
    />
  )
}
