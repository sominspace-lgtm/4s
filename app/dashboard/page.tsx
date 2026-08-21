import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { normalizeMode } from '@/lib/constants/modes'
import { normalizeTheme } from '@/lib/constants/themes'
import DashboardClient from './DashboardClient'
import type { SectionConfig } from '@/components/ui/CustomizePanel'
import type { TodayBlockConfig } from '@/lib/utils/todayBlocks'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const sharedMode = (await cookies()).get('4s-shared-mode')?.value === '1'

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
      sharedMode={sharedMode}
      // Passed as an ISO string, not a Date: every other prop across this
      // boundary is a primitive. The Village parses it once. This is what puts
      // rings on the Life Tree, which was stuck at zero because nothing ever
      // read it.
      accountCreatedAt={user.created_at ?? null}
      initialVillageLastSeen={(prefs?.layout?.villageLastSeen as string | undefined) ?? null}
      initialUnlockAll={Boolean(prefs?.layout?.unlockAll)}
      initialName={prefs?.display_name ?? null}
      initialTheme={normalizeTheme(prefs?.theme)}
      // Not read from `prefs` above (2026-08-21) — custom_theme is a new
      // column (see supabase/migrations/user_prefs_custom_theme.sql) that
      // may not exist in the database yet. This query gates the /onboard
      // redirect, so it can never reference a column that might not be
      // there; DashboardClient fetches custom_theme itself, client-side,
      // where a missing-column error is just "stay on the preset theme"
      // instead of breaking login for every user.
      initialCustomTheme={null}
      initialMode={normalizeMode(prefs?.mode)}
      initialLayout={layout ?? null}
      initialSimpleMode={simpleMode}
      initialTodayBlocks={todayBlocks ?? null}
      initialPersonalTabs={personalTabs ?? null}
      initialHouseholdTabs={householdTabs ?? null}
      initialHouseholdHomeBlocks={householdHomeBlocks ?? null}
    />
  )
}
