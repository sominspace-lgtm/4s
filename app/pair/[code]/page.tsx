import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { normalizeCode } from '@/lib/devices/token'
import { spacesFor } from '@/lib/devices/members'
import { SHELL, CARD, H1, P } from '@/components/devices/styles'
import ApproveScreen from './ApproveScreen'

export const metadata = {
  title: 'Approve a screen',
  robots: { index: false, follow: false },
}

// Where the QR on the wall iPad leads (2026-11-08). Signed-in only (the proxy
// sends anyone else to /login and back here).
export default async function ApprovePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/pair/${encodeURIComponent(raw)}`)

  const code = normalizeCode(raw)
  const spaces = await spacesFor(user.id)
  if (!code || spaces.length === 0) {
    return (
      <main style={SHELL}>
        <div style={CARD}>
          <h1 style={H1}>{code ? 'No household yet' : 'That link is not right'}</h1>
          <p style={P}>{code ? 'Set up your household in SS first, then scan again.' : 'Scan the code on the screen again.'}</p>
        </div>
      </main>
    )
  }
  return <ApproveScreen code={code} spaces={spaces} />
}
