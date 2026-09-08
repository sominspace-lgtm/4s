'use client'

import { format } from 'date-fns'
import type { LandmarkId } from '@/lib/village/layout'
import { isDueOn, type Habit } from '@/lib/hooks/useHabits'
import { dueUrgency, type WorkItem } from '@/lib/hooks/useWorkItems'
import type { Place } from '@/lib/hooks/usePlaces'
import type { SmartHomeDevice, ActiveScene } from '@/lib/hooks/useSmartHome'
import IconButton from '@/components/ui/IconButton'

// The glass step between a district's glance card and its real tab
// (2026-09-08). A frosted half-sheet over the dimmed village showing a
// read-only slice of that section — the actual habit/task/place list, not
// just a count — with one button that leaves the village for the full
// page. Same bottom-sheet language as KitchenMode, in the dashboard's own
// tokens rather than the kitchen's cream.

export interface DistrictPreviewData {
  habits: Habit[]
  completions: Record<string, string[]>
  tasks: WorkItem[]
  places: Place[]
  devices: SmartHomeDevice[]
  activeScene: ActiveScene | null
  albums: { label: string; url: string }[]
  events: string[]
  wifiName?: string | null
  notes?: string | null
  treeRings: number
  dinner: string | null
}

const TITLES: Record<LandmarkId, string> = {
  forest: 'Habits', home: 'Smart Home', projects: 'Tasks', places: 'Places',
  people: 'Memories', archive: 'Archive', references: 'Kitchen', calendar: 'Notice board',
}

export default function DistrictPreviewSheet({ district, data, onClose, onOpenFull }: {
  district: LandmarkId
  data: DistrictPreviewData
  onClose: () => void
  onOpenFull: () => void
}) {
  return (
    <div onClick={onClose} style={S.scrim}>
      <div onClick={e => e.stopPropagation()} style={S.card} role="dialog" aria-label={`${TITLES[district]} preview`}>
        <div style={S.grabber} />
        <div style={S.head}>
          <span style={S.kicker}>{TITLES[district]}</span>
          <IconButton label="Close" onClick={onClose} size={14}>✕</IconButton>
        </div>

        <div style={S.body}>{renderBody(district, data)}</div>

        <button onClick={onOpenFull} style={S.footer}>Open the full page →</button>
      </div>
    </div>
  )
}

function renderBody(district: LandmarkId, d: DistrictPreviewData) {
  const today = format(new Date(), 'yyyy-MM-dd')

  if (district === 'forest') {
    const rows = d.habits.filter(h => !h.paused).slice(0, 8)
    if (rows.length === 0) return <Empty>No habits planted yet.</Empty>
    return rows.map(h => {
      const dates = d.completions[h.id] ?? []
      const done = dates.includes(today)
      const due = isDueOn(h, today, dates)
      return <Line key={h.id} mark={done ? '●' : due ? '○' : '·'} tone={done ? 'done' : due ? 'due' : 'idle'}
        label={h.name} meta={done ? 'done today' : due ? 'due today' : 'not due'} />
    })
  }

  if (district === 'projects') {
    const rows = d.tasks.filter(t => t.status !== 'done')
      .sort((a, b) => rank(dueUrgency(a.due_date)) - rank(dueUrgency(b.due_date))).slice(0, 6)
    if (rows.length === 0) return <Empty>Queue clear.</Empty>
    return rows.map(t => {
      const u = dueUrgency(t.due_date)
      return <Line key={t.id} mark="·" tone={u === 'overdue' ? 'due' : 'idle'}
        label={t.title} meta={u === 'overdue' ? 'overdue' : u === 'today' ? 'today' : t.status === 'in-progress' ? 'in progress' : ''} />
    })
  }

  if (district === 'places') {
    const rows = d.places.slice(0, 6)
    if (rows.length === 0) return <Empty>No places saved yet.</Empty>
    return rows.map(p => <Line key={p.id} mark="·" tone="idle" label={p.name} meta={p.city ?? p.kind} />)
  }

  if (district === 'home') {
    const on = d.devices.filter(x => x.on_state)
    return (
      <>
        {d.activeScene && <Line mark="●" tone="done" label={`Scene: ${d.activeScene.name}`} meta="" />}
        {on.length === 0
          ? <Empty>Everything's off.</Empty>
          : on.slice(0, 8).map(x => <Line key={x.id} mark="●" tone="done" label={x.name} meta="on" />)}
      </>
    )
  }

  if (district === 'people') {
    return (
      <>
        {d.albums.length === 0
          ? <Empty>No albums linked yet.</Empty>
          : d.albums.slice(0, 6).map(a => <Line key={a.url} mark="·" tone="idle" label={a.label || 'Album'} meta="photo album" />)}
      </>
    )
  }

  if (district === 'archive') {
    return <Line mark="·" tone="idle" label={d.treeRings > 0 ? `${d.treeRings} year${d.treeRings === 1 ? '' : 's'} kept` : 'Its first year'} meta="" />
  }

  if (district === 'references') {
    return (
      <>
        <Line mark="·" tone="idle" label={d.dinner ? `Tonight: ${d.dinner}` : 'No dinner planned'} meta="" />
        <Line mark="·" tone="idle" label="Recipes, conversions, substitutions" meta="cheat sheet" />
        <Line mark="·" tone="idle" label="Home know-how" meta="cheat sheet" />
      </>
    )
  }

  // calendar / notice board
  const lines = d.events.slice(0, 5)
  return (
    <>
      {lines.length === 0 ? <Empty>Nothing coming up.</Empty> : lines.map((l, i) => <Line key={i} mark="·" tone="idle" label={l} meta="" />)}
      {d.wifiName && <Line mark="·" tone="idle" label={`Wifi: ${d.wifiName}`} meta="" />}
    </>
  )
}

