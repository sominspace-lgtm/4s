'use client'

import { useState } from 'react'
import { useCollections, COLLECTION_TEMPLATES, type CollectionProp } from '@/lib/hooks/useCollections'
import { usePlaces } from '@/lib/hooks/usePlaces'
import { SYSTEM_SPECS, SYSTEM_KEYS, type SystemKey } from '@/lib/collections/system'
import { useSystemDef, useDateIdeaSource, useWatchSource } from '@/lib/hooks/useSystemCollection'
import { RowSendAllowed } from '@/components/notes/RowSendMenu'
import { CollectionViewGeneric, UserCollectionView, CollectionCards, type RowSource } from '@/components/notes/CollectionsHub'

// The household's Reference lists, as collections (2026-10-12): date ideas,
// movies and shows, games, and anything else the two of you have shared as a
// collection. Open one to get the table or board, search, sort, and your own
// extra columns. In guest mode only the three built-in lists show, same as
// before (guests got the date list and the watchlists, nothing else).

const muted: React.CSSProperties = { fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.5 }

export default function ReferenceCollections(props: {
  spaceId: string | null; userId: string; guestMode?: boolean; sharedMode?: boolean
}) {
  return (
    <RowSendAllowed.Provider value={!props.sharedMode}>
      <ReferenceCollectionsInner {...props} />
    </RowSendAllowed.Provider>
  )
}

function ReferenceCollectionsInner({ spaceId, userId, guestMode = false }: {
  spaceId: string | null; userId: string; guestMode?: boolean
}) {
  const hub = useCollections()
  const [open, setOpen] = useState<{ system: SystemKey } | { id: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  if (!spaceId) {
    return (
      <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
        <div className="t-card" style={{ marginBottom: '0.4rem' }}>Collections</div>
        <div style={muted}>Date ideas, movies and games live here once you have a household space.</div>
      </section>
    )
  }

  const shared = hub.collections.filter(c => !c.system_key && c.space_id === spaceId)

  let body: React.ReactNode
  if (open && 'system' in open) {
    body = <SystemView key={open.system} spaceId={spaceId} sysKey={open.system} onBack={() => setOpen(null)} />
  } else if (open && 'id' in open && shared.find(c => c.id === open.id)) {
    const c = shared.find(x => x.id === open.id)!
    body = (
      <UserCollectionView key={c.id} c={c} me={userId} spaceId={spaceId} backLabel="Collections" onBack={() => setOpen(null)} update={hub.update}
        onDelete={async () => { if (window.confirm(`Delete "${c.name}" and everything in it?`)) { await hub.remove(c.id); setOpen(null) } }} />
    )
  } else {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(12rem, 1fr))', gap: '0.7rem' }}>
          {SYSTEM_KEYS.map(k => (
            <button key={k} onClick={() => setOpen({ system: k })} className="press" style={{
              textAlign: 'left', cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '12px',
              padding: '0.85rem 0.95rem', fontFamily: 'var(--font-body)', display: 'flex', flexDirection: 'column', gap: '0.3rem',
            }}>
              <span style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{SYSTEM_SPECS[k].name}</span>
              <span style={{ ...muted, fontSize: '0.64rem' }}>{SYSTEM_SPECS[k].blurb}</span>
            </button>
          ))}
        </div>
        {!guestMode && shared.length > 0 && <CollectionCards collections={shared} onOpen={id => setOpen({ id })} />}
        {!guestMode && creating && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(9.5rem, 1fr))', gap: '0.5rem' }}>
            {COLLECTION_TEMPLATES.map(t => (
              <button key={t.id} className="press" onClick={async () => {
                const r = await hub.create(t, t.id === 'blank' ? 'Untitled' : t.label, spaceId)
                setErr(r.error); if (r.id) { setCreating(false); setOpen({ id: r.id }) }
              }} style={{
                textAlign: 'left', cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '10px',
                padding: '0.55rem 0.7rem', fontFamily: 'var(--font-body)', color: 'var(--text)', fontSize: '0.78rem',
              }}>{t.label}</button>
            ))}
          </div>
        )}
        {err && <div style={{ ...muted, color: 'var(--rose)' }}>{err}</div>}
      </div>
    )
  }

  const atRoot = !open
  return (
    <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.7rem' }}>
        <div className="t-card">Collections</div>
        {atRoot && !guestMode && (
          <button onClick={() => setCreating(c => !c)} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.66rem', padding: 0 }}>
            + New shared collection
          </button>
        )}
      </div>
      {body}
    </section>
  )
}

// One built-in list, shown through the shared table/board view.
function SystemView({ spaceId, sysKey, onBack }: { spaceId: string; sysKey: SystemKey; onBack: () => void }) {
  return sysKey === 'date_ideas'
    ? <DateIdeasView spaceId={spaceId} onBack={onBack} />
    : <WatchView spaceId={spaceId} sysKey={sysKey} onBack={onBack} />
}

function DateIdeasView({ spaceId, onBack }: { spaceId: string; onBack: () => void }) {
  const source = useDateIdeaSource(spaceId)
  const { places } = usePlaces()
  return <SystemShell spaceId={spaceId} sysKey="date_ideas" source={source} places={places} onBack={onBack} />
}

function WatchView({ spaceId, sysKey, onBack }: { spaceId: string; sysKey: 'movies' | 'games'; onBack: () => void }) {
  const source = useWatchSource(spaceId, sysKey === 'games' ? 'game' : 'media')
  return <SystemShell spaceId={spaceId} sysKey={sysKey} source={source} onBack={onBack} />
}

function SystemShell({ spaceId, sysKey, source, places, onBack }: {
  spaceId: string; sysKey: SystemKey; source: RowSource; places?: ReturnType<typeof usePlaces>['places']; onBack: () => void
}) {
  const spec = SYSTEM_SPECS[sysKey]
  const { def, update } = useSystemDef(spaceId, sysKey)
  const props: CollectionProp[] = [...spec.core, ...def.props]
  const coreIds = new Set(spec.core.map(p => p.id))
  return (
    <CollectionViewGeneric
      name={spec.name} props={props} view={def.view} boardPropId={def.boardProp} locked={coreIds}
      source={source} places={places} backLabel="Collections" onBack={onBack}
      actions={{
        rename: () => {}, remove: () => {}, toggleShare: () => {},
        // Only your own columns are saved on the collection; the built-in
        // ones always come from the spec.
        setProps: next => { update({ props: next.filter(p => !coreIds.has(p.id)) }) },
        setView: view => { update({ view }) },
      }} />
  )
}
