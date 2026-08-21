import type { SectionConfig } from '@/components/ui/SectionCustomizer'

export type PersonalTabId = 'tasks' | 'goals' | 'habits' | 'notes' | 'money' | 'people' | 'preferences' | 'council'

export const DEFAULT_PERSONAL_TABS: SectionConfig[] = [
  // Folded in from the old top-level Tasks tab (2026-08-20) — tasks are
  // individual work, the same "mine" grouping DashboardClient's
  // SECTION_GROUPS already put it in, just now literally inside Personal
  // instead of merely labeled the same. First, since it's the one people
  // open most.
  { id: 'tasks',  label: 'Tasks',  hidden: false },
  { id: 'goals',  label: 'Goals',  hidden: false },
  { id: 'habits', label: 'Habits', hidden: false },
  // Replaced Life/Domains (2026-08-21) — nine fixed categories that only
  // ever held one-line captures, no titles, no real editing. Notes is a
  // proper Apple-Notes-style list instead: any title, any length, revisable,
  // shareable per-note. Same tab slot, same position in the bar.
  { id: 'notes',  label: 'Notes',  hidden: false },
  { id: 'money',  label: 'Money',  hidden: false },
  { id: 'people', label: 'People', hidden: false },
  { id: 'preferences', label: 'Preferences', hidden: false },
  // Promoted from a header-menu-only deep link (2026-08-21) — "Convene the
  // Council" lived in the ⋯ menu next to Ask Jarvis, which is now gone, and
  // an occasional-use action deserves a real tab in the place it's about
  // more than it deserves a permanent line in an overflow menu.
  { id: 'council', label: 'Council', hidden: false },
]

// Same merge shape as mergeTodayBlocks(): a saved list might predate a tab
// added later, or carry one that no longer exists — missing ids get
// appended (visible), unknown ids get dropped.
export function mergePersonalTabs(saved: SectionConfig[] | null | undefined): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_PERSONAL_TABS
  const known = new Set(DEFAULT_PERSONAL_TABS.map(s => s.id))
  const cleaned = saved.filter(s => known.has(s.id))
  const have = new Set(cleaned.map(s => s.id))
  const missing = DEFAULT_PERSONAL_TABS.filter(s => !have.has(s.id))
  return [...cleaned, ...missing]
}
