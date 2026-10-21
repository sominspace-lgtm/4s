import type { SectionConfig } from '@/components/ui/SectionCustomizer'

// Home / Calendar / Reference are top-level nav sections (2026-08-25) —
// DashboardClient renders one <HouseholdHub forcedTab={id}> each. `smarthome`
// stays a valid id because SmartHomeOverlay passes it as a forcedTab, but
// it's overlay-only, never a switchable tab. (A DEFAULT_HOUSEHOLD_TABS list
// + mergeHouseholdTabs lived here until 2026-09-01, when the internal
// tab-switcher they fed was removed — the sections customize through the
// main Customize-layout panel now.)
export type HouseholdTabId = 'home' | 'upkeep' | 'smarthome' | 'reference'

// What's INSIDE Household's Home tab — the concrete "customizable like an
// iPhone home screen" layer. These used to be four scattered, non-contiguous
// `{tab === 'home' && ...}` blocks in HouseholdHub.tsx; pulling them into one
// ordered array is what makes reordering/hiding possible, the same refactor
// todayBlocks.ts did for Today.
// `calendar` became its own section 2026-08-21; `lists` moved into Reference
// the same day; `chores`/`routines` moved to Reference 2026-08-25.
// mergeHomeBlocks drops unknown saved ids, so a layout that still names any
// of these is cleaned up automatically.
// Shortcuts, This week's meals and Money this month were removed 2026-10-19;
// mergeHomeBlocks drops their ids from saved layouts.
export type HomeBlockId = 'glance' | 'tonight' | 'calendar' | 'thisWeek' | 'checkin' | 'shopping' | 'rules' | 'moveIn' | 'notes' | 'smartHome' | 'settle' | 'board' | 'datenight' | 'wins'

export const HOME_BLOCK_META: Record<HomeBlockId, { label: string; hint: string }> = {
  // Every part of Home is a block you can move or hide (2026-10-13). The
  // at-a-glance strip and the Smart Home link used to be fixed.
  glance:    { label: 'At a glance',       hint: 'Chores due, tonight, and what is on the list' },
  tonight:   { label: 'Kitchen today',     hint: 'Today’s meals, and a way into recipes, the plan and groceries' },
  // The household calendar — its own section until 2026-09-02, a Home block
  // again now. First by default: it's the "what does this house have on" view.
  calendar: { label: 'Calendar',          hint: 'The month — chores, meals, trips, shared events' },
  // The week in review (2026-08-18) — same computation the bot posts on Sundays.
  thisWeek: { label: 'This week',          hint: 'What got done, in one glance' },
  // The weekly relationship check-in prompt — renders on Sunday, or any day
  // this week's check-in still isn't done; a no-op otherwise (2026-09-03).
  checkin:  { label: 'Check-in',           hint: 'Complete this week’s check-in' },
  shopping: { label: 'Shopping list',      hint: 'What to buy' },
  // House rules — standing conventions ("no shoes inside"). Moved here from
  // the Reference tab 2026-09-02.
  rules:    { label: 'House rules',        hint: 'What we agreed on' },
  // Folded in from the retired Move-In tab (2026-08-25) — the overview card
  // (address + spreadsheet link) and Near Our New Home. Last by default.
  board:     { label: 'Note on the board', hint: 'A line for the other, shown on the village at home' },
  datenight: { label: 'Date night',        hint: 'Pick a date idea by budget and energy' },
  settle:    { label: 'Dice and coin',      hint: 'Flip a coin or roll dice to settle it' },
  wins:      { label: 'Little wins',        hint: 'What the two of you got done lately' },
  notes:     { label: 'Household notes',   hint: 'Notes the two of you share' },
  smartHome: { label: 'Smart Home',        hint: 'The device and status list' },
  moveIn:   { label: 'Move-in',            hint: 'The Millton — what’s around it, and the buy-list sheet' },
}

// A short Home by default (2026-10-21 redesign): the everyday blocks show,
// the rest wait under "More on Home" at the bottom, one tap to bring back.
// Things we own moved to Collections the same day.
const SHOWN_BY_DEFAULT = new Set<HomeBlockId>(['glance', 'board', 'checkin', 'tonight', 'shopping', 'thisWeek', 'wins'])
export const DEFAULT_HOME_BLOCKS: SectionConfig[] = (['glance', 'board', 'checkin', 'tonight', 'shopping', 'thisWeek', 'wins', 'calendar', 'rules', 'datenight', 'settle', 'notes', 'moveIn', 'smartHome'] as HomeBlockId[])
  .map(id => ({ id, label: HOME_BLOCK_META[id].label, hint: HOME_BLOCK_META[id].hint, hidden: !SHOWN_BY_DEFAULT.has(id) }))

export function mergeHomeBlocks(saved: SectionConfig[] | null | undefined): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_HOME_BLOCKS
  const order = DEFAULT_HOME_BLOCKS.map(s => s.id)
  const known = new Set(order)
  // `somiCare` was briefly a Home block (2026-09-08), now merged into
  // Reference's "Upkeep & care" — dropped here like any unknown id.
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
