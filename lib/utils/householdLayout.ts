import type { SectionConfig } from '@/components/ui/SectionCustomizer'

export type HouseholdTabId = 'home' | 'reference' | 'movein' | 'places' | 'setup'

export const DEFAULT_HOUSEHOLD_TABS: SectionConfig[] = [
  { id: 'home',      label: 'Home' },
  { id: 'reference', label: 'Reference' },
  // Move-in (2026-08-12) — furniture/appliance purchases for a shared move,
  // deliberately its own tab rather than folded into the Shopping block
  // inside Home: it's a different rhythm (big one-off purchases vs weekly
  // groceries) and, right when a move is actually happening, it deserves to
  // not be buried under everything else.
  { id: 'movein',    label: 'Move-in' },
  // Folded in from the old top-level Places tab (2026-08-20) — pins and
  // trips were already the "ours" group in DashboardClient's SECTION_GROUPS,
  // same as Household; this just makes that literal instead of two tabs
  // that happened to share a label.
  { id: 'places',    label: 'Places' },
  { id: 'setup',     label: 'Setup' },
].map(s => ({ ...s, hidden: false }))

export function mergeHouseholdTabs(saved: SectionConfig[] | null | undefined): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_HOUSEHOLD_TABS
  const known = new Set(DEFAULT_HOUSEHOLD_TABS.map(s => s.id))
  const cleaned = saved.filter(s => known.has(s.id))
  const have = new Set(cleaned.map(s => s.id))
  const missing = DEFAULT_HOUSEHOLD_TABS.filter(s => !have.has(s.id))
  return [...cleaned, ...missing]
}

// What's INSIDE Household's Home tab — the concrete "customizable like an
// iPhone home screen" layer, one level deeper than the tab bar itself. These
// used to be four scattered, non-contiguous `{tab === 'home' && ...}` blocks
// in HouseholdHub.tsx; pulling them into one ordered array is what makes
// reordering/hiding possible at all, the same refactor todayBlocks.ts already
// did for Today.
export type HomeBlockId = 'thisWeek' | 'calendar' | 'shopping' | 'chores' | 'routines' | 'meals' | 'lists'

export const HOME_BLOCK_META: Record<HomeBlockId, { label: string; hint: string }> = {
  // The week in review (2026-08-18) — same computation the bot posts on
  // Sundays, see lib/household/weeklyRecap.ts. First in the default order:
  // it's the one block that's about what already happened rather than
  // what's coming up, so it reads best before the forward-looking ones.
  thisWeek: { label: 'This week',         hint: 'What got done, in one glance' },
  calendar: { label: 'Calendar',          hint: 'Everything the house has on' },
  shopping: { label: 'Shopping list',     hint: 'What to buy' },
  chores:   { label: 'Whose turn',        hint: 'Chores and who’s due' },
  // Grouped multi-step chores (2026-08-13) — "Sunday Home Reset" containing
  // Bathroom/Kitchen/Laundry/Trash/Sheets — separate from the flat chores
  // list above, which stays the lightweight single-item "whose turn" list.
  routines: { label: 'Routines',          hint: 'Multi-step chores, done together' },
  meals:    { label: 'This week’s meals', hint: 'What we’re eating' },
  // Generic ad-hoc lists (2026-08-13) — anything that isn't groceries,
  // move-in, or a watchlist: "things to research", "gift ideas for Mom".
  lists:    { label: 'Lists',             hint: 'Anything else worth a checklist' },
}

export const DEFAULT_HOME_BLOCKS: SectionConfig[] = (['thisWeek', 'calendar', 'shopping', 'chores', 'routines', 'meals', 'lists'] as HomeBlockId[])
  .map(id => ({ id, label: HOME_BLOCK_META[id].label, hint: HOME_BLOCK_META[id].hint, hidden: false }))

export function mergeHomeBlocks(saved: SectionConfig[] | null | undefined): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_HOME_BLOCKS
  const known = new Set(DEFAULT_HOME_BLOCKS.map(s => s.id))
  const cleaned = saved.filter(s => known.has(s.id))
  const have = new Set(cleaned.map(s => s.id))
  const missing = DEFAULT_HOME_BLOCKS.filter(s => !have.has(s.id))
  return [...cleaned, ...missing]
}
