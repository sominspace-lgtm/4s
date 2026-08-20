import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ThemeProvider from '@/components/ui/ThemeProvider'
import { normalizeTheme } from '@/lib/constants/themes'
import AccountClient from './AccountClient'

export default async function AccountPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Shared mode is backed by a real account under the hood, but it must
  // never expose or let anyone edit that account's actual settings — the
  // menu link is already hidden (Header.tsx), this is the server-side
  // backstop for anyone who navigates here directly.
  if (cookieStore.get('4s-shared-mode')?.value === '1') redirect('/dashboard')

  const { data: prefs } = await supabase
    .from('user_prefs')
    .select('display_name, theme')
    .eq('user_id', user.id)
    .single()

  return (
    <ThemeProvider theme={normalizeTheme(prefs?.theme)}>
      <AccountClient
        email={user.email ?? ''}
        userId={user.id}
        displayName={prefs?.display_name ?? null}
        isAnonymous={Boolean(user.is_anonymous)}
      />
    </ThemeProvider>
  )
}
