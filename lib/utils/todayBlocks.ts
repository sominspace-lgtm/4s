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
// gone too. Today declutters down to: the greeting/stats card, quick
// shortcuts, the area index, and the calendar.
export type TodayBlockId = 'budget' | 'areas' | 'calendar' | 'village' | 'controls' | 'household'

export interface TodayBlockConfig {
  id: TodayBlockId
  hidden: boolean
}

export const TODAY_BLOCK_META: Record<TodayBlockId, { label: string; hint: string }> = {
  budget:     { label: 'Capacity',       hint: 'Deep/medium/light slots for today' },
  areas:      { label: 'Area index',     hint: 'One line per area — Tasks, Habits, Money…' },
  calendar:   { label: 'Calendar',       hint: 'Month view by default' },
  // Village is a real live window, not a shortcut card (2026-08-25 round
  // two) — Village.tsx's `compact` prop renders the actual scene, height-
  // capped, tap anywhere to open the full Village.
  village:    { label: 'Village',        hint: 'A live window into your village' },
  controls:   { label: 'Smart Home',     hint: 'Opens the Smart Home overlay' },
  // Same one-tap ShortcutCard idiom as Controls (2026-08-25) — Household's
  // sub-tabs lost their permanent nav presence a while back for shared mode
  // reasons, but personal mode still wants a fast way in from Today.
  household:  { label: 'Household',      hint: 'Opens Household — Home' },
}

// Which blocks can actually change POSITION, not just visibility.
// Capacity lives at a fixed spot (physically nested inside the greeting
// card); Calendar is rendered by DashboardClient after DailyBrief returns, a
// different component entirely, so its position here is cosmetic (see
// DEFAULT_TODAY_BLOCKS below) — it always renders last regardless. Only
// these four are true siblings in the render tree and can be reordered
// against each other.
export const REORDERABLE: Set<TodayBlockId> = new Set(['areas', 'village', 'controls', 'household'])

// Order here is the default order — not enforced at render time, so a
// reorder in the customize panel actually changes what you see. Shortcuts
// (Village/Controls/Household) lead, Areas sits last among the reorderable
// group, Calendar trails the whole list (matching where it actually renders
// — see REORDERABLE's own comment).
export const DEFAULT_TODAY_BLOCKS: TodayBlockConfig[] = [
  { id: 'budget',     hidden: false },
  { id: 'village',    hidden: false },
  { id: 'controls',   hidden: false },
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
