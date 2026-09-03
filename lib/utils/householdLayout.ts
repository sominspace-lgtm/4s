import type { SectionConfig } from '@/components/ui/SectionCustomizer'

// Home / Calendar / Reference are top-level nav sections (2026-08-25) —
// DashboardClient renders one <HouseholdHub forcedTab={id}> each. `smarthome`
// stays a valid id because SmartHomeOverlay passes it as a forcedTab, but
// it's overlay-only, never a switchable tab. (A DEFAULT_HOUSEHOLD_TABS list
// + mergeHouseholdTabs lived here until 2026-09-01, when the internal
// tab-switcher they fed was removed — the sections customize through the
// main Customize-layout panel now.)
export type HouseholdTabId = 'today' | 'home' | 'smarthome' | 'reference'

// What's INSIDE Household's Home tab — the concrete "customizable like an
// iPhone home screen" layer. These used to be four scattered, non-contiguous
// `{tab === 'home' && ...}` blocks in HouseholdHub.tsx; pulling them into one
// ordered array is what makes reordering/hiding possible, the same refactor
// todayBlocks.ts did for Today.
// `calendar` became its own section 2026-08-21; `lists` moved into Reference
// the same day; `chores`/`routines` moved to Reference 2026-08-25.
// mergeHomeBlocks drops unknown saved ids, so a layout that still names any
// of these is cleaned up automatically.
export type HomeBlockId = 'calendar' | 'thisWeek' | 'checkin' | 'shopping' | 'meals' | 'rules' | 'moveIn'

export const HOME_BLOCK_META: Record<HomeBlockId, { label: string; hint: string }> = {
  // The household calendar — its own section until 2026-09-02, a Home block
  // again now. First by default: it's the "what does this house have on" view.
  calendar: { label: 'Calendar',          hint: 'The month — chores, meals, trips, shared events' },
  // The week in review (2026-08-18) — same computation the bot posts on Sundays.
  thisWeek: { label: 'This week',          hint: 'What got done, in one glance' },
  // The weekly relationship check-in prompt — renders on Sunday, or any day
  // this week's check-in still isn't done; a no-op otherwise (2026-09-03).
  checkin:  { label: 'Check-in',           hint: 'Complete this week’s check-in' },
  shopping: { label: 'Shopping list',      hint: 'What to buy' },
  meals:    { label: 'This week’s meals',  hint: 'What we’re eating' },
  // House rules — standing conventions ("no shoes inside"). Moved here from
  // the Reference tab 2026-09-02.
  rules:    { label: 'House rules',        hint: 'What we agreed on' },
  // Folded in from the retired Move-In tab (2026-08-25) — the overview card
  // (address + spreadsheet link) and Near Our New Home. Last by default.
  moveIn:   { label: 'Move-in',            hint: 'The Millton — what’s around it, and the buy-list sheet' },
}

export const DEFAULT_HOME_BLOCKS: SectionConfig[] = (['calendar', 'thisWeek', 'checkin', 'shopping', 'meals', 'rules', 'moveIn'] as HomeBlockId[])
  .map(id => ({ id, label: HOME_BLOCK_META[id].label, hint: HOME_BLOCK_META[id].hint, hidden: false }))

export function mergeHomeBlocks(saved: SectionConfig[] | null | undefined): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_HOME_BLOCKS
  const order = DEFAULT_HOME_BLOCKS.map(s => s.id)
  const known = new Set(order)
  const out = saved.filter(s => known.has(s.id))
  const have = new Set(out.map(s => s.id))
  // A block added to DEFAULT_HOME_BLOCKS after this layout was saved is
  // spliced in next to its default neighbour, not just appended — so e.g.
  // `checkin` lands above `shopping` for people who already had a layout.
  for (const def of DEFAULT_HOME_BLOCKS) {
    if (have.has(def.id)) continue
    const defIdx = order.indexOf(def.id)
    let at = out.length
    for (let i = 0; i < out.length; i++) {
      if (order.indexOf(out[i].id) > defIdx) { at = i; break }
    }
    out.splice(at, 0, def)
  }
  return out
}
