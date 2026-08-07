import { createClient } from '@/lib/supabase/client'
import type { SectionConfig, FocusConfig } from '@/components/ui/CustomizePanel'

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
