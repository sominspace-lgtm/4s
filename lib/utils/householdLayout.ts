import type { SectionConfig } from '@/components/ui/SectionCustomizer'

export type HouseholdTabId = 'home' | 'reference' | 'movein' | 'setup'

export const DEFAULT_HOUSEHOLD_TABS: SectionConfig[] = [
  { id: 'home',      label: 'Home' },
  { id: 'reference', label: 'Reference' },
  // Move-in (2026-08-12) — furniture/appliance purchases for a shared move,
  // deliberately its own tab rather than folded into the Shopping block
  // inside Home: it's a different rhythm (big one-off purchases vs weekly
  // groceries) and, right when a move is actually happening, it deserves to
  // not be buried under everything else.
  { id: 'movein',    label: 'Move-in' },
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
export type HomeBlockId = 'calendar' | 'shopping' | 'chores' | 'meals'

export const HOME_BLOCK_META: Record<HomeBlockId, { label: string; hint: string }> = {
  calendar: { label: 'Calendar',          hint: 'Everything the house has on' },
  shopping: { label: 'Shopping list',     hint: 'What to buy' },
  chores:   { label: 'Whose turn',        hint: 'Chores and who’s due' },
  meals:    { label: 'This week’s meals', hint: 'What we’re eating' },
}

export const DEFAULT_HOME_BLOCKS: SectionConfig[] = (['calendar', 'shopping', 'chores', 'meals'] as HomeBlockId[])
  .map(id => ({ id, label: HOME_BLOCK_META[id].label, hint: HOME_BLOCK_META[id].hint, hidden: false }))

export function mergeHomeBlocks(saved: SectionConfig[] | null | undefined): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_HOME_BLOCKS
  const known = new Set(DEFAULT_HOME_BLOCKS.map(s => s.id))
  const cleaned = saved.filter(s => known.has(s.id))
  const have = new Set(cleaned.map(s => s.id))
  const missing = DEFAULT_HOME_BLOCKS.filter(s => !have.has(s.id))
  return [...cleaned, ...missing]
}
