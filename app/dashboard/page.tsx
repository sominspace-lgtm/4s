import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeMode } from '@/lib/constants/modes'
import { normalizeTheme } from '@/lib/constants/themes'
import DashboardClient from './DashboardClient'
import type { SectionConfig, FocusConfig } from '@/components/ui/CustomizePanel'
import type { TodayBlockConfig } from '@/lib/utils/todayBlocks'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: prefs } = await supabase
    .from('user_prefs')
    // calendar_url is no longer read — the Google Calendar embed is gone and
    // the calendar is 4S's own data now. The column is left in place rather
    // than dropped, in case an ICS-import feature wants a home later.
    .select('display_name, theme, mode, layout, onboarded')
    .eq('user_id', user.id)
    .single()

  // Only redirect brand-new users who have no prefs row yet
  if (prefs === null) redirect('/onboard')

  const layout = prefs?.layout?.sections as SectionConfig[] | null
  const focusConfig = prefs?.layout?.focus as FocusConfig | null
  const simpleMode = Boolean(prefs?.layout?.simpleMode)
  const todayBlocks = prefs?.layout?.todayBlocks as TodayBlockConfig[] | null
  const personalTabs = prefs?.layout?.personalTabs as SectionConfig[] | null
  const householdTabs = prefs?.layout?.householdTabs as SectionConfig[] | null
  const householdHomeBlocks = prefs?.layout?.householdHomeBlocks as SectionConfig[] | null

  return (
    <DashboardClient
      email={user.email ?? ''}
      userId={user.id}
      isAnonymous={Boolean(user.is_anonymous)}
      initialUnlockAll={Boolean(prefs?.layout?.unlockAll)}
      initialName={prefs?.display_name ?? null}
      initialTheme={normalizeTheme(prefs?.theme)}
      initialMode={normalizeMode(prefs?.mode)}
      initialLayout={layout ?? null}
      initialFocusConfig={focusConfig ?? null}
      initialSimpleMode={simpleMode}
      initialTodayBlocks={todayBlocks ?? null}
      initialPersonalTabs={personalTabs ?? null}
      initialHouseholdTabs={householdTabs ?? null}
      initialHouseholdHomeBlocks={householdHomeBlocks ?? null}
    />
  )
}
