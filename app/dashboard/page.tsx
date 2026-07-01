import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import type { SectionConfig } from '@/components/ui/CustomizePanel'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  const { data: prefs } = await supabase
    .from('user_prefs')
    .select('display_name, theme, calendar_url, mode, layout, onboarded')
    .eq('user_id', user.id)
    .single()

  // Only redirect brand-new users who have no prefs row yet
  if (prefs === null) redirect('/onboard')

  const layout = prefs?.layout?.sections as SectionConfig[] | null

  return (
    <DashboardClient
      email={user.email ?? ''}
      userId={user.id}
      initialName={prefs?.display_name ?? null}
      initialTheme={prefs?.theme ?? 'sunset'}
      initialMode={prefs?.mode ?? 'balanced'}
      initialCalendarUrl={prefs?.calendar_url ?? null}
      initialLayout={layout ?? null}
    />
  )
}
