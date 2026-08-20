import type { SectionConfig } from '@/components/ui/SectionCustomizer'

export type PersonalTabId = 'tasks' | 'goals' | 'habits' | 'life' | 'money' | 'people' | 'preferences'

// council is deliberately NOT here. It's reachable only by deep link
// (Brief's "Ask Council" card, the header ⋯ menu via goToPersonal('council'))
// and was intentionally pulled off the visible tab bar (see
// components/personal/PersonalHub.tsx's header comment) — customization must
// not hand it a position or a hide toggle it was never meant to have.
export const DEFAULT_PERSONAL_TABS: SectionConfig[] = [
  // Folded in from the old top-level Tasks tab (2026-08-20) — tasks are
  // individual work, the same "mine" grouping DashboardClient's
  // SECTION_GROUPS already put it in, just now literally inside Personal
  // instead of merely labeled the same. First, since it's the one people
  // open most.
  { id: 'tasks',  label: 'Tasks',  hidden: false },
  { id: 'goals',  label: 'Goals',  hidden: false },
  { id: 'habits', label: 'Habits', hidden: false },
  { id: 'life',   label: 'Life',   hidden: false },
  { id: 'money',  label: 'Money',  hidden: false },
  { id: 'people', label: 'People', hidden: false },
  { id: 'preferences', label: 'Preferences', hidden: false },
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
