'use client'

import { format } from 'date-fns'
import Icon, { type IconName } from '@/components/ui/Icon'
import { useWorkItems } from '@/lib/hooks/useWorkItems'
import { useHabits } from '@/lib/hooks/useHabits'
import { useSubscriptions } from '@/lib/hooks/useSubscriptions'
import { useWishlist } from '@/lib/hooks/useWishlist'
import { useCheckins } from '@/lib/hooks/useCheckins'

// Me (2026-10-21 redesign): your own things as a grid of tiles instead of a
// row of eight pills. Each tile says one useful thing about what is inside.

const TILES: { id: string; label: string; icon: IconName; tint: string }[] = [
  { id: 'checkins', label: 'Check-ins', icon: 'heart',     tint: 'var(--rose)' },
  { id: 'mycalendar', label: 'Calendar', icon: 'calendar',  tint: 'var(--gold)' },
  { id: 'tasks',    label: 'Tasks',     icon: 'clipboard', tint: 'var(--gold)' },
  { id: 'habits',   label: 'Habits',    icon: 'sprout',    tint: 'var(--emerald)' },
  { id: 'notes',    label: 'Notes',     icon: 'lightbulb', tint: 'var(--amber, var(--gold))' },
  { id: 'money',    label: 'Money',     icon: 'scale',     tint: 'var(--emerald)' },
  { id: 'wishlist', label: 'Wishlist',  icon: 'sparkle',   tint: 'var(--rose)' },
  { id: 'vault',    label: 'Passwords', icon: 'lock',      tint: 'var(--muted)' },
]

export default function MeGrid({ visible, onOpen, userId }: { visible: Set<string>; onOpen: (id: string) => void; userId: string }) {
  const { items } = useWorkItems()
  const { habits, completions } = useHabits()
  const { total } = useSubscriptions()
  const { wishes } = useWishlist()
  const { thisWeekMine, doneThisWeek } = useCheckins(userId)

  const today = format(new Date(), 'yyyy-MM-dd')
  const open = items.filter(i => i.status !== 'done')
  const dueNow = open.filter(i => i.due_date && i.due_date.slice(0, 10) <= today).length
  const activeHabits = habits.filter(h => !(h as { paused?: boolean }).paused)
  const doneToday = activeHabits.filter(h => (completions[h.id] ?? []).includes(today)).length
  const wanted = wishes.filter(w => w.status === 'wanted').length

  const hint: Record<string, string> = {
    checkins: thisWeekMine ? (doneThisWeek.length > 1 ? 'Both in this week' : 'Done, waiting on your partner') : 'Not done this week',
    mycalendar: 'Everything dated',
    tasks: dueNow > 0 ? `${dueNow} due` : open.length > 0 ? `${open.length} open` : 'All clear',
    habits: activeHabits.length > 0 ? `${doneToday} of ${activeHabits.length} today` : 'Start one',
    notes: 'Thoughts and lists',
    money: total > 0 ? `$${total.toFixed(0)} a month` : 'Bills and renewals',
    wishlist: wanted > 0 ? `${wanted} wanted` : 'Things you want',
    vault: 'Locked',
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(10rem, 45%), 1fr))', gap: '0.75rem' }}>
      {TILES.filter(t => visible.has(t.id)).map(t => (
        <button key={t.id} onClick={() => onOpen(t.id)} className="press organic" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.55rem', textAlign: 'left',
          minHeight: 112, padding: '1rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 18,
          boxShadow: '0 6px 18px color-mix(in srgb, var(--text) 5%, transparent)',
        }}>
          <span aria-hidden style={{
            width: 38, height: 38, borderRadius: 12, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: `color-mix(in srgb, ${t.tint} 14%, transparent)`, color: t.tint,
          }}><Icon name={t.icon} size={19} /></span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--text)' }}>{t.label}</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{hint[t.id]}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
