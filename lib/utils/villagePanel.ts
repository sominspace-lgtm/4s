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
  | 'week'       // week at a glance: tonight, chores due, next trip, Somi's vet
  | 'house'      // scenes + device toggles (ScenesCard)
  | 'shortcuts'  // tab jump tiles
  | 'progress'   // garden growth, habits today, streak, projects
  | 'calendar'   // a compact month with a dot per dated day
  | 'tonight'    // tonight's dinner + chores due
  | 'meals'      // this week's dinners
  | 'shopping'   // the shopping list + quick-add

export const VILLAGE_PANEL_BLOCK_META: Record<VillagePanelBlockId, { label: string; hint: string }> = {
  week:      { label: 'This week',      hint: 'Tonight, chores due, the next trip, Somi\'s vet' },
  house:     { label: 'House controls', hint: 'Scenes and every light, lock, plug' },
  shortcuts: { label: 'Shortcuts',      hint: 'Jump to any tab' },
  progress:  { label: 'Progress',       hint: 'The garden, habits today, your streak' },
  calendar:  { label: 'Calendar',       hint: 'The month, with a dot on every dated day' },
  tonight:   { label: 'Tonight',        hint: "Dinner and what's due" },
  meals:     { label: "This week's meals", hint: "What we're eating" },
  shopping:  { label: 'Shopping list',  hint: 'What to buy, add from here' },
}

// Trimmed from 12 to 8 blocks (round 80, 2026-09-04, "make it concise") —
// dropped music/dateIdeas/nearby/moveIn. mergeVillagePanelBlocks below
// already filters unknown saved ids, so anyone with a saved layout that
// still names one of the four self-heals on next load, no migration.
// Calendar / to-dos stay opt-in (the option to add them, not on by
// default).
const DEFAULT_ORDER: VillagePanelBlockId[] = [
  'week', 'house', 'shortcuts', 'progress', 'calendar',
  'tonight', 'meals', 'shopping',
]
const DEFAULT_HIDDEN = new Set<VillagePanelBlockId>(['calendar'])

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
  // A block added later goes in its default place (This week leads, 2026-10-19).
  const out = [...cleaned]
  DEFAULT_VILLAGE_PANEL_BLOCKS.forEach((b, i) => { if (!have.has(b.id)) out.splice(Math.min(i, out.length), 0, b) })
  return out
}