function rank(u: ReturnType<typeof dueUrgency>): number {
  return { overdue: 0, today: 1, soon: 2, fine: 3, none: 4 }[u]
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic', padding: '0.4rem 0' }}>{children}</div>
}

function Line({ mark, tone, label, meta }: { mark: string; tone: 'done' | 'due' | 'idle'; label: string; meta: string }) {
  const color = tone === 'done' ? 'var(--emerald)' : tone === 'due' ? 'var(--amber)' : 'var(--muted)'
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.55rem', padding: '0.34rem 0', borderBottom: '1px solid var(--faint)' }}>
      <span aria-hidden style={{ color, fontSize: '0.7rem', flexShrink: 0 }}>{mark}</span>
      <span style={{ fontSize: '0.82rem', color: 'var(--text)', flex: 1, lineHeight: 1.35 }}>{label}</span>
      {meta && <span style={{ fontSize: '0.66rem', color: 'var(--muted)', flexShrink: 0 }}>{meta}</span>}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  scrim: {
    position: 'fixed', inset: 0, zIndex: 4200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    background: 'color-mix(in srgb, #100c08 32%, transparent)',
  },
  card: {
    width: '100%', maxWidth: '34rem', maxHeight: '62vh', minHeight: '16rem',
    background: 'color-mix(in srgb, var(--surface) 82%, transparent)',
    backdropFilter: 'blur(18px) saturate(1.2)', WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
    borderTop: '1px solid var(--border)', borderRadius: '20px 20px 0 0',
    boxShadow: '0 -12px 44px rgba(0,0,0,0.3)', color: 'var(--text)', fontFamily: 'var(--font-body)',
    padding: '0.6rem 1.3rem calc(1.1rem + env(safe-area-inset-bottom, 0px))',
    display: 'flex', flexDirection: 'column', gap: '0.6rem',
  },
  grabber: { width: 36, height: 4, borderRadius: 2, background: 'var(--border)', alignSelf: 'center', flexShrink: 0 },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  kicker: { fontSize: '0.66rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)' },
  x: { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.9rem', lineHeight: 1, minHeight: 32, minWidth: 32 },
  body: { overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  footer: {
    marginTop: '0.1rem', background: 'var(--gold)', color: 'var(--bg)', border: 'none', borderRadius: 12,
    padding: '0.7rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', minHeight: 44,
  },
}
