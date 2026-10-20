'use client'

import { useHousehold } from '@/lib/hooks/useHousehold'
import type { GuestInfo, PetInfo } from '@/lib/hooks/useGathering'
import { panelCard, panelTitle } from './panelStyle'

// What a guest needs on the wall (2026-10-19): the wifi, the house rules, and
// how to be with Somi. Shown when the shared screen is in guest view. The
// wifi and notes come from the hosting setup (guest info); the rules are the
// household's own House rules; Somi's lines come from her card.
export default function GuestCard({ spaceId, guestInfo, petInfo }: { spaceId: string | null; guestInfo?: GuestInfo; petInfo?: PetInfo }) {
  const h = useHousehold(spaceId)
  const rules = h.rules.filter(r => r.active).slice(0, 6)
  const somiLines = [
    petInfo?.notes,
    petInfo?.snack ? `Her favorite treat is ${petInfo.snack}. Ask before giving her one.` : null,
    petInfo?.tricks?.length ? `She knows: ${petInfo.tricks.join(', ')}.` : null,
  ].filter((x): x is string => !!x && !!x.trim())

  const head: React.CSSProperties = { fontSize: '0.62rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '0.2rem' }
  return (
    <div className="organic" style={{ ...panelCard, gap: '0.75rem', padding: '1rem 1.1rem' }}>
      <div style={{ ...panelTitle, fontSize: '1.2rem' }}>Welcome in</div>
      {(guestInfo?.wifiName || guestInfo?.wifiPassword) ? (
        <div>
          <div style={head}>Wifi</div>
          <div style={{ fontSize: '0.95rem', color: 'var(--text)' }}>{guestInfo.wifiName}</div>
          {guestInfo.wifiPassword && <div style={{ fontSize: '0.95rem', color: 'var(--text)', fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em' }}>{guestInfo.wifiPassword}</div>}
        </div>
      ) : null}
      {guestInfo?.notes && (
        <div>
          <div style={head}>Good to know</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{guestInfo.notes}</div>
        </div>
      )}
      {rules.length > 0 && (
        <div>
          <div style={head}>House rules</div>
          <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.55 }}>
            {rules.map(r => <li key={r.id}>{r.text}</li>)}
          </ul>
        </div>
      )}
      {somiLines.length > 0 && (
        <div>
          <div style={head}>{petInfo?.name || 'Somi'} the cat</div>
          {somiLines.map((l, i) => <div key={i} style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>{l}</div>)}
        </div>
      )}
      {!guestInfo?.wifiName && !guestInfo?.notes && rules.length === 0 && somiLines.length === 0 && (
        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          Add the wifi in the village&rsquo;s hosting setup, house rules in Household, and Somi&rsquo;s notes on her card, and they show here for guests.
        </div>
      )}
    </div>
  )
}
