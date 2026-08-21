import type { SectionConfig } from '@/components/ui/SectionCustomizer'

// Three tabs (2026-08-21), down from five. Places went back to top level;
// Move-in retired (its household_movein_items rows are NOT deleted — the tab
// is just gone, so re-adding it here brings the data straight back); Setup
// moved into Settings, where account-level configuration already lives.
export type HouseholdTabId = 'home' | 'calendar' | 'reference'

export const DEFAULT_HOUSEHOLD_TABS: SectionConfig[] = [
  { id: 'home',      label: 'Home' },
  // Promoted from a Home block to its own tab (2026-08-21) — a shared
  // calendar is a thing you go and look at, not one card among six competing
  // for the top of a scroll.
  { id: 'calendar',  label: 'Calendar' },
  { id: 'reference', label: 'Reference' },
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
// `calendar` left this list on 2026-08-21 — it's a tab of its own now, see
// DEFAULT_HOUSEHOLD_TABS above. mergeHomeBlocks drops unknown saved ids, so
// anyone whose layout still names it is cleaned up automatically.
export type HomeBlockId = 'thisWeek' | 'shopping' | 'chores' | 'routines' | 'meals' | 'lists'

export const HOME_BLOCK_META: Record<HomeBlockId, { label: string; hint: string }> = {
  // The week in review (2026-08-18) — same computation the bot posts on
  // Sundays, see lib/household/weeklyRecap.ts. First in the default order:
  // it's the one block that's about what already happened rather than
  // what's coming up, so it reads best before the forward-looking ones.
  thisWeek: { label: 'This week',         hint: 'What got done, in one glance' },
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

export const DEFAULT_HOME_BLOCKS: SectionConfig[] = (['thisWeek', 'shopping', 'chores', 'routines', 'meals', 'lists'] as HomeBlockId[])
  .map(id => ({ id, label: HOME_BLOCK_META[id].label, hint: HOME_BLOCK_META[id].hint, hidden: false }))

export function mergeHomeBlocks(saved: SectionConfig[] | null | undefined): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_HOME_BLOCKS
  const known = new Set(DEFAULT_HOME_BLOCKS.map(s => s.id))
  const cleaned = saved.filter(s => known.has(s.id))
  const have = new Set(cleaned.map(s => s.id))
  const missing = DEFAULT_HOME_BLOCKS.filter(s => !have.has(s.id))
  return [...cleaned, ...missing]
}
