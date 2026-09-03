import type { SectionConfig } from '@/components/ui/SectionCustomizer'

// What's inside the Village home panel — the smart-home hub the wall iPad
// and the personal dock both render. Same "iPhone home screen" model as
// lib/utils/householdLayout.ts and lib/utils/todayBlocks.ts: one ordered,
// hide/reorderable array, customized through the shared SectionCustomizer
// drawer, persisted in user_prefs.layout.villagePanelBlocks.
//
// Guest mode ignores this entirely — see VillagePanelBlocks' `variant="guest"`,
// which renders a fixed visuals-plus-guest-actions set instead.

export type VillagePanelBlockId =
  | 'house'      // scenes + device toggles (ScenesCard)
  | 'shortcuts'  // tab jump tiles + Kitchen / Home Cheat Sheet
  | 'progress'   // garden growth, habits today, streak, projects
  | 'calendar'   // a compact month with a dot per dated day
  | 'todos'      // household checklists (useLists) with check-off + add
  | 'tonight'    // tonight's dinner + chores due
  | 'meals'      // this week's dinners
  | 'shopping'   // the shopping list + quick-add
  | 'music'      // the house playlist (MusicCard)
  | 'dateIdeas'  // saved / planned date ideas
  | 'nearby'     // pins near the new place
  | 'moveIn'     // move-in progress (auto-hides when nothing's tracked)

export const VILLAGE_PANEL_BLOCK_META: Record<VillagePanelBlockId, { label: string; hint: string }> = {
  house:     { label: 'House controls', hint: 'Scenes and every light, lock, plug' },
  shortcuts: { label: 'Shortcuts',      hint: 'Jump to any tab, plus the cheat sheets' },
  progress:  { label: 'Progress',       hint: 'The garden, habits today, your streak' },
  calendar:  { label: 'Calendar',       hint: 'The month, with a dot on every dated day' },
  todos:     { label: 'To-do lists',    hint: 'Household checklists you can tick off here' },
  tonight:   { label: 'Tonight',        hint: "Dinner and what's due" },
  meals:     { label: "This week's meals", hint: "What we're eating" },
  shopping:  { label: 'Shopping list',  hint: 'What to buy, add from here' },
  music:     { label: 'Music',          hint: 'The house playlist' },
  dateIdeas: { label: 'Date ideas',     hint: 'Saved and planned' },
  nearby:    { label: 'Nearby',         hint: 'Pins around the new place' },
  moveIn:    { label: 'Move-in',        hint: 'What still needs sorting' },
}

// Default order + which start hidden. Calendar / to-dos / move-in
// are opt-in (the user asked for the *option* to add them, not for them on
// by default).
const DEFAULT_ORDER: VillagePanelBlockId[] = [
  'house', 'shortcuts', 'progress', 'calendar', 'todos',
  'tonight', 'meals', 'shopping', 'music', 'dateIdeas', 'nearby', 'moveIn',
]
const DEFAULT_HIDDEN = new Set<VillagePanelBlockId>(['calendar', 'todos', 'moveIn'])

export const DEFAULT_VILLAGE_PANEL_BLOCKS: SectionConfig[] = DEFAULT_ORDER.map(id => ({
  id,
  label: VILLAGE_PANEL_BLOCK_META[id].label,
  hint: VILLAGE_PANEL_BLOCK_META[id].hint,
  hidden: DEFAULT_HIDDEN.has(id),
}))

export function mergeVillagePanelBlocks(saved: SectionConfig[] | null | undefined): SectionConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_VILLAGE_PANEL_BLOCKS
  const known = new Set(DEFAULT_VILLAGE_PANEL_BLOCKS.map(s => s.id))
  const cleaned = saved.filter(s => known.has(s.id))
  const have = new Set(cleaned.map(s => s.id))
  const missing = DEFAULT_VILLAGE_PANEL_BLOCKS.filter(s => !have.has(s.id))
  return [...cleaned, ...missing]
}
