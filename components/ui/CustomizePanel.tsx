'use client'

import SectionCustomizer, { type SectionConfig } from '@/components/ui/SectionCustomizer'
import { saveLayout, type LayoutState } from '@/lib/persistence/saveLayout'

// Re-exported so every existing importer (DashboardClient, app/dashboard/
// page.tsx, saveLayout.ts) keeps working unchanged — the type itself now
// lives in SectionCustomizer.tsx, the shared drawer this file wraps. See
// that file's header for why it's shared rather than hand-copied per screen.
export type { SectionConfig }

// Today · Tasks · Habits · Notes · Money · People · Village · Household · Places
//
// Six tabs, ordered by how often you actually open them, each answering a
// question nobody has to guess at:
//   Today      — what's happening now?   (brief · inbox · calendar)
//   Tasks      — what do I need to do?   (the notice board)
//   Village    — what does my life look like?
//   Personal   — tasks · habits (+ goals) · notes · money · people (each a section)
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
// The personal areas (Tasks/Habits/Notes/Money/People) are their own
// top-level sections as of 2026-09-01 — they used to live one click behind
// a single "Personal" tab. Goals folded into Habits the same day. Household
// still nests one level down; see householdLayout.ts.
export const DEFAULT_SECTIONS: SectionConfig[] = [
  // Today — the Brief, Needs Attention, Quick Add/Inbox, and the calendar.
  // Section id stays 'brief': it's referenced by saved layouts, the
  // 'brief-inbox'/'week-review' scroll anchors, and every goToSection call.
  // Renaming the id to match the label would be a migration with nothing to
  // gain — the label is the only part anyone sees.
  { id: 'brief',    label: 'Today',    hidden: false },
  // The personal areas — top-level sections as of 2026-09-01 (was one
  // "Personal" tab with an internal switcher). Grouped visually under the
  // Personal icon in the Home Bar, but flat here.
  { id: 'tasks',    label: 'Tasks',    hidden: false },
  { id: 'habits',   label: 'Habits',   hidden: false },
  { id: 'notes',    label: 'Notes',    hidden: false },
  { id: 'money',    label: 'Money',    hidden: false },
  { id: 'people',   label: 'People',   hidden: false },
  // The village — your life as a place, not a dashboard.
  { id: 'village',  label: 'Village',  hidden: false },
  // Household's own sub-tabs, promoted to real top-level sections
  // (2026-08-25) — used to be nested one click behind a single "Household"
  // wrapping tab (still how shared mode's Home Bar groups them visually,
  // see DashboardClient's HOME_BAR_GROUPS, but the underlying sections are
  // flat now for both personal and shared use, not just shared). Smart Home
  // deliberately isn't here — it's overlay-only (SmartHomeOverlay), reached
  // by tapping Home in the Village or the Home Bar's Controls icon, never a
  // tab you switch into.
  // Home's own group is [home, reference]. Calendar folded into Home as a
  // block 2026-09-02 (was its own section 2026-08-21); Routines folded into
  // Reference 2026-08-25.
  { id: 'home',     label: 'Home',     hidden: false },
  { id: 'reference', label: 'Reference', hidden: false },
  // Places — saved pins and trips, on a themed map. Same position as the
  // Home Bar's own Places icon: right after Household's sections, before
  // Controls (Smart Home, overlay-only, never a section — see above).
  { id: 'places',   label: 'Places',   hidden: false },
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
    // blocks and your Household tab arrangement — the exact bug
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
