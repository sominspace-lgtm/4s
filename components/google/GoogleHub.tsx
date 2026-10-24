'use client'

import { useState } from 'react'
import { useGoogleStatus } from '@/lib/hooks/useGoogle'
import GmailInbox from '@/components/mail/GmailInbox'
import GoogleCalendar from './GoogleCalendar'
import SharedDrive from '@/components/household/SharedDrive'
import OurPhotos from '@/components/household/OurPhotos'
import CalendarSharing from '@/components/ui/CalendarSharing'
import GoogleConnect from '@/components/ui/GoogleConnect'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

// One page per Google account (2026-10-24), with tabs.
//  Me → Google:     your Inbox, Calendar, Drive, and what you share.
//  Home → Shared:   the shared email's Inbox, Calendar, Drive, and Our photos.
// Everything here also lives in the right place elsewhere; this is the one
// spot to find it all.

type Tab = 'inbox' | 'calendar' | 'drive' | 'photos' | 'sharing'

const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }

export default function GoogleHub({ scope, userId, guestMode = false }: { scope: 'mine' | 'shared'; userId: string; guestMode?: boolean }) {
  const { status, loading } = useGoogleStatus()
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(sp => members.some(m => m.space_id === sp.id && m.status === 'accepted'))?.id ?? spaces[0]?.id ?? null
  const tabs: [Tab, string][] = scope === 'mine'
    ? [['inbox', 'Inbox'], ['calendar', 'Calendar'], ['drive', 'Drive'], ['sharing', 'Sharing']]
    : guestMode ? [['photos', 'Photos']] : [['inbox', 'Inbox'], ['calendar', 'Calendar'], ['drive', 'Drive'], ['photos', 'Photos']]
  const [tab, setTab] = useState<Tab>(tabs[0][0])
  const current = tabs.some(t => t[0] === tab) ? tab : tabs[0][0]

  const connected = scope === 'mine' ? status.connected : !!status.household?.connected
  const onSharedScreen = !!status.blocked

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {tabs.length > 1 && (
        <div role="tablist" style={{ display: 'flex', gap: '0.2rem', padding: '0.2rem', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, alignSelf: 'flex-start', maxWidth: '100%', overflowX: 'auto' }}>
          {tabs.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={current === id} onClick={() => setTab(id)} className="press" style={{
              minHeight: 38, padding: '0 0.9rem', borderRadius: 9, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-body)', fontSize: '0.86rem',
              background: current === id ? 'var(--surface)' : 'transparent', color: current === id ? 'var(--text)' : 'var(--muted)',
              boxShadow: current === id ? '0 1px 4px var(--shadow)' : 'none',
            }}>{label}</button>
          ))}
        </div>
      )}

      {!loading && !connected && current !== 'photos' && (
        <section className="organic specimen" style={card}>
          <div style={{ fontSize: '0.86rem', color: 'var(--muted)', marginBottom: '0.7rem' }}>
            {scope === 'mine'
              ? (onSharedScreen ? 'Your own Google opens when you are signed in as yourself, not on the shared screen.' : 'Connect your Google account to see your inbox, calendar and Drive here.')
              : 'Connect the shared Google account to see its inbox, calendar and Drive here.'}
          </div>
          {!(scope === 'mine' && onSharedScreen) && <GoogleConnect />}
        </section>
      )}

      {connected && current === 'inbox' && (
        onSharedScreen
          ? <section className="organic specimen" style={card}><div style={{ fontSize: '0.86rem', color: 'var(--muted)' }}>Mail is not on the shared screen. Sign in as yourself to read it.</div></section>
          : <section className="organic specimen" style={card}><GmailInbox only={scope} /></section>
      )}
      {connected && current === 'calendar' && <GoogleCalendar scope={scope} />}
      {connected && current === 'drive' && <SharedDrive account={scope} title={scope === 'mine' ? 'My Drive' : 'Shared Drive'} />}
      {current === 'photos' && <OurPhotos spaceId={spaceId} guestMode={guestMode} />}
      {current === 'sharing' && (
        <section className="organic specimen" style={card}>
          <div className="t-card" style={{ marginBottom: '0.4rem' }}>What I share</div>
          {status.connected && status.calendar
            ? <CalendarSharing />
            : <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>Connect your Google account first.</div>}
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.6rem' }}>
            Photos go to the shared album only when you add them there yourself.
          </div>
        </section>
      )}
    </div>
  )
}
