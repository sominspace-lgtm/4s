import { createClient } from '@/lib/supabase/client'
import type { SectionConfig, FocusConfig } from '@/components/ui/CustomizePanel'
import type { TodayBlockConfig } from '@/lib/utils/todayBlocks'

// THE single writer for user_prefs.layout.
//
// The layout column is one JSON blob holding four independent settings, and
// `upsert` replaces the whole column. Every place that wrote it used to build
// that object by hand, so any writer that forgot a key silently wiped it for
// the user — reordering your sections could reset simpleMode, configuring
// Focus view could undo "open everything now". There were five such writers.
//
// Now there is one, and `current` is a complete LayoutState, so a forgotten
// key is a type error instead of quiet data loss. Callers pass what they know
// plus the one thing they're changing.

export interface LayoutState {
  sections: SectionConfig[]
  focus: FocusConfig
  simpleMode: boolean
  unlockAll: boolean
  // Today's own blocks (One thing, Capacity, Calendar, …) — hide/reorder one
  // level down from the top-level tabs. Optional in the type only so old
  // saved rows that predate this key don't fail to parse; every WRITE still
  // goes through this same required shape via layoutState() in
  // DashboardClient, which is what stops the five-writer bug this file
  // already fixed once from coming back for a sixth field.
  todayBlocks?: TodayBlockConfig[]
  // Same idea, one level down from Personal and Household's own tab bars,
  // and (householdHomeBlocks) one level further down still, into what's
  // inside Household's Home tab. Added 2026-08-12 — see
  // lib/utils/personalTabs.ts and lib/utils/householdLayout.ts for the
  // defaults and merge functions these keys round-trip through.
  personalTabs?: SectionConfig[]
  householdTabs?: SectionConfig[]
  householdHomeBlocks?: SectionConfig[]
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
