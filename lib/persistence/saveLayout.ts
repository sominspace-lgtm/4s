import { createClient } from '@/lib/supabase/client'
import type { SectionConfig } from '@/components/ui/CustomizePanel'
import type { TodayBlockConfig } from '@/lib/utils/todayBlocks'
import type { VillageLayout } from '@/lib/village/layout'

// THE single writer for user_prefs.layout.
//
// The layout column is one JSON blob holding several independent settings,
// and `upsert` replaces the whole column. Every place that wrote it used to
// build that object by hand, so any writer that forgot a key silently wiped
// it for the user — reordering your sections could reset an unrelated
// setting, and so on. There were five such writers.
//
// Now there is one, and `current` is a complete LayoutState, so a forgotten
// key is a type error instead of quiet data loss. Callers pass what they know
// plus the one thing they're changing.

export interface LayoutState {
  sections: SectionConfig[]
  // (An `unlockAll` key lived here until 2026-09-01, when the progressive-
  // unlocking system was removed — every section is visible from first
  // login now. A stale value in a saved row is simply ignored.)
  // Today's own blocks (One thing, Capacity, Calendar, …) — hide/reorder one
  // level down from the top-level tabs. Optional in the type only so old
  // saved rows that predate this key don't fail to parse; every WRITE still
  // goes through this same required shape via layoutState() in
  // DashboardClient, which is what stops the five-writer bug this file
  // already fixed once from coming back for a sixth field.
  todayBlocks?: TodayBlockConfig[]
  // What's inside Household's Home tab — hide/reorder one level down from the
  // top-level sections. See lib/utils/householdLayout.ts. (`personalTabs` and
  // `householdTabs` keys lived here until 2026-09-01, when the Personal and
  // Household sub-tabs became top-level `sections`; stale values are ignored.)
  householdHomeBlocks?: SectionConfig[]
  // When the Village was last opened, so it can say what changed since. Not a
  // layout setting, but it lives here for the same reason the others do: it's
  // one small per-user value and this column already exists.
  //
  // Optional in the type, which is exactly the hazard this file's header
  // describes — an optional key left out of layoutState() gets wiped by every
  // unrelated write and TypeScript stays quiet about it. It IS in layoutState()
  // in DashboardClient. Keep it there.
  villageLastSeen?: string
  // Dragged positions for the Village's five fixed landmarks — see
  // lib/village/layout.ts's own header comment for why only the landmarks
  // (not individual plants/buildings) get this. Optional for the same
  // reason villageLastSeen is: old saved rows predate it.
  villageLayout?: VillageLayout
}

export async function saveLayout(
  userId: string,
  current: LayoutState,
  patch: Partial<LayoutState> = {},
): Promise<{ error: string | null }> {
  const layout: LayoutState = { ...current, ...patch }
  const { error } = await createClient()
    .from('user_prefs')
    .upsert({ user_id: userId, layout })
  // Surfaced rather than swallowed — a failed layout write used to look
  // exactly like a successful one until the next page load undid it.
  if (error) console.error('[4s] layout save failed:', error.message)
  return { error: error?.message ?? null }
}
