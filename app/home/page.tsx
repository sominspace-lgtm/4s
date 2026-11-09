import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentDevice } from '@/lib/devices/session'
import { SHELL, CARD, H1, P } from '@/components/devices/styles'

export const metadata = {
  title: 'Home',
  robots: { index: false, follow: false },
}

// The paired screen's home (2026-11-08). Runs only on a screen's own key,
// never a person's sign-in. For now it just confirms the pairing; HomeView
// (clock faces over the Village) is built on top of this next.
export default async function HomePage() {
  const device = await currentDevice()
  if (!device) redirect('/pair')
  const { data: space } = await createAdminClient().from('shared_spaces').select('name').eq('id', device.spaceId).maybeSingle()
  return (
    <main style={SHELL}>
      <div style={CARD}>
        <h1 style={H1}>{device.name}</h1>
        <p style={P}>Paired with {space?.name ?? 'your household'}. The home screen is coming next.</p>
      </div>
    </main>
  )
}
