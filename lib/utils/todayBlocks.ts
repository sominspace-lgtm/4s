// Today's own building blocks — customizable independently of the top-level
// tabs. Today used to be one fixed stack (One Thing, then stats, then the
// area index, then the calendar, then reflection, then inbox) with no way to
// say "I don't use Reflection" or "put the calendar first". This is the same
// hide/reorder idea CustomizePanel already gives the top-level tabs, scoped
// one level down.
export type TodayBlockId = 'onething' | 'budget' | 'areas' | 'calendar' | 'inbox' | 'village' | 'controls'

export interface TodayBlockConfig {
  id: TodayBlockId
  hidden: boolean
}

export const TODAY_BLOCK_META: Record<TodayBlockId, { label: string; hint: string }> = {
  onething:   { label: 'One thing',      hint: 'The single next action' },
  budget:     { label: 'Capacity',       hint: 'Deep/medium/light slots for today' },
  areas:      { label: 'Area index',     hint: 'One line per area — Tasks, Habits, Money…' },
  calendar:   { label: 'Calendar',       hint: 'Agenda and month view' },
  inbox:      { label: 'Quick Add · Inbox', hint: 'Capture and sort' },
  // Village is a real live window now, not a shortcut card (2026-08-25
  // round two) — Village.tsx's `compact` prop renders the actual scene,
  // height-capped, tap anywhere to open the full Village. Controls stays a
  // one-tap shortcut into the Smart Home overlay — there's no "mini"
  // version of a control panel worth previewing.
  village:    { label: 'Village',        hint: 'A live window into your village' },
  controls:   { label: 'Smart Home',     hint: 'Opens the Smart Home overlay' },
}

// Which blocks can actually change POSITION, not just visibility.
// One thing, Capacity, and Calendar each live at a fixed spot in the page
// today (One thing leads on purpose — see components/brief/OneThing.tsx's
// own header comment on why burying it would undo that feature; Capacity is
// physically nested inside the greeting card; Calendar is rendered by
// DashboardClient after DailyBrief returns, a different component
// entirely). All three can still be hidden. Only these three are true
// siblings in the render tree and can be reordered against each other.
export const REORDERABLE: Set<TodayBlockId> = new Set(['areas', 'inbox', 'village', 'controls'])

// Order here is the default order — not enforced at render time, so a
// reorder in the customize panel actually changes what you see.
export const DEFAULT_TODAY_BLOCKS: TodayBlockConfig[] = [
  { id: 'onething',   hidden: false },
  { id: 'budget',     hidden: false },
  { id: 'areas',      hidden: false },
  { id: 'calendar',   hidden: false },
  { id: 'inbox',      hidden: false },
  { id: 'village',    hidden: false },
  { id: 'controls',   hidden: false },
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
