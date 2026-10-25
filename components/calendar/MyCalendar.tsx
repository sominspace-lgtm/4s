'use client'

import { useState } from 'react'
import Segmented from '@/components/ui/Segmented'
import CalendarEmbed from '@/components/calendar/CalendarEmbed'
import GoogleCalendar from '@/components/google/GoogleCalendar'
import { useGoogleStatus } from '@/lib/hooks/useGoogle'

// Me → Calendar (2026-10-25). Everything: every dated thing in 4S (tasks,
// events, renewals, habits) with your Google events mixed in. Google: your
// Google Calendar to add, change and delete, plus your partner's if shared.

export default function MyCalendar({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'all' | 'google'>('all')
  const { status } = useGoogleStatus()
  return (
    <div>
      {status.connected && <Segmented value={tab} onChange={setTab} options={[['all', 'Everything'], ['google', 'Google Calendar']]} />}
      {tab === 'google' && status.connected ? <GoogleCalendar scope="mine" /> : <CalendarEmbed userId={userId} />}
    </div>
  )
}
