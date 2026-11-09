import { redirect } from 'next/navigation'
import { currentDevice } from '@/lib/devices/session'
import PairScreen from './PairScreen'

export const metadata = {
  title: 'Pair this screen',
  robots: { index: false, follow: false },
}

// Open this on the wall iPad (2026-11-08). It shows a QR; one of you scans
// it with a signed-in phone and approves. No account is ever entered here.
export default async function PairPage() {
  if (await currentDevice()) redirect('/home')
  return <PairScreen />
}
