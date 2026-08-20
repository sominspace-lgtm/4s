'use client'

import { useEffect, useState } from 'react'
import { addDays, differenceInCalendarDays, format, isSameDay, parseISO } from 'date-fns'
import { useHousehold, choreDue, type Chore } from '@/lib/hooks/useHousehold'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useMemoryLinks } from '@/lib/hooks/useMemoryLinks'
import { useLists } from '@/lib/hooks/useLists'
import { useRoutines, routineDue } from '@/lib/hooks/useRoutines'
import { useCheckins, groupCheckinsByWeek } from '@/lib/hooks/useCheckins'
import HomeBrain from '@/components/home/HomeBrain'
import HouseholdCalendar from './HouseholdCalendar'
import WeeklyRecapBlock from './WeeklyRecapBlock'
import DiscordConnect from './DiscordConnect'
import CompanionSync from '@/components/relationships/CompanionSync'
import SectionCustomizer, { type SectionConfig } from '@/components/ui/SectionCustomizer'
import { DEFAULT_HOUSEHOLD_TABS, DEFAULT_HOME_BLOCKS, type HomeBlockId, type HouseholdTabId } from '@/lib/utils/householdLayout'

const SLOTS = ['breakfast', 'lunch', 'dinner'] as const
const MOVEIN_CATEGORIES = ['Furniture', 'Appliances', 'Kitchen', 'Bedroom', 'Living room', 'Bathroom', 'Other']

type HouseholdTab = HouseholdTabId

