import type { SectionConfig } from '@/components/ui/SectionCustomizer'

// Five tabs (2026-08-25). Places went back to top level; Setup moved into
// Settings, where account-level configuration already lives.
//
// Move-In removed again (2026-08-25) — its two non-duplicate pieces (the
// spreadsheet link + address overview, and Near Our New Home) moved into a
// new Home block (see moveIn in HomeBlockId below) instead of their own tab.
// House Rules, the third piece, was always a duplicate of the one already in
// Reference and is dropped rather than moved a second time.
export type HouseholdTabId = 'home' | 'calendar' | 'routines' | 'smarthome' | 'reference'

export const DEFAULT_HOUSEHOLD_TABS: SectionConfig[] = [
  { id: 'home',      label: 'Home' },
  // Promoted from a Home block to its own tab (2026-08-21) — a shared
  // calendar is a thing you go and look at, not one card among six competing
  // for the top of a scroll.
  { id: 'calendar',  label: 'Calendar' },
  // Chores, Routines, and Maintenance pulled together into one tab
  // (2026-08-22) — all three were "the cleaning and upkeep stuff", just
  // scattered: Chores and Routines were Home blocks, Maintenance was
  // already in Reference. One place for all of it instead of three.
  { id: 'routines',  label: 'Routines' },
  // Smart Home (2026-08-25) — a manual device/status list. Deliberately not
  // a real automation integration (no Home Assistant/IoT API anywhere in
  // this app) — just a place to note what's connected and its state, same
  // "simple checklist" shape as House Rules.
  { id: 'smarthome', label: 'Smart Home' },
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
// DEFAULT_HOUSEHOLD_TABS above. `lists` left it the same day, moved into the
// Reference tab (a generic checklist reads more like reference material than
// a weekly home-screen block). `chores` and `routines` left 2026-08-22, moved
// into the new Routines tab alongside Maintenance. mergeHomeBlocks drops
// unknown saved ids, so anyone whose layout still names any of these is
// cleaned up automatically.
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
