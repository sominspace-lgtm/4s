import type { SectionConfig } from '@/components/ui/SectionCustomizer'

// Home / Calendar / Reference are top-level nav sections (2026-08-25) —
// DashboardClient renders one <HouseholdHub forcedTab={id}> each. `smarthome`
// stays a valid id because SmartHomeOverlay passes it as a forcedTab, but
// it's overlay-only, never a switchable tab. (A DEFAULT_HOUSEHOLD_TABS list
// + mergeHouseholdTabs lived here until 2026-09-01, when the internal
// tab-switcher they fed was removed — the sections customize through the
// main Customize-layout panel now.)
export type HouseholdTabId = 'home' | 'calendar' | 'smarthome' | 'reference'

// What's INSIDE Household's Home tab — the concrete "customizable like an
// iPhone home screen" layer. These used to be four scattered, non-contiguous
// `{tab === 'home' && ...}` blocks in HouseholdHub.tsx; pulling them into one
// ordered array is what makes reordering/hiding possible, the same refactor
// todayBlocks.ts did for Today.
// `calendar` became its own section 2026-08-21; `lists` moved into Reference
// the same day; `chores`/`routines` moved to Reference 2026-08-25.
// mergeHomeBlocks drops unknown saved ids, so a layout that still names any
// of these is cleaned up automatically.
export type HomeBlockId = 'thisWeek' | 'shopping' | 'meals' | 'moveIn'

export const HOME_BLOCK_META: Record<HomeBlockId, { label: string; hint: string }> = {
  // The week in review (2026-08-18) — same computation the bot posts on
  // Sundays, see lib/household/weeklyRecap.ts. First in the default order:
  // it's the one block that's about what already happened rather than
  // what's coming up, so it reads best before the forward-looking ones.
  thisWeek: { label: 'This week',         hint: 'What got done, in one glance' },
  shopping: { label: 'Shopping list',     hint: 'What to buy' },
  meals:    { label: 'This week’s meals', hint: 'What we’re eating' },
  // Folded in from the retired Move-In tab (2026-08-25) — the overview card
  // (address + spreadsheet link) and Near Our New Home, the two pieces that
  // weren't already duplicated elsewhere (House Rules stays canonical in
  // Reference only). Last in the default order since it's the newest and
  // least everyday of the four.
  moveIn:   { label: 'Move-in',           hint: 'The Millton — what’s around it, and the buy-list sheet' },
}

export const DEFAULT_HOME_BLOCKS: SectionConfig[] = (['thisWeek', 'shopping', 'meals', 'moveIn'] as HomeBlockId[])
  .map(id => ({ id, label: HOME_BLOCK_META[id].label, hint: HOME_BLOCK_META[id].hint, hidden: false }))

export function mergeHomeBlocks(saved: SectionConfig[] | null | undefined): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_HOME_BLOCKS
  const known = new Set(DEFAULT_HOME_BLOCKS.map(s => s.id))
  const cleaned = saved.filter(s => known.has(s.id))
  const have = new Set(cleaned.map(s => s.id))
  const missing = DEFAULT_HOME_BLOCKS.filter(s => !have.has(s.id))
  return [...cleaned, ...missing]
}