// Household — the shared-living tab for couples or families under one roof.
//
// It answers the two questions that actually cause friction between people
// who live together: "whose turn is it?" and "what are we eating?". Both are
// deliberately low-ceremony — a chore is a name and a rhythm, a meal is a
// day and a dish. No points, no leaderboards, no "you did 60% of the
// chores" scorekeeping: making housework competitive is a good way to make
// a household worse, and the product's whole premise is reducing guilt
// rather than redistributing it.
//
// Three top tabs (2026-08-11), organised by why you opened the app rather
// than by database table — Home (the weekly stuff), Reference (what you
// look up), Setup (touched once). Both the tab bar and, as of 2026-08-12,
// what's INSIDE Home (Calendar/Shopping/Chores/Meals) are reorderable and
// hideable — `tabs`/`homeBlocks` are owned by DashboardClient, same
// relationship Today has with its own blocks.
export default function HouseholdHub({ userId, userEmail, tabs, onChangeTabs, homeBlocks, onChangeHomeBlocks, sharedMode = false }: {
  userId: string
  userEmail: string
  tabs: SectionConfig[]
  onChangeTabs: (next: SectionConfig[]) => void
  homeBlocks: SectionConfig[]
  onChangeHomeBlocks: (next: SectionConfig[]) => void
  /** From the no-PIN "Shared" login tile. Opens straight on Reference —
   *  "the fridge door" pinned notes are already the first thing in it
   *  (household_notes sorts pinned-first, see useHousehold.ts) — rather than
   *  Home, so a quick glance shows what's pinned, not the full weekly-chore
   *  working view. */
  sharedMode?: boolean
}) {
  const { spaces, members } = useSharedSpaces(userId)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  // There are only ever Harry, Sylvia, and the one space between them — no
  // reason to make either of them pick "Couple" from a dropdown every visit.
  // Still overridable via the picker below (e.g. back to "Just me"), this
  // only changes the DEFAULT, once spaces have actually loaded.
  useEffect(() => {
    if (!spaceId && spaces.length > 0) setSpaceId(spaces[0].id)
  }, [spaces, spaceId])
  const { checkins, loading: checkinsLoading } = useCheckins()
  const [tab, setTab] = useState<HouseholdTab>(sharedMode ? 'reference' : 'home')
  const h = useHousehold(spaceId)
  const memories = useMemoryLinks(spaceId)
  const listsHook = useLists(spaceId)
  const [newListName, setNewListName] = useState('')
  const [listItemDrafts, setListItemDrafts] = useState<Record<string, string>>({})
  const routinesHook = useRoutines(spaceId)
  const [addingRoutine, setAddingRoutine] = useState(false)
  const [routineName, setRoutineName] = useState('')
  const [routineCadence, setRoutineCadence] = useState('7')
  const [routineSteps, setRoutineSteps] = useState('')
  const [addingMaintenance, setAddingMaintenance] = useState(false)
  const [maintName, setMaintName] = useState('')
  const [maintCadence, setMaintCadence] = useState('90')
  const [addingMemoryLink, setAddingMemoryLink] = useState(false)
  const [memoryLabel, setMemoryLabel] = useState('')
  const [memoryUrl, setMemoryUrl] = useState('')

  const [choreName, setChoreName] = useState('')
  const [choreCadence, setChoreCadence] = useState('7')
  const [mealDay, setMealDay] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [mealSlot, setMealSlot] = useState<typeof SLOTS[number]>('dinner')
  const [mealTitle, setMealTitle] = useState('')
  const [mealCook, setMealCook] = useState('')
  const [justDone, setJustDone] = useState<string | null>(null)
  const [shopName, setShopName] = useState('')
  const [shopQty, setShopQty] = useState('')
  const [shopCat, setShopCat] = useState('')
  const [noteBody, setNoteBody] = useState('')
  const [ruleText, setRuleText] = useState('')
  const [ruleCategory, setRuleCategory] = useState('')
  const [moveinName, setMoveinName] = useState('')
  const [moveinCat, setMoveinCat] = useState('')
  const [showRetiredRules, setShowRetiredRules] = useState(false)
  const [tabsCustomizeOpen, setTabsCustomizeOpen] = useState(false)
  const [homeCustomizeOpen, setHomeCustomizeOpen] = useState(false)

  const week = [...Array(7)].map((_, i) => addDays(new Date(), i))

  // Soonest-due first — the list orders itself by what actually needs doing,
  // so nobody has to scan for it.
  const sortedChores = [...h.chores].sort((a, b) => choreDue(a) - choreDue(b))

  async function doneChore(c: Chore) {
    setJustDone(c.id)
    await h.markChoreDone(c.id)
    setTimeout(() => setJustDone(null), 2600)
  }

  const input: React.CSSProperties = {
    background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '7px',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.75rem',
    padding: '0.4rem 0.6rem', outline: 'none',
  }

  // "You" or a member's email, for anything stamped with a user_id — routines'
  // last_done_by, check-ins' rows. First-name-only would be nicer, but nothing
  // in this app collects one; email is what's actually on hand.
  function nameFor(uid: string | null): string | null {
    if (!uid) return null
    if (uid === userId) return 'You'
    return members.find(m => m.member_id === uid)?.member_email ?? null
  }

  function daysAgo(dateStr: string): string {
    const d = differenceInCalendarDays(new Date(), parseISO(dateStr))
    if (d <= 0) return 'today'
    if (d === 1) return 'yesterday'
    return `${d}d ago`
  }

  function dueLabel(c: Chore) {
    const d = choreDue(c)
    if (!c.last_done_at) return { text: 'never done', color: 'var(--muted)' }
    if (d < 0) return { text: `${-d}d overdue`, color: 'var(--rose)' }
    if (d === 0) return { text: 'due today', color: 'var(--amber)' }
    return { text: `in ${d}d`, color: 'var(--muted)' }
  }

  const visibleTabs = tabs.filter(t => !t.hidden)

  // A deep link must never land on a tab the user has hidden — un-hide it
  // rather than rendering a blank pane, same reasoning as PersonalHub's goTo.
  function goToTab(id: HouseholdTab) {
    setTab(id)
    const entry = tabs.find(t => t.id === id)
    if (entry?.hidden) onChangeTabs(tabs.map(t => (t.id === id ? { ...t, hidden: false } : t)))
  }

  // What's inside Home (2026-08-12) — pulled out of four scattered,
  // non-contiguous `{tab === 'home' && ...}` blocks into one ordered,
  // filterable map, the same refactor todayBlocks.ts already did for Today's
  // own content. Each renderer closes over the local state/handlers above.
  const homeBlockRenderers: Record<HomeBlockId, () => React.ReactNode> = {
    thisWeek: () => <WeeklyRecapBlock spaceId={spaceId} />,

    // Everything the house has on, in one fortnight view. Separate from
    // the personal calendar in Today by design: that one answers "what do
    // I have on", this answers "what does this house have on", and your
    // dentist appointment isn't household business any more than the bins
    // are personal business.
    calendar: () => <HouseholdCalendar chores={h.chores} meals={h.meals} />,

    // The highest-friction shared list there is: the one thing everyone
    // needs to write to from a different room, where "did you get milk"
    // is the archetypal failure. Grouped by rough aisle so it's scannable
    // while you're actually standing in a shop, and ticking records who
    // got it so the person who did the run doesn't have to announce it.
    shopping: () => (
      <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
          <div className="t-card">Shopping list</div>
          {h.shopping.some(s => s.got) && (
            <button onClick={() => h.clearGot()} className="btn btn-ghost press" style={{ fontSize: '0.66rem' }}>
              Clear {h.shopping.filter(s => s.got).length} got
            </button>
          )}
        </div>

        {h.shopping.length === 0 && !h.loading && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
            Nothing on the list. Add what you&rsquo;re out of.
          </div>
        )}

        {/* Category groups, but only ones that actually have something in
            them — empty headings are just noise in a shop. */}
        {SHOP_CATEGORIES.map(cat => {
          // Uncategorised items fall into "Other" rather than getting their
          // own unlabelled group — one bucket, not two that mean the same.
          const items = h.shopping.filter(s => (s.category || 'Other') === cat)
          if (items.length === 0) return null
          return (
            <div key={cat} style={{ marginBottom: '0.7rem' }}>
              <div className="t-label" style={{ marginBottom: '0.25rem' }}>{cat}</div>
              {items.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.3rem 0', borderBottom: '1px solid var(--faint)' }}>
                  <button
                    onClick={() => h.toggleGot(s.id, !s.got)}
                    aria-pressed={s.got}
                    aria-label={`${s.name}${s.got ? ', got it' : ''}`}
                    className="press"
                    style={{
                      width: 20, height: 20, borderRadius: '5px', flexShrink: 0, cursor: 'pointer', padding: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${s.got ? 'var(--emerald)' : 'var(--border)'}`,
                      background: s.got ? 'color-mix(in srgb, var(--emerald) 30%, transparent)' : 'transparent',
                    }}
                  >
                    {s.got && (
                      <svg className="tick" width={11} height={11} viewBox="0 0 12 12" aria-hidden>
                        <path d="M2.5 6.2 L4.9 8.6 L9.5 3.6" fill="none" stroke="var(--emerald)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: 'var(--text)', textDecoration: s.got ? 'line-through' : 'none', opacity: s.got ? 0.5 : 1 }}>
                    {s.name}
                  </span>
                  {s.qty && <span style={{ fontSize: '0.64rem', color: 'var(--muted)', flexShrink: 0 }}>{s.qty}</span>}
                  <button onClick={() => h.removeShopping(s.id)} aria-label={`Remove ${s.name}`} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )
        })}

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!shopName.trim()) return
            await h.addShopping(shopName.trim(), shopQty.trim() || null, shopCat || null)
            setShopName(''); setShopQty('')
          }}
          style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}
        >
          <input value={shopName} onChange={e => setShopName(e.target.value)} placeholder="Add an item" style={{ ...input, flex: 1, minWidth: '140px' }} />
          <input value={shopQty} onChange={e => setShopQty(e.target.value)} placeholder="Qty" style={{ ...input, width: '70px' }} />
          <select value={shopCat} onChange={e => setShopCat(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
            <option value="">Category</option>
            {SHOP_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
        </form>
      </section>
    ),

    chores: () => (
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)', marginBottom: '0.6rem' }}>
          Whose turn
        </div>

        {sortedChores.length === 0 && !h.loading && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
            Nothing tracked yet. Add the one chore you argue about most.
          </div>
        )}

        {sortedChores.map(c => {
          const due = dueLabel(c)
          return (
            <div key={c.id} className={`lift ${justDone === c.id ? 'did-it' : ''}`} style={{
              display: 'flex', alignItems: 'center', gap: '0.6rem',
              padding: '0.5rem 0.6rem', borderRadius: '9px', marginBottom: '0.35rem',
              background: 'var(--hover-bg)', border: '1px solid var(--border)',
              position: 'relative',
            }}>
              {/* A chore done is a small thing, but it's a small thing
                  somebody in this house actually did — so it says so, once,
                  and then gets out of the way. */}
              {justDone === c.id && (
                <span className="praise" aria-hidden style={{
                  position: 'absolute', right: '0.6rem', top: '-0.4rem',
                  fontSize: '0.6rem', color: 'var(--emerald)', letterSpacing: '0.04em',
                }}>done ✓</span>
              )}
              <button
                onClick={() => doneChore(c)}
                className={`press ${justDone === c.id ? 'settle' : ''}`}
                title="Mark done — resets the clock"
                style={{
                  background: 'none', border: '1.5px solid var(--emerald)', borderRadius: '50%',
                  width: 20, height: 20, cursor: 'pointer', color: 'var(--emerald)',
                  fontSize: '0.6rem', lineHeight: 1, flexShrink: 0,
                }}
              >✓</button>
              <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: 'var(--text)' }}>{c.name}</span>
              <span style={{ fontSize: '0.62rem', color: due.color, flexShrink: 0 }}>{due.text}</span>
              <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.55, flexShrink: 0 }}>every {c.cadence_days}d</span>
              <button onClick={() => h.removeChore(c.id)} aria-label={`Remove ${c.name}`} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
            </div>
          )
        })}

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!choreName.trim()) return
            await h.addChore(choreName.trim(), Math.max(1, parseInt(choreCadence) || 7))
            setChoreName('')
          }}
          style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}
        >
          <input value={choreName} onChange={e => setChoreName(e.target.value)} placeholder="Add a chore" style={{ ...input, flex: 1, minWidth: '140px' }} />
          <input type="number" min={1} value={choreCadence} onChange={e => setChoreCadence(e.target.value)} title="Every N days" style={{ ...input, width: '70px' }} />
          <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
        </form>
      </section>
    ),

    meals: () => (
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)', marginBottom: '0.6rem' }}>
          This week&rsquo;s meals
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
          {week.map(day => {
            const dayMeals = h.meals.filter(m => isSameDay(parseISO(m.meal_date), day))
            const isToday = isSameDay(day, new Date())
            return (
              <div key={+day} style={{
                border: `1px solid ${isToday ? 'color-mix(in srgb, var(--gold) 40%, var(--border))' : 'var(--border)'}`,
                background: isToday ? 'color-mix(in srgb, var(--gold) 5%, transparent)' : 'transparent',
                borderRadius: '9px', padding: '0.5rem', minHeight: '64px',
              }}>
                <div style={{ fontSize: '0.6rem', color: isToday ? 'var(--gold)' : 'var(--muted)', opacity: isToday ? 1 : 0.7, marginBottom: '0.3rem' }}>
                  {format(day, 'EEE d')}
                </div>
                {dayMeals.length === 0 && <div style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.35, fontStyle: 'italic' }}>—</div>}
                {dayMeals.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem', marginBottom: '0.15rem' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text)', flex: 1, minWidth: 0 }}>{m.title}</span>
                    {m.cook && <span style={{ fontSize: '0.56rem', color: 'var(--emerald)', flexShrink: 0 }}>{m.cook}</span>}
                    <button onClick={() => h.removeMeal(m.id)} aria-label={`Remove ${m.title}`} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.35, fontSize: '0.55rem', flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!mealTitle.trim()) return
            await h.addMeal(mealDay, mealSlot, mealTitle.trim(), mealCook.trim() || null)
            setMealTitle(''); setMealCook('')
          }}
          style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem', flexWrap: 'wrap' }}
        >
          <input type="date" value={mealDay} onChange={e => setMealDay(e.target.value)} style={input} />
          <select value={mealSlot} onChange={e => setMealSlot(e.target.value as typeof SLOTS[number])} style={{ ...input, cursor: 'pointer' }}>
            {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={mealTitle} onChange={e => setMealTitle(e.target.value)} placeholder="What's cooking?" style={{ ...input, flex: 1, minWidth: '130px' }} />
          <input value={mealCook} onChange={e => setMealCook(e.target.value)} placeholder="Who cooks" style={{ ...input, width: '100px' }} />
          <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
        </form>
      </section>
    ),

    // Anything that isn't groceries, move-in, or a watchlist — generic,
    // additive, not a replacement for those (2026-08-13).
    lists: () => (
      <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
        <div className="t-card">Lists</div>

        {listsHook.lists.length === 0 && !listsHook.loading && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
            Nothing yet. Make a list for anything that isn&rsquo;t groceries, move-in, or a watchlist — &ldquo;things to research&rdquo;, gift ideas, whatever.
          </div>
        )}

        {listsHook.lists.map(l => (
          <div key={l.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{l.name}</span>
              <button onClick={() => listsHook.removeList(l.id)} aria-label={`Remove list ${l.name}`} className="press"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem' }}>✕</button>
            </div>
            {l.items.map(i => (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
                <button onClick={() => listsHook.toggleItem(l.id, i.id)} className="press" style={{
                  width: '14px', height: '14px', borderRadius: '4px', border: '1px solid var(--border)', flexShrink: 0,
                  background: i.done ? 'var(--gold)' : 'transparent', cursor: 'pointer', padding: 0,
                }} />
                <span style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text)', opacity: i.done ? 0.45 : 1, textDecoration: i.done ? 'line-through' : 'none' }}>
                  {i.label}
                </span>
                <button onClick={() => listsHook.removeItem(l.id, i.id)} aria-label={`Remove ${i.label}`} className="press"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.35, fontSize: '0.55rem', flexShrink: 0 }}>✕</button>
              </div>
            ))}
            <form
              onSubmit={async e => {
                e.preventDefault()
                const val = listItemDrafts[l.id]?.trim()
                if (!val) return
                await listsHook.addItem(l.id, val)
                setListItemDrafts(d => ({ ...d, [l.id]: '' }))
              }}
              style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}
            >
              <input
                value={listItemDrafts[l.id] ?? ''}
                onChange={e => setListItemDrafts(d => ({ ...d, [l.id]: e.target.value }))}
                placeholder="Add an item" style={{ ...input, flex: 1, fontSize: '0.72rem' }}
              />
              <button type="submit" className="btn btn-ghost press" style={{ fontSize: '0.66rem' }}>Add</button>
            </form>
          </div>
        ))}

        <form
          onSubmit={async e => {
            e.preventDefault()
            if (!newListName.trim()) return
            await listsHook.addList(newListName.trim())
            setNewListName('')
          }}
          style={{ display: 'flex', gap: '0.4rem' }}
        >
          <input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="New list name" style={{ ...input, flex: 1, minWidth: '140px' }} />
          <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>+ New list</button>
        </form>
      </section>
    ),

    // Grouped multi-step chores (2026-08-13) — "Sunday Home Reset" with
    // sub-tasks, separate from the flat single-item chores block above.
    routines: () => {
      const routines = routinesHook.routines.filter(r => r.kind === 'routine')
      return (
        <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div className="t-card">Routines</div>

          {routines.length === 0 && !routinesHook.loading && (
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
              Nothing yet. A routine is a named group of steps — &ldquo;Sunday Home Reset&rdquo;: Bathroom, Kitchen, Laundry, Trash, Sheets.
            </div>
          )}

          {[...routines].sort((a, b) => routineDue(a) - routineDue(b)).map(r => {
            const done = r.items.filter(i => i.done).length
            const due = routineDue(r)
            return (
              <div key={r.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{r.name}</span>
                  <span style={{ fontSize: '0.62rem', color: due < 0 ? 'var(--rose)' : 'var(--muted)' }}>
                    {done}/{r.items.length} · {due < 0 ? `${-due}d overdue` : due === 0 ? 'due' : `in ${due}d`}
                  </span>
                </div>
                {r.last_done_at && nameFor(r.last_done_by) && (
                  <div style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.3rem' }}>
                    Last done by {nameFor(r.last_done_by)}, {daysAgo(r.last_done_at)}
                  </div>
                )}
                {r.items.map(i => (
                  <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.15rem 0' }}>
                    <button onClick={() => routinesHook.toggleRoutineItem(r.id, i.id)} className="press" style={{
                      width: '14px', height: '14px', borderRadius: '4px', border: '1px solid var(--border)', flexShrink: 0,
                      background: i.done ? 'var(--gold)' : 'transparent', cursor: 'pointer', padding: 0,
                    }} />
                    <span style={{ flex: 1, fontSize: '0.75rem', color: 'var(--text)', opacity: i.done ? 0.45 : 1, textDecoration: i.done ? 'line-through' : 'none' }}>
                      {i.label}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                  <button onClick={() => routinesHook.markRoutineDone(r.id)} className="btn btn-secondary press" style={{ fontSize: '0.66rem' }}>Mark whole thing done</button>
                  <button onClick={() => routinesHook.removeRoutine(r.id)} className="press" style={{ background: 'none', border: 'none', color: 'var(--muted)', opacity: 0.5, fontSize: '0.62rem', cursor: 'pointer' }}>Remove</button>
                </div>
              </div>
            )
          })}

          {addingRoutine ? (
            <form
              onSubmit={async e => {
                e.preventDefault()
                if (!routineName.trim()) return
                await routinesHook.addRoutine('routine', routineName.trim(), Number(routineCadence) || 7, routineSteps.split(',').map(s => s.trim()).filter(Boolean))
                setRoutineName(''); setRoutineSteps(''); setRoutineCadence('7'); setAddingRoutine(false)
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}
            >
              <input value={routineName} onChange={e => setRoutineName(e.target.value)} placeholder="Routine name (e.g. Sunday Home Reset)" style={input} autoFocus />
              <input value={routineSteps} onChange={e => setRoutineSteps(e.target.value)} placeholder="Steps, comma-separated (Bathroom, Kitchen, Laundry...)" style={input} />
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Every</span>
                <input type="number" min="1" value={routineCadence} onChange={e => setRoutineCadence(e.target.value)} style={{ ...input, width: '60px' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>days</span>
                <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Save</button>
                <button type="button" onClick={() => setAddingRoutine(false)} className="press" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.68rem', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          ) : (
            <button onClick={() => setAddingRoutine(true)} className="btn btn-secondary press" style={{ fontSize: '0.7rem', alignSelf: 'flex-start' }}>+ New routine</button>
          )}
        </section>
      )
    },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Which household */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', opacity: 0.7 }}>Household</span>
        <select value={spaceId ?? ''} onChange={e => setSpaceId(e.target.value || null)} style={{ ...input, cursor: 'pointer' }}>
          <option value="">Just me</option>
          {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {spaces.length === 0 && (
          <span style={{ fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.7 }}>
            Create a space in People → Spaces to share this with someone.
          </span>
        )}
      </div>

      {h.error && (
        <div style={{ fontSize: '0.7rem', color: 'var(--rose)', background: 'color-mix(in srgb, var(--rose) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--rose) 25%, transparent)', borderRadius: '8px', padding: '0.5rem 0.7rem' }}>
          {h.error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <div className="tabs-wrap" style={{ display: 'inline-flex', gap: '0.25rem', flexWrap: 'wrap', background: 'var(--hover-bg)', borderRadius: '9px', padding: '0.25rem' }}>
          {visibleTabs.map(tb => (
            <button key={tb.id} onClick={() => goToTab(tb.id as HouseholdTab)} className="btn press" style={{
              fontSize: '0.72rem', padding: '0.4em 0.9em',
              background: tab === tb.id ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
              color: tab === tb.id ? 'var(--gold)' : 'var(--muted)', border: 'none',
            }}>{tb.label}</button>
          ))}
        </div>
        <button onClick={() => setTabsCustomizeOpen(true)} title="Customize Household" className="press" style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.6, fontSize: '0.85rem', padding: '0.3rem',
        }}>⚙</button>
      </div>

      {tab === 'home' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setHomeCustomizeOpen(true)} title="Customize Home" className="press" style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.5, fontSize: '0.68rem', padding: '0.2rem',
            }}>⚙ arrange</button>
          </div>
          {homeBlocks.filter(b => !b.hidden).map(b => (
            <div key={b.id}>{homeBlockRenderers[b.id as HomeBlockId]()}</div>
          ))}
        </>
      )}

      {/* Home Brain — the household's memory: wifi passwords, serial
          numbers, which filter the fridge takes. Moved here from Personal →
          Life (2026-08-07), where it never belonged: none of it is personal
          and all of it is the sort of thing the OTHER people in the house
          need at 9pm when you're not home. It sits under the same space
          picker as chores and meals, so it follows "just me" vs a shared
          household exactly like they do. */}
      {tab === 'reference' && <HomeBrain />}

      {/* ── Move-in ────────────────────────────────────────────────
          Furniture and appliances for a shared move — its own tab, its own
          table (household_movein_items), deliberately separate from the
          Shopping block inside Home. See the migration header for why:
          different rhythm, different question, and it deserves not to be
          buried right when a move is actually happening. Reachable from
          Discord too — a message in the configured move-in channel becomes
          a row here directly. */}
      {tab === 'movein' && (
        <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.6rem', marginBottom: '0.7rem', flexWrap: 'wrap' }}>
            <div className="t-card">Move-in list</div>
            {h.moveinItems.some(i => i.got) && (
              <button
                onClick={() => Promise.all(h.moveinItems.filter(i => i.got).map(i => h.removeMoveinItem(i.id)))}
                className="btn btn-ghost press" style={{ fontSize: '0.66rem' }}
              >
                Clear {h.moveinItems.filter(i => i.got).length} got
              </button>
            )}
          </div>

          {h.moveinItems.length === 0 && !h.loading && (
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
              Nothing on the list yet. Add what the new place still needs — furniture, appliances, whatever&rsquo;s on your mind.
            </div>
          )}

          {MOVEIN_CATEGORIES.map(cat => {
            const items = h.moveinItems.filter(i => (i.category || 'Other') === cat)
            if (items.length === 0) return null
            return (
              <div key={cat} style={{ marginBottom: '0.7rem' }}>
                <div className="t-label" style={{ marginBottom: '0.25rem' }}>{cat}</div>
                {items.map(i => (
                  <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.3rem 0', borderBottom: '1px solid var(--faint)' }}>
                    <button
                      onClick={() => h.toggleMoveinGot(i.id, !i.got)}
                      aria-pressed={i.got}
                      aria-label={`${i.name}${i.got ? ', got it' : ''}`}
                      className="press"
                      style={{
                        width: 20, height: 20, borderRadius: '5px', flexShrink: 0, cursor: 'pointer', padding: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${i.got ? 'var(--emerald)' : 'var(--border)'}`,
                        background: i.got ? 'color-mix(in srgb, var(--emerald) 30%, transparent)' : 'transparent',
                      }}
                    >
                      {i.got && (
                        <svg className="tick" width={11} height={11} viewBox="0 0 12 12" aria-hidden>
                          <path d="M2.5 6.2 L4.9 8.6 L9.5 3.6" fill="none" stroke="var(--emerald)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: 'var(--text)', textDecoration: i.got ? 'line-through' : 'none', opacity: i.got ? 0.5 : 1 }}>
                      {i.name}
                    </span>
                    <button onClick={() => h.removeMoveinItem(i.id)} aria-label={`Remove ${i.name}`} className="press" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            )
          })}

          <form
            onSubmit={async e => {
              e.preventDefault()
              if (!moveinName.trim()) return
              await h.addMoveinItem(moveinName.trim(), moveinCat || null)
              setMoveinName('')
            }}
            style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}
          >
            <input value={moveinName} onChange={e => setMoveinName(e.target.value)} placeholder="Add something for the new place" style={{ ...input, flex: 1, minWidth: '160px' }} />
            <select value={moveinCat} onChange={e => setMoveinCat(e.target.value)} style={{ ...input, cursor: 'pointer' }}>
              <option value="">Category</option>
              {MOVEIN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
          </form>
        </section>
      )}

      {tab === 'setup' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Moved from People → Close (2026-08-11): confirming a partner and
              the Google Photos/checkin feed that comes with it is pair-scoped
              shared-living data, and its Discord counterpart already lived
              right here. Same tab, same "who else is in this household". */}
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.8rem' }}>Partner</div>
            <CompanionSync userId={userId} userEmail={userEmail} />
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.8rem' }}>Discord</div>
            <DiscordConnect spaceId={spaceId} spaceName={spaces.find(s => s.id === spaceId)?.name} />
          </div>
          <div style={{ background: 'var(--surface)', borderRadius: '16px', padding: '1.4rem 1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.8rem' }}>Memories</div>
            {!spaceId ? (
              <div style={{ fontSize: '0.76rem', color: 'var(--muted)', opacity: 0.75 }}>
                Pick a shared space above first — memories are attached to the space, not to you alone.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {/* Each source (Google Photos, iCloud, a Drive folder...) is its
                    own tile — a couple usually has more than one photo home,
                    and the old single-link field could only ever hold one. */}
                {memories.links.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {memories.links.map(link => (
                      <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.4rem 0.4rem 0.4rem 0.7rem' }}>
                        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.72rem', color: 'var(--text)', textDecoration: 'none' }}>
                          📷 {link.label}
                        </a>
                        <button
                          onClick={() => memories.removeLink(link.id)}
                          aria-label={`Remove ${link.label}`}
                          className="press"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.5, fontSize: '0.6rem' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {addingMemoryLink ? (
                  <form
                    onSubmit={async e => {
                      e.preventDefault()
                      if (!memoryLabel.trim() || !memoryUrl.trim()) return
                      await memories.addLink(memoryLabel.trim(), memoryUrl.trim())
                      setMemoryLabel(''); setMemoryUrl(''); setAddingMemoryLink(false)
                    }}
                    style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}
                  >
                    <input
                      value={memoryLabel} onChange={e => setMemoryLabel(e.target.value)}
                      placeholder="Label (e.g. Google Photos, iCloud)" style={{ ...input, width: '180px' }} autoFocus
                    />
                    <input
                      value={memoryUrl} onChange={e => setMemoryUrl(e.target.value)}
                      placeholder="Paste the album/folder link" style={{ ...input, flex: 1, minWidth: '220px' }}
                    />
                    <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Save</button>
                    <button type="button" onClick={() => setAddingMemoryLink(false)} className="press" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.7rem', cursor: 'pointer' }}>Cancel</button>
                  </form>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {memories.links.length === 0 && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--muted)', opacity: 0.75 }}>
                        No albums linked yet. Paste a Google Photos, iCloud, or Drive link — opens in a new tab, no login through 4S OS required.
                      </div>
                    )}
                    <button
                      onClick={() => setAddingMemoryLink(true)}
                      className="btn btn-secondary press"
                      style={{ fontSize: '0.7rem', alignSelf: 'flex-start' }}
                    >
                      + Add a memories link
                    </button>
                  </div>
                )}

                {/* Distinct from the link-outs above: photos actually
                    uploaded through a Places pin (Discord attachment or the
                    "+ Add" button in 4S OS) live in the pin's own Photos
                    section, not here — this is the album-link home, not a
                    gallery of hosted photos. */}
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.6, borderTop: '1px solid var(--faint)', paddingTop: '0.5rem' }}>
                  Photos you&rsquo;ve uploaded to a specific pin live on that pin, under Places → Photos — not here.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Notes ──────────────────────────────────────────────────
          The fridge door. Not tasks and not chores — the gate code, the
          vet's number, "back late Tuesday". Things you'd write on a magnet
          pad, which is exactly why they have no due date and no owner. */}
      {tab === 'reference' && (
        <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
          <div className="t-card" style={{ marginBottom: '0.7rem' }}>The fridge door</div>

          {h.notes.length === 0 && !h.loading && (
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
              Nothing pinned up. Gate codes, the vet&rsquo;s number, &ldquo;back late Tuesday&rdquo;.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
            {h.notes.map(n => (
              <div key={n.id} className="organic" style={{
                background: n.pinned ? 'color-mix(in srgb, var(--amber) 12%, var(--surface2))' : 'var(--surface2)',
                border: `1px solid ${n.pinned ? 'color-mix(in srgb, var(--amber) 35%, var(--border))' : 'var(--border)'}`,
                padding: '0.7rem 0.8rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
              }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{n.body}</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: 'auto' }}>
                  <button onClick={() => h.toggleNotePin(n.id, !n.pinned)} title={n.pinned ? 'Unpin' : 'Pin to top'} className="press"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.66rem', color: n.pinned ? 'var(--amber)' : 'var(--muted)', opacity: n.pinned ? 1 : 0.5, padding: 0 }}>
                    {n.pinned ? '📌' : '📍'}
                  </button>
                  <button onClick={() => h.removeNote(n.id)} aria-label="Remove note" className="press"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.4, marginLeft: 'auto', padding: 0 }}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <form
            onSubmit={async e => { e.preventDefault(); if (!noteBody.trim()) return; await h.addNote(noteBody.trim()); setNoteBody('') }}
            style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem', flexWrap: 'wrap' }}
          >
            <input value={noteBody} onChange={e => setNoteBody(e.target.value)} placeholder="Pin something up" style={{ ...input, flex: 1, minWidth: '160px' }} />
            <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Pin</button>
          </form>
        </section>
      )}

      {/* ── Rules ──────────────────────────────────────────────────
          Standing conventions, not one-off tasks: "no shoes inside", not
          "take the recycling out". Retiring a rule keeps it visible under a
          fold rather than deleting it — "we used to do this" is worth
          remembering when the reason it changed comes up again. */}
      {tab === 'reference' && (
        <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
          <div className="t-card" style={{ marginBottom: '0.7rem' }}>House rules</div>

          {h.rules.filter(r => r.active).length === 0 && !h.loading && (
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
              No rules yet. The first one is usually about shoes.
            </div>
          )}

          {h.rules.filter(r => r.active).map(r => (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.4rem 0', borderBottom: '1px solid var(--faint)' }}>
              <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: 'var(--text)' }}>{r.text}</span>
              {r.category && <span style={{ fontSize: '0.6rem', color: 'var(--muted)', flexShrink: 0 }}>{r.category}</span>}
              <button onClick={() => h.toggleRuleActive(r.id, false)} title="Retire this rule" className="press"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.5, fontSize: '0.62rem', flexShrink: 0 }}>
                retire
              </button>
              <button onClick={() => h.removeRule(r.id)} aria-label={`Delete ${r.text}`} className="press"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
            </div>
          ))}

          {h.rules.some(r => !r.active) && (
            <div style={{ marginTop: '0.8rem' }}>
              <button onClick={() => setShowRetiredRules(v => !v)} className="btn btn-ghost press" style={{ fontSize: '0.64rem' }}>
                {showRetiredRules ? 'Hide' : 'Show'} {h.rules.filter(r => !r.active).length} retired
              </button>
              {showRetiredRules && h.rules.filter(r => !r.active).map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.35rem 0', opacity: 0.55 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: '0.74rem', color: 'var(--text)', textDecoration: 'line-through' }}>{r.text}</span>
                  <button onClick={() => h.toggleRuleActive(r.id, true)} title="Bring this rule back" className="press"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.6rem', flexShrink: 0 }}>
                    restore
                  </button>
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={async e => {
              e.preventDefault()
              if (!ruleText.trim()) return
              await h.addRule(ruleText.trim(), ruleCategory.trim() || null, null)
              setRuleText(''); setRuleCategory('')
            }}
            style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem', flexWrap: 'wrap' }}
          >
            <input value={ruleText} onChange={e => setRuleText(e.target.value)} placeholder="Add a house rule" style={{ ...input, flex: 1, minWidth: '160px' }} />
            <input value={ruleCategory} onChange={e => setRuleCategory(e.target.value)} placeholder="Category (optional)" style={{ ...input, width: '140px' }} />
            <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
          </form>
        </section>
      )}

      {/* Check-ins (2026-08-18) — the weekly relationship check-in you answer
          in Discord, read-only here. This is deliberately NOT where you answer
          them: the DM flow exists because a modal/DM is the only place that
          feels private enough to write an honest answer in the moment. 4S is
          just where you go back and read what was actually said. */}
      {tab === 'reference' && (() => {
        const weeks = groupCheckinsByWeek(checkins)
        return (
          <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
            <div className="t-card" style={{ marginBottom: '0.3rem' }}>Check-ins</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.7rem' }}>
              Your weekly check-in, answered in Discord — this is just where it&rsquo;s kept.
            </div>

            {weeks.length === 0 && !checkinsLoading && (
              <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
                No check-ins yet. They show up here once you&rsquo;ve answered one in Discord.
              </div>
            )}

            {weeks.map(w => (
              <details key={w.weekOf} style={{ borderBottom: '1px solid var(--faint)', padding: '0.6rem 0' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Week of {w.weekOf}</span>
                  <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>
                    {Object.keys(w.byUser).length === 1 ? 'one of you answered' : 'both answered'}
                  </span>
                </summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', marginTop: '0.6rem' }}>
                  {Object.entries(w.byUser).map(([uid, c]) => (
                    <div key={uid} style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--gold)', marginBottom: '0.4rem' }}>{nameFor(uid) ?? 'Partner'}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        {c.answers.map((a, i) => (
                          <div key={i}>
                            {a.questionText && <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.75 }}>{a.questionText}</div>}
                            <div style={{ fontSize: '0.74rem', color: 'var(--text)', lineHeight: 1.5 }}>{a.answer}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </section>
        )
      })()}

      {/* Maintenance (2026-08-13) — long-cadence items ("HVAC filter every 3
          months") that would get lost in a weekly chore/routine list. Same
          household_routines table as Routines, kind='maintenance'. */}
      {tab === 'reference' && (() => {
        const maint = [...routinesHook.routines.filter(r => r.kind === 'maintenance')].sort((a, b) => routineDue(a) - routineDue(b))
        return (
          <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
            <div className="t-card" style={{ marginBottom: '0.7rem' }}>Maintenance</div>

            {maint.length === 0 && !routinesHook.loading && (
              <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
                Nothing yet. The stuff that happens occasionally: HVAC filter every 3 months, smoke detector batteries every year.
              </div>
            )}

            {maint.map(m => {
              const due = routineDue(m)
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.4rem 0', borderBottom: '1px solid var(--faint)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{m.name}</div>
                    {m.last_done_at && nameFor(m.last_done_by) && (
                      <div style={{ fontSize: '0.58rem', color: 'var(--muted)', opacity: 0.55 }}>
                        Last done by {nameFor(m.last_done_by)}, {daysAgo(m.last_done_at)}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.62rem', color: due < 0 ? 'var(--rose)' : due === 0 ? 'var(--amber)' : 'var(--muted)', flexShrink: 0 }}>
                    every {m.cadence_days}d · {due < 0 ? `${-due}d overdue` : due === 0 ? 'due' : `in ${due}d`}
                  </span>
                  <button onClick={() => routinesHook.markRoutineDone(m.id)} className="press"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.6, fontSize: '0.62rem', flexShrink: 0 }}>done</button>
                  <button onClick={() => routinesHook.removeRoutine(m.id)} aria-label={`Remove ${m.name}`} className="press"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
                </div>
              )
            })}

            {addingMaintenance ? (
              <form
                onSubmit={async e => {
                  e.preventDefault()
                  if (!maintName.trim()) return
                  await routinesHook.addRoutine('maintenance', maintName.trim(), Number(maintCadence) || 90, [])
                  setMaintName(''); setMaintCadence('90'); setAddingMaintenance(false)
                }}
                style={{ display: 'flex', gap: '0.4rem', marginTop: '0.7rem', flexWrap: 'wrap' }}
              >
                <input value={maintName} onChange={e => setMaintName(e.target.value)} placeholder="e.g. Replace HVAC filter" style={{ ...input, flex: 1, minWidth: '160px' }} autoFocus />
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', alignSelf: 'center' }}>every</span>
                <input type="number" min="1" value={maintCadence} onChange={e => setMaintCadence(e.target.value)} style={{ ...input, width: '60px' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)', alignSelf: 'center' }}>days</span>
                <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Save</button>
                <button type="button" onClick={() => setAddingMaintenance(false)} className="press" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '0.68rem', cursor: 'pointer' }}>Cancel</button>
              </form>
            ) : (
              <button onClick={() => setAddingMaintenance(true)} className="btn btn-secondary press" style={{ fontSize: '0.7rem', marginTop: '0.7rem' }}>+ New maintenance item</button>
            )}
          </section>
        )
      })()}

      <SectionCustomizer
        open={tabsCustomizeOpen}
        title="Customize Household"
        sections={tabs}
        defaultSections={DEFAULT_HOUSEHOLD_TABS}
        onChange={onChangeTabs}
        onClose={() => setTabsCustomizeOpen(false)}
      />
      <SectionCustomizer
        open={homeCustomizeOpen}
        title="Arrange Home"
        sections={homeBlocks}
        defaultSections={DEFAULT_HOME_BLOCKS}
        onChange={onChangeHomeBlocks}
        onClose={() => setHomeCustomizeOpen(false)}
      />
    </div>
  )
}

// Loose aisle grouping. Not a taxonomy to get right — just enough that a
// 30-item list is scannable while you're standing in a shop.
const SHOP_CATEGORIES = ['Produce', 'Chilled', 'Cupboard', 'Frozen', 'Household', 'Other']
