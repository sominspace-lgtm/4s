// Today's own building blocks — customizable independently of the top-level
// tabs. Today used to be one fixed stack (One Thing, then stats, then the
// area index, then the calendar, then reflection, then inbox) with no way to
// say "I don't use Reflection" or "put the calendar first". This is the same
// hide/reorder idea CustomizePanel already gives the top-level tabs, scoped
// one level down.
//
// 'onething' and 'inbox' were removed entirely (2026-08-25), not just
// hidden — along with FamilyTodayCard, which was never part of this block
// system at all (an unconditional fixed card in DailyBrief) and is now
// gone too. 'controls' followed the same day (round three). 'village' was
// removed 2026-09-01 ("remove the windowed village on the today page") —
// the Village is its own landing screen now, so a small preview of it on
// Today was redundant. Today declutters down to: the greeting/stats card,
// Household's needs panel, the area index, and the calendar.
export type TodayBlockId = 'budget' | 'checkin' | 'areas' | 'calendar' | 'household'

export interface TodayBlockConfig {
  id: TodayBlockId
  hidden: boolean
}

export const TODAY_BLOCK_META: Record<TodayBlockId, { label: string; hint: string }> = {
  budget:     { label: 'Capacity',       hint: 'Deep/medium/light slots for today' },
  // The weekly relationship check-in (2026-09-01) — shows near the weekend
  // if you haven't done it, then who's answered. Self-hides otherwise.
  checkin:    { label: 'Weekly check-in', hint: 'The relationship check-in, toward the weekend' },
  areas:      { label: 'Area index',     hint: 'One line per area — Tasks, Habits, Money…' },
  calendar:   { label: 'Calendar',       hint: 'Month view by default' },
  // A real "what needs you" panel, not a shortcut (2026-08-25 round two) —
  // see TodayHouseholdNeeds.
  household:  { label: 'Household',      hint: 'Chores and shopping still needed' },
}

// Which blocks can actually change POSITION, not just visibility.
// Capacity lives at a fixed spot (physically nested inside the greeting
// card); Calendar is rendered by DashboardClient after DailyBrief returns, a
// different component entirely, so its position here is cosmetic (see
// DEFAULT_TODAY_BLOCKS below) — it always renders last regardless. These
// three are true siblings in the render tree and can be reordered.
export const REORDERABLE: Set<TodayBlockId> = new Set(['checkin', 'areas', 'household'])

// Order here is the default order — not enforced at render time, so a
// reorder in the customize panel actually changes what you see. Areas sits
// last among the reorderable group, Calendar trails the whole list (matching
// where it actually renders — see REORDERABLE's own comment).
export const DEFAULT_TODAY_BLOCKS: TodayBlockConfig[] = [
  { id: 'budget',     hidden: false },
  { id: 'checkin',    hidden: false },
  { id: 'household',  hidden: false },
  { id: 'areas',      hidden: false },
  { id: 'calendar',   hidden: false },
]

// Same merge shape as mergeLayout() in DashboardClient: a saved list might
// predate a block that was added later, or carry one that was removed — so
// missing ids get appended (visible) and unknown ids get dropped, instead of
// either crashing or silently losing the new block forever.
export function mergeTodayBlocks(saved: TodayBlockConfig[] | null | undefined): TodayBlockConfig[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_TODAY_BLOCKS
  const known = new Set(DEFAULT_TODAY_BLOCKS.map(b => b.id))
  const cleaned = saved.filter(b => known.has(b.id))
  const have = new Set(cleaned.map(b => b.id))
  const missing = DEFAULT_TODAY_BLOCKS.filter(b => !have.has(b.id))
  return [...cleaned, ...missing]
}
