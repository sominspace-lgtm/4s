import { redirect } from 'next/navigation'
import { currentDevice } from '@/lib/devices/session'
import HomeView from '@/components/home/HomeView'

export const metadata = {
  title: 'Home',
  robots: { index: false, follow: false },
}

// The paired wall screen (2026-11-08). Runs only on a screen's own key, never
// a person's sign-in; an unpaired or removed screen goes back to /pair. The
// picture loads from /api/home/state once the screen knows its own date.
export default async function HomePage() {
  const device = await currentDevice()
  if (!device) redirect('/pair')
  return <HomeView screenName={device.name} />
}
