import type { SupabaseClient } from '@supabase/supabase-js'

// The week in review — one computation, shared by 4S OS's "This week" Home
// block and the companion bot's Sunday-evening post, so the two surfaces
// can never disagree about what happened. Household-scoped only: the bot has
// no visibility into personal task/habit data, the same boundary Ask Jarvis
// and Council already respect, so this reads only tables that carry a
// space_id.
//
// None of these tables keep a completion HISTORY — chores and routines only
// ever store their most recent `last_done_at`, not a log of every time they
// were done. So "chores done this week" really means "chores whose most
// recent completion falls in this week", which undercounts a chore done
// twice — an honest limitation of the data, not a bug to route around with a
// new history table just for a weekly summary.
//
// Goals are reported as "touched", never as progress. goals.sql is explicit
// that there is no progress column on purpose — a percentage answers "how
// far along", but the question that keeps a goal alive is "am I still
// choosing this?". This file doesn't get to reintroduce a progress bar
// through the back door of a recap.

export interface WeeklyRecapItem {
  id: string
  name: string
}

export interface WeeklyRecap {
  /** Monday, YYYY-MM-DD. */
  weekStart: string
  /** Sunday, YYYY-MM-DD — the week this recap is FOR, matching the
   *  companion's own Sunday-keyed check-in weeks. */
  weekEnd: string
  choresDone: WeeklyRecapItem[]
  newPins: WeeklyRecapItem[]
  goalsTouched: WeeklyRecapItem[]
  moveinBought: WeeklyRecapItem[]
  isEmpty: boolean
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** The Monday six days before `weekEnd` (expected to be a Sunday, but works
 *  for any date — it's just "the start of this 7-day window"). */
function mondayBefore(weekEnd: Date): Date {
  const d = new Date(weekEnd)
  d.setDate(d.getDate() - 6)
  return d
}

export async function buildWeeklyRecap(
  supabase: SupabaseClient, spaceId: string, weekEnd: Date = new Date(),
): Promise<WeeklyRecap> {
  const start = mondayBefore(weekEnd)
  const startDateStr = toDateStr(start)
  const endDateStr = toDateStr(weekEnd)
  // Timestamptz columns need a real range, not a date string comparison —
  // lte on a date-only string would silently exclude anything after
  // midnight on the last day.
  const startIso = new Date(`${startDateStr}T00:00:00.000Z`).toISOString()
  const endIsoExclusive = new Date(new Date(`${endDateStr}T00:00:00.000Z`).getTime() + 86_400_000).toISOString()

  const [choresRes, routinesRes, pinsRes, goalsRes, moveinRes] = await Promise.all([
    supabase.from('household_chores')
      .select('id, name, last_done_at')
      .eq('space_id', spaceId).gte('last_done_at', startDateStr).lte('last_done_at', endDateStr),
    supabase.from('household_routines')
      .select('id, name, last_done_at')
      .eq('space_id', spaceId).gte('last_done_at', startDateStr).lte('last_done_at', endDateStr),
    supabase.from('places')
      .select('id, name, created_at')
      .eq('space_id', spaceId).gte('created_at', startIso).lt('created_at', endIsoExclusive),
    supabase.from('goals')
      .select('id, title, last_touched_at')
      .eq('space_id', spaceId).eq('status', 'active')
      .gte('last_touched_at', startIso).lt('last_touched_at', endIsoExclusive),
    supabase.from('household_movein_items')
      .select('id, name, got_at')
      .eq('space_id', spaceId).eq('got', true)
      .gte('got_at', startIso).lt('got_at', endIsoExclusive),
  ])

  const choresDone: WeeklyRecapItem[] = [
    ...((choresRes.data as { id: string; name: string }[] | null) ?? []),
    ...((routinesRes.data as { id: string; name: string }[] | null) ?? []),
  ]
  const newPins: WeeklyRecapItem[] = ((pinsRes.data as { id: string; name: string }[] | null) ?? [])
  const goalsTouched: WeeklyRecapItem[] = ((goalsRes.data as { id: string; title: string }[] | null) ?? [])
    .map(g => ({ id: g.id, name: g.title }))
  const moveinBought: WeeklyRecapItem[] = ((moveinRes.data as { id: string; name: string }[] | null) ?? [])

  return {
    weekStart: startDateStr,
    weekEnd: endDateStr,
    choresDone,
    newPins,
    goalsTouched,
    moveinBought,
    isEmpty: choresDone.length === 0 && newPins.length === 0 && goalsTouched.length === 0 && moveinBought.length === 0,
  }
}

// One line per section, only for sections with something to say — an empty
// week's recap should read as quiet, not as a checklist of zeros. Plain
// declarative sentences, no exclamation points, no "great job".
export function recapLines(r: WeeklyRecap): string[] {
  const lines: string[] = []
  if (r.choresDone.length > 0) {
    lines.push(`Done: ${r.choresDone.map(c => c.name).join(', ')}.`)
  }
  if (r.newPins.length > 0) {
    lines.push(`New pins: ${r.newPins.map(p => p.name).join(', ')}.`)
  }
  if (r.goalsTouched.length > 0) {
    lines.push(`Goals touched: ${r.goalsTouched.map(g => g.name).join(', ')}.`)
  }
  if (r.moveinBought.length > 0) {
    lines.push(`Bought: ${r.moveinBought.map(m => m.name).join(', ')}.`)
  }
  return lines
}
