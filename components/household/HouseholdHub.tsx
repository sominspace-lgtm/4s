'use client'

import { useEffect, useState } from 'react'
import { differenceInCalendarDays, differenceInMinutes, isSameDay, parseISO } from 'date-fns'
import { useHousehold, choreDue, type Chore } from '@/lib/hooks/useHousehold'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useTrips } from '@/lib/hooks/useTrips'
import { usePresenceHeartbeat, usePartnerPresence } from '@/lib/hooks/usePresence'
import HouseholdCalendar from './HouseholdCalendar'
import WeeklyRecapBlock from './WeeklyRecapBlock'
import WinsBlock from './WinsBlock'
import ThingsWeOwn from './ThingsWeOwn'
import OurPhotos from './OurPhotos'
import SharedDrive from './SharedDrive'
import AwayCard from './AwayCard'
import HouseholdAtAGlance from './HouseholdAtAGlance'
import HouseholdNotes from './HouseholdNotes'
import ReferenceCollections from './ReferenceCollections'
import HouseholdReferenceMemories from './HouseholdReferenceMemories'
import HouseholdSmartHome from './HouseholdSmartHome'
import DiceCoin from './DiceCoin'
import DateNightPicker from './DateNightPicker'
import CheckinCard from '@/components/checkin/CheckinCard'
import IconButton from '@/components/ui/IconButton'
import { openSmartHome, goToSection } from '@/lib/utils/navigate'
import SectionCustomizer, { type SectionConfig } from '@/components/ui/SectionCustomizer'
import Icon from '@/components/ui/Icon'
import Segmented from '@/components/ui/Segmented'
import GoogleCalendar from '@/components/google/GoogleCalendar'
import { useGoogleStatus } from '@/lib/hooks/useGoogle'
import Sheet from '@/components/ui/Sheet'
import { DEFAULT_HOME_BLOCKS, type HomeBlockId, type HouseholdTabId } from '@/lib/utils/householdLayout'

/** The Millton, Redwood City CA — the move-in address the Move-In block is about. */
const NEW_HOME = { label: 'The Millton', city: 'Redwood City, CA' }

// Breakfast before lunch before dinner when listing a day's meals.
const SLOT_ORDER: Record<'breakfast' | 'lunch' | 'dinner', number> = { breakfast: 0, lunch: 1, dinner: 2 }

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
// Home / Calendar / Reference are top-level nav sections now (2026-08-25),
// each rendered as <HouseholdHub forcedTab={id}>. Organised by why you
// opened the app rather than by database table — Home (the weekly stuff),
// Calendar (what's coming), Reference (what you look up). What's INSIDE
// Home is reorderable and hideable — `homeBlocks` is owned by
// DashboardClient, same relationship Today has with its own blocks.
const STARTER_CHORES: { folder: string; label: string; chores: { name: string; every: number }[] }[] = [
  { folder: 'Somi', label: "Add Somi's chores", chores: [
    { name: "Clean Somi's litter", every: 1 },
    { name: 'Fresh water and food bowls', every: 1 },
    { name: "Deep-clean Somi's litter box", every: 14 },
    { name: "Trim Somi's nails", every: 14 },
    { name: "Brush Somi", every: 7 },
    { name: 'Flea and tick treatment', every: 30 },
    { name: 'Bathe Somi', every: 60 },
    { name: 'Vet checkup', every: 365 },
  ] },
  { folder: 'House', label: 'Add house upkeep', chores: [
    { name: 'Water the plants', every: 3 },
    { name: 'Change the HVAC filter', every: 90 },
    { name: 'Replace the water filter', every: 60 },
    { name: 'Test the smoke detectors', every: 180 },
    { name: 'Clean the gutters', every: 180 },
    { name: 'Pest control', every: 90 },
  ] },
]

export default function HouseholdHub({ userId, userEmail, homeBlocks, onChangeHomeBlocks, sharedMode = false, guestMode = false, forcedTab, boardNote = '', onSetBoardNote, boardNoteBy = null, boardNoteSeenAt = null, onSeeBoardNote }: {
  userId: string
  userEmail: string
  homeBlocks: SectionConfig[]
  onChangeHomeBlocks: (next: SectionConfig[]) => void
  /** From the no-PIN "Shared" login tile. Opens straight on Reference (the
   *  household's shared notes / lookups) rather than the full weekly-chore
   *  working view on Home. */
  sharedMode?: boolean
  /** A gathering is live on this shared device — Reference shows only the
   *  guest-safe bits (date ideas, watchlist, photo albums, hosting
   *  keepsakes); Notes / Understanding / Check-ins need the PIN, 2026-09-10. */
  guestMode?: boolean
  /** Prompts the real Harry/Sylvia PIN unlock (see UnlockPanel) — used to
   *  gate genuinely personal content (Check-ins) while sharedMode is on,
   *  same mechanism Village already uses (2026-08-25). */
  onLockedNavigate?: (reason: string) => void
  /** Which sub-tab to show. Always set by DashboardClient — one
   *  <HouseholdHub forcedTab={id}> per Home/Calendar/Reference section. */
  forcedTab?: HouseholdTab
  /** One line a partner leaves the other on the village notice board. */
  boardNote?: string
  onSetBoardNote?: (text: string) => void
  boardNoteBy?: string | null
  boardNoteSeenAt?: string | null
  onSeeBoardNote?: () => void
}) {
  const { spaces, members } = useSharedSpaces(userId)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  // There are only ever Harry, Sylvia, and the one space between them — no
  // reason to make either of them pick "Couple" from a dropdown every visit.
  // Still overridable via the picker below (e.g. back to "Just me"), this
  // only changes the DEFAULT, once spaces have actually loaded.
  //
  // Prefer a space that actually HAS an accepted member (2026-08-22) — the
  // account turned out to have two spaces (an old solo "Family" space with
  // nobody else in it, and "Couple", the one Harry actually accepted and the
  // one the Discord bot is linked to). Plain spaces[0] picks whichever was
  // created first, which landed on the empty one — everything in Household
  // silently pointed at a space with no data and no partner in it. Falls
  // back to spaces[0] if no space has an accepted member yet (a fresh
  // account, before anyone's joined).
  useEffect(() => {
    if (spaceId || spaces.length === 0) return
    const shared = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))
    setSpaceId((shared ?? spaces[0]).id)
  }, [spaces, members, spaceId])
  const tab = forcedTab ?? (sharedMode ? 'reference' : 'home')
  const [calView, setCalView] = useState<'house' | 'google'>('house')
  const { status: gStatus } = useGoogleStatus()
  const h = useHousehold(spaceId)
  // useTrips() itself doesn't filter by space (RLS returns mine-or-a-space-
  // I'm-in), so a personal solo-trip daydream would otherwise show up on
  // the SHARED household calendar next to it — filtered here to only trips
  // actually shared with this space, same "shared means shared" boundary
  // Village's own horizon feature already draws.
  const { trips: allTrips } = useTrips()
  const trips = allTrips.filter(t => t.space_id === spaceId)
  // Not during sharedMode — see usePresence.ts for why that would misrepresent
  // whichever real account backs the shared-device session as "online".
  usePresenceHeartbeat(userId, spaceId, !sharedMode)
  const partnerPresence = usePartnerPresence(userId, spaceId)

  // Which chore folders are collapsed (2026-08-26) — open by default (empty
  // set), so a folder someone just filed something into doesn't immediately
  // hide it; click the header to fold an 8-item list like Somi's care down
  // to one line. Keyed by folder name, not persisted — reopens on next
  // visit, same as everything else in this tab that isn't worth a settings
  // row.
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set())
  const [justDone, setJustDone] = useState<string | null>(null)
  const [shopName, setShopName] = useState('')
  const [shopQty, setShopQty] = useState('')
  const [shopCat, setShopCat] = useState('')
  const [ruleText, setRuleText] = useState('')
  const [ruleCategory, setRuleCategory] = useState('')
  const [showRetiredRules, setShowRetiredRules] = useState(false)
  const [editingRule, setEditingRule] = useState<{ id: string; text: string } | null>(null)
  const [homeCustomizeOpen, setHomeCustomizeOpen] = useState(false)
  // Editing or adding a chore opens a sheet (2026-10-21 redesign); id null = a new chore.
  // Blocks under "More on Home" opened in place this visit.
  const [openExtras, setOpenExtras] = useState<Set<string>>(new Set())
  const [editingChore, setEditingChore] = useState<{ id: string | null; name: string; cadence: string; folder: string } | null>(null)


  // Somi's care moved to the care log (2026-09-08) — chores in a "Somi"
  // folder don't belong under Chores any more. They're kept until the user
  // clears them (a button in the Somi care section), just not listed here.
  // Soonest-due first — the list orders itself by what actually needs doing,
  // so nobody has to scan for it.
  // Somi's chores show here again (2026-10-19): her care moved back from the
  // care log into chores, so the old filter that hid the "Somi" folder is gone.
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

  // What's inside Home (2026-08-12) — pulled out of four scattered,
  // non-contiguous `{tab === 'home' && ...}` blocks into one ordered,
  // filterable map, the same refactor todayBlocks.ts already did for Today's
  // own content. Each renderer closes over the local state/handlers above.
  const homeBlockRenderers: Record<HomeBlockId, () => React.ReactNode> = {
    glance: () => <HouseholdAtAGlance spaceId={spaceId} chores={h.chores} meals={h.meals} shopping={h.shopping} />,

    // Today's meals, straight from the Kitchen plan (2026-10-13).
    tonight: () => {
      const today = h.meals.filter(m => isSameDay(parseISO(m.meal_date), new Date())).sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot])
      const openRecipe = (id: string | null | undefined) => {
        if (id) { try { sessionStorage.setItem('4s:kitchen-open', id) } catch { /* private mode */ } }
        goToSection('kitchen')
      }
      return (
        <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)' }}>Kitchen today</div>
          {today.length === 0
            ? <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Nothing planned for today.</div>
            : today.map(m => (
              <button key={m.id} className="press" onClick={() => openRecipe(m.recipe_id)} style={{ display: 'flex', gap: '0.6rem', alignItems: 'baseline', textAlign: 'left', background: 'none', border: 'none', padding: '0.2rem 0', cursor: 'pointer', color: 'var(--text)', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }}>
                <span style={{ fontSize: '0.64rem', color: 'var(--muted)', minWidth: '4.5rem', textTransform: 'capitalize' }}>{m.kind === 'eating_out' ? m.slot + ' out' : m.slot}</span>
                <span>{m.title}</span>
              </button>
            ))}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary press" style={{ fontSize: '0.74rem' }} onClick={() => openRecipe(null)}>Open Kitchen</button>
          </div>
        </section>
      )
    },

    settle: () => <DiceCoin />,

    datenight: () => <DateNightPicker spaceId={spaceId} readOnly={guestMode} />,

    notes: () => (sharedMode ? null : <HouseholdNotes spaceId={spaceId} />),

    smartHome: () => (
      <button onClick={openSmartHome} className="press" style={{
        alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--muted)', fontSize: '0.8rem', padding: '0.5rem 0', minHeight: 44,
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      }}><Icon name="gear" size={12} /> Smart Home</button>
    ),

    // The household calendar — its own section until 2026-09-02, a Home
    // block again now (calendar isn't a place you live in, it's something
    // you check). Routines removed from Household 2026-09-08.
    calendar: () => <HouseholdCalendar chores={h.chores} meals={h.meals} trips={trips} spaceId={spaceId} />,

    // A note for the other one (2026-10-19, its own block so it is easy to
    // reach from a phone): it shows on the village notice board at home.
    board: () => (!onSetBoardNote || sharedMode) ? null : (
      <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.2rem' }}>
        <div className="t-card" style={{ marginBottom: '0.5rem' }}>Note on the board</div>
        {/* The other one's note, big enough to read, with "Got it" so they
            know you saw it (2026-10-23). */}
        {boardNote && boardNoteBy && boardNoteBy !== userId && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.8rem', padding: '0.8rem 0.9rem', borderRadius: 12, background: 'color-mix(in srgb, var(--rose) 8%, var(--surface2))', border: '1px solid color-mix(in srgb, var(--rose) 22%, var(--border))' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>From {nameFor(boardNoteBy) ?? 'your partner'}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--text)' }}>{boardNote}</div>
            {boardNoteSeenAt
              ? <div style={{ fontSize: '0.78rem', color: 'var(--emerald)' }}>✓ You saw this</div>
              : onSeeBoardNote && <button onClick={onSeeBoardNote} className="btn btn-primary press" style={{ alignSelf: 'flex-start', minHeight: 40 }}>Got it ♥</button>}
          </div>
        )}
        <form onSubmit={e => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('note') ?? '').trim(); if (v !== boardNote) onSetBoardNote(v) }}
          style={{ display: 'flex', gap: '0.4rem' }}>
          <input key={`boardnote-${boardNote}`} name="note" defaultValue={boardNote} maxLength={160} placeholder="Leave a line for the other"
            onBlur={e => { const v = e.target.value.trim(); if (v !== boardNote) onSetBoardNote(v) }}
            style={{ flex: 1, minWidth: 0, minHeight: 44, padding: '0 0.7rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)', color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, outline: 'none' }} />
          <button type="submit" className="btn btn-primary press" style={{ minHeight: 44 }}>Post</button>
        </form>
        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.4rem' }}>
          {boardNote && boardNoteBy === userId
            ? (boardNoteSeenAt ? '✓ Seen. Clear it to take it down.' : 'On the board. Not seen yet.')
            : boardNote ? 'Write a new line to reply. It replaces the note on the board.' : 'Shows on the village notice board and on Today. Guests never see it.'}
        </div>
      </section>
    ),

    thisWeek: () => <WeeklyRecapBlock spaceId={spaceId} />,

    // Wins and owned things are the household's own business, not a guest's
    // (2026-10-20), so shared mode hides them.
    wins: () => (sharedMode ? null : <WinsBlock spaceId={spaceId} userId={userId} nameFor={nameFor} />),

    // The weekly check-in prompt, above the shopping list — shows on Sunday,
    // or any day this week's check-in still isn't done, else a no-op. Same
    // component as Today's CheckinCard (2026-09-03).
    // The relationship check-in is the two of you, not something a guest
    // looking at the shared screen should see (2026-10-15).
    checkin: () => (sharedMode ? null : <CheckinCard userId={userId} />),

    // Everything the house has on, in one fortnight view. Separate from
    // the personal calendar in Today by design: that one answers "what do
    // I have on", this answers "what does this house have on", and your
    // dentist appointment isn't household business any more than the bins
    // are personal business.

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
          // Within the category, still-needed items lead and got ones sink
          // to the bottom (2026-08-21) — a shop reads the list top-down, and
          // a struck-through line at the top is just something to skip over.
          const items = [...h.shopping.filter(s => (s.category || 'Other') === cat)]
            .sort((a, b) => Number(a.got) - Number(b.got))
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text)', textDecoration: s.got ? 'line-through' : 'none', opacity: s.got ? 0.5 : 1 }}>
                      {s.name}
                    </span>
                    {/* user_id/got_by/got_at were written on every add and
                        toggle already — this is the first place anything
                        reads them (2026-08-21). */}
                    <div style={{ fontSize: '0.56rem', color: 'var(--muted)', opacity: 0.55 }}>
                      {s.got && s.got_by
                        ? `Got by ${nameFor(s.got_by) ?? 'someone'}${s.got_at ? `, ${daysAgo(s.got_at)}` : ''}`
                        : nameFor(s.user_id) ? `Added by ${nameFor(s.user_id)}` : null}
                    </div>
                  </div>
                  {s.qty && <span style={{ fontSize: '0.64rem', color: 'var(--muted)', flexShrink: 0 }}>{s.qty}</span>}
                  <IconButton label={`Remove ${s.name}`} onClick={() => h.removeShopping(s.id)} size={10} style={{ opacity: 0.4 }}>✕</IconButton>
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

    moveIn: () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div>
            <div className="t-card">Our Move-In</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              {NEW_HOME.label} · {NEW_HOME.city}
            </div>
          </div>
          <a href="https://docs.google.com/spreadsheets/d/1ZMKF-5-kK0lhuPWIHivmja334DXpASd6BK76tZfgN4I/edit?usp=sharing"
            target="_blank" rel="noopener noreferrer" className="btn btn-secondary press"
            style={{ fontSize: '0.72rem', textDecoration: 'none', alignSelf: 'flex-start' }}>
            Open the move-in spreadsheet ↗
          </a>
          <div style={{ fontSize: '0.64rem', color: 'var(--muted)', opacity: 0.65, lineHeight: 1.5 }}>
            The sheet holds the buy-list detail — budgets, room-by-room, links.
          </div>
        </section>
      </div>
    ),

    // House rules — standing conventions. Moved here from the Reference tab
    // 2026-09-02. `renderRules` is a hoisted function declaration below.
    rules: () => renderRules(),
  }

  // Chores, Routines, and Maintenance — pulled out of homeBlockRenderers
  // and Reference (2026-08-22) into their own functions, rendered together
  // under the new Routines tab below. Same JSX as before, just no longer
  // tied to Home's customizable-block system (there's nothing to hide or
  // reorder here — one tab, three sections, always all three).
  // House rules — standing conventions, not one-off tasks. Retiring keeps a
  // rule visible under a fold rather than deleting it. Moved from Reference
  // to a Home block 2026-09-02.
  function renderRules() {
    return (
      <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
        <div className="t-card" style={{ marginBottom: '0.7rem' }}>House rules</div>

        {h.rules.filter(r => r.active).length === 0 && !h.loading && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
            No rules yet. The first one is usually about shoes.
          </div>
        )}

        {h.rules.filter(r => r.active).map(r => {
          const editing = editingRule?.id === r.id
          const saveEdit = () => {
            const t = editingRule?.text.trim()
            if (t && t !== r.text) void h.updateRule(r.id, { text: t })
            setEditingRule(null)
          }
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.4rem 0', borderBottom: '1px solid var(--faint)' }}>
              {editing ? (
                <input
                  autoFocus value={editingRule!.text}
                  onChange={e => setEditingRule({ id: r.id, text: e.target.value })}
                  onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingRule(null) }}
                  onBlur={saveEdit}
                  style={{ ...input, flex: 1, minWidth: 0, fontSize: '0.78rem' }}
                />
              ) : (
                <button onClick={() => setEditingRule({ id: r.id, text: r.text })} className="press"
                  style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'text', fontFamily: 'inherit', fontSize: '0.78rem', color: 'var(--text)' }}>
                  {r.text}
                </button>
              )}
              {r.category && !editing && <span style={{ fontSize: '0.6rem', color: 'var(--muted)', flexShrink: 0 }}>{r.category}</span>}
              <button onClick={() => h.toggleRuleActive(r.id, false)} title="Retire this rule" className="press"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.5, fontSize: '0.62rem', flexShrink: 0 }}>
                retire
              </button>
              <IconButton label={`Delete ${r.text}`} onClick={() => h.removeRule(r.id)} size={10} style={{ opacity: 0.4 }}>✕</IconButton>
            </div>
          )
        })}

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
    )
  }

  // Starter chores (2026-10-16): Somi's care and the house's upkeep, offered
  // once per folder until that folder has something in it.
  function renderStarterChores() {
    const missing = STARTER_CHORES.filter(g => !h.chores.some(c => (c.folder ?? '').toLowerCase() === g.folder.toLowerCase()))
    // Wait for the household to load, or the chores would be saved with no household.
    if (!spaceId || missing.length === 0 || h.loading || guestMode) return null
    return (
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {missing.map(g => (
          <button key={g.folder} className="btn btn-secondary press" style={{ minHeight: 40 }}
            onClick={async () => { for (const c of g.chores) await h.addChore(c.name, c.every, g.folder) }}>
            + {g.label}
          </button>
        ))}
      </div>
    )
  }

  function renderChores() {
    // Folders (2026-08-26) — a free-text grouping a person names as they go
    // ("Somi", "Car", "Seasonal"), not a fixed taxonomy like Shopping's
    // aisle categories. Only shown once something is actually in a folder;
    // a household with zero folders sees the exact same flat list as
    // before this existed, no empty "Other" heading imposed on them.
    const existingFolders = [...new Set(sortedChores.map(c => c.folder).filter((f): f is string => !!f))].sort()
    const grouped = existingFolders.length > 0
    const unfoldered = sortedChores.filter(c => !c.folder)

    function renderChoreRow(c: Chore) {
      const due = dueLabel(c)
      return (
        <div key={c.id} className={`lift ${justDone === c.id ? 'did-it' : ''}`} style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.5rem 0.6rem', borderRadius: '9px', marginBottom: '0.35rem',
          background: 'var(--hover-bg)', border: '1px solid var(--border)',
          position: 'relative',
        }}>
          {justDone === c.id && (
            <span className="praise" aria-hidden style={{
              position: 'absolute', right: '0.6rem', top: '-0.4rem',
              fontSize: '0.6rem', color: 'var(--emerald)', letterSpacing: '0.04em',
            }}>done ✓</span>
          )}
          <button
            onClick={() => doneChore(c)}
            className={`press ${justDone === c.id ? 'settle' : ''}`}
            title="Mark done, resets the clock"
            style={{
              background: 'none', border: '1.5px solid var(--emerald)', borderRadius: '50%',
              width: 34, height: 34, cursor: 'pointer', color: 'var(--emerald)',
              fontSize: '0.9rem', lineHeight: 1, flexShrink: 0,
            }}
          >✓</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <button onClick={() => setEditingChore({ id: c.id, name: c.name, cadence: String(c.cadence_days), folder: c.folder ?? '' })} title="Edit"
              style={{ fontSize: '0.78rem', color: 'var(--text)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)' }}>{c.name} <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.6 }}>✎</span></button>
            {c.assigned_to && (
              <div style={{ fontSize: '0.62rem', color: 'var(--gold)' }}>
                {c.assigned_to === userId ? 'Yours this week' : "Your partner's this week"}
              </div>
            )}
            {c.last_done_at && nameFor(c.last_done_by) && (
              <div style={{ fontSize: '0.58rem', color: 'var(--muted)', opacity: 0.6 }}>
                Last done by {nameFor(c.last_done_by)}, {daysAgo(c.last_done_at)}
              </div>
            )}
          </div>
          <span style={{ fontSize: '0.62rem', color: due.color, flexShrink: 0 }}>{due.text}</span>
          <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.55, flexShrink: 0 }}>every {c.cadence_days}d</span>
          {/* Move to a folder — free text, committed on blur/Enter rather
              than a fixed <select>, since folder names are whatever a
              person decides to call them, not a preset list. */}
          <input
            key={c.folder ?? ''}
            defaultValue={c.folder ?? ''}
            list="chore-folders"
            placeholder="folder"
            title="Move to a folder"
            onBlur={e => {
              const v = e.target.value.trim()
              if (v !== (c.folder ?? '')) h.setChoreFolder(c.id, v || null)
            }}
            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            style={{ ...input, width: '80px', fontSize: '0.62rem', padding: '0.3rem 0.4rem', flexShrink: 0 }}
          />
          <IconButton label={`Remove ${c.name}`} onClick={() => h.removeChore(c.id)} size={10} style={{ opacity: 0.4 }}>✕</IconButton>
        </div>
      )
    }

    return (
      <details open style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem 0.9rem' }}>
        <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>Chores</span>
          <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{sortedChores.length}</span>
        </summary>
        <div style={{ marginTop: '0.7rem' }}>

        {sortedChores.length === 0 && !h.loading && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
            Nothing tracked yet. Add the one chore you argue about most.
          </div>
        )}

        {grouped ? (
          <>
            {existingFolders.map(folder => {
              const items = sortedChores.filter(c => c.folder === folder)
              if (items.length === 0) return null
              const collapsed = collapsedFolders.has(folder)
              return (
                <div key={folder} style={{ marginBottom: '0.7rem' }}>
                  <button
                    onClick={() => setCollapsedFolders(prev => {
                      const next = new Set(prev)
                      if (next.has(folder)) next.delete(folder); else next.add(folder)
                      return next
                    })}
                    className="press"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '0.25rem',
                      display: 'flex', alignItems: 'center', gap: '0.3rem', width: '100%',
                    }}
                  >
                    <span aria-hidden style={{
                      display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'none',
                      transition: 'transform 150ms', fontSize: '0.6rem', color: 'var(--muted)',
                    }}>▾</span>
                    <span className="t-label">{folder}</span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--muted)', opacity: 0.6 }}>({items.length})</span>
                  </button>
                  {!collapsed && items.map(renderChoreRow)}
                </div>
              )
            })}
            {unfoldered.length > 0 && (
              <div style={{ marginBottom: '0.7rem' }}>
                {existingFolders.length > 0 && <div className="t-label" style={{ marginBottom: '0.25rem' }}>No folder</div>}
                {unfoldered.map(renderChoreRow)}
              </div>
            )}
          </>
        ) : (
          sortedChores.map(renderChoreRow)
        )}

        {/* Suggests existing folder names in the per-row input above without
            constraining what someone can type — a new value just creates a
            new folder. */}
        <datalist id="chore-folders">
          {existingFolders.map(f => <option key={f} value={f} />)}
        </datalist>

        <button onClick={() => setEditingChore({ id: null, name: '', cadence: '7', folder: '' })} className="btn btn-secondary press" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
          + Add a chore
        </button>
        </div>
      </details>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Which household */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted)', opacity: 0.7 }}>Household</span>
        {/* "Just me" (spaceId=null, unshared) removed from the picker
            (2026-08-22) — there's exactly one real household here, so a
            private/unshared mode was a choice nobody wanted to make every
            visit. A single real space renders as plain text; the dropdown
            only comes back if a second space is ever created. */}
        {spaces.length <= 1 ? (
          spaces[0] && <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{spaces[0].name}</span>
        ) : (
          <select value={spaceId ?? ''} onChange={e => setSpaceId(e.target.value || null)} style={{ ...input, cursor: 'pointer' }}>
            {spaces.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {/* Presence — "is my partner using this right now", not a chat-style
            read receipt. Absent entirely when there's nothing to say (no
            space, or presence has never been recorded), same as every other
            quiet-when-empty surface in this app. */}
        {partnerPresence.map(p => {
          const name = nameFor(p.userId) ?? 'Partner'
          const mins = p.lastActiveAt ? differenceInMinutes(new Date(), parseISO(p.lastActiveAt)) : null
          return (
            <span key={p.userId} style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.66rem', color: 'var(--muted)', opacity: 0.85,
            }}>
              <span aria-hidden style={{
                width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                background: p.online ? 'var(--emerald)' : 'var(--muted)', opacity: p.online ? 1 : 0.4,
              }} />
              {name} {p.online ? 'online now' : mins !== null ? `active ${mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h`} ago` : ''}
            </span>
          )
        })}
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

      {tab === 'home' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setHomeCustomizeOpen(true)} title="Customize Home" className="press" style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.8rem', padding: '0.5rem 0.2rem', minHeight: 44,
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            }}><Icon name="gear" size={13} /> Choose what shows here</button>
          </div>
          {homeBlocks.filter(b => !b.hidden).map(b => (
            <div key={b.id}>{homeBlockRenderers[b.id as HomeBlockId]()}</div>
          ))}
          {/* More on Home (2026-10-21): every other block is still right here
              by name, one tap to open it in place. Nothing is out of sight. */}
          {!guestMode && homeBlocks.some(b => b.hidden) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem' }}>
              <div className="t-label">More on Home</div>
              {homeBlocks.filter(b => b.hidden).map(b => {
                const isOpen = openExtras.has(b.id)
                return (
                  <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button className="press organic specimen" onClick={() => setOpenExtras(prev => { const n = new Set(prev); if (n.has(b.id)) n.delete(b.id); else n.add(b.id); return n })}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', minHeight: 56, padding: '0.6rem 1rem', textAlign: 'left', cursor: 'pointer', fontFamily: 'var(--font-body)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: '1.02rem', color: 'var(--text)' }}>{b.label}</span>
                        {b.hint && <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--muted)' }}>{b.hint}</span>}
                      </span>
                      <span aria-hidden style={{ color: 'var(--muted)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 160ms ease' }}>›</span>
                    </button>
                    {isOpen && (
                      <>
                        {homeBlockRenderers[b.id as HomeBlockId]()}
                        <button className="btn btn-ghost press" style={{ alignSelf: 'flex-start' }}
                          onClick={() => onChangeHomeBlocks(homeBlocks.map(x => (x.id === b.id ? { ...x, hidden: false } : x)))}>
                          Keep this open at the top
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Smart Home (2026-08-25) — a manual device/status list, see
          HouseholdSmartHome's own header comment for why this isn't a real
          automation integration. */}
      {tab === 'smarthome' && <HouseholdSmartHome spaceId={spaceId} />}

      {/* Reference tab order (2026-09-08, Watchlist renamed to Lists
          2026-09-22): Notes, Date Ideas, Lists, Understanding (folded),
          Check-in. Chores / routines / care moved to their own Upkeep tab;
          Calendar and House rules are Home blocks. */}

      {/* Notes — the space-shared Notes feature (2026-08-21), same table
          Personal's Notes tab writes to, scoped to this household's space. */}

      {/* Upkeep tab (2026-09-08) — its own tab between Home and Reference.
          Just chores since 2026-10-16: Somi's care and the house's upkeep
          are chores too (folders "Somi" and "House"), not a separate log. */}
      {/* Home, Calendar (2026-10-25): the house's own calendar (chores,
          meals, trips) and the shared Google account's calendar. */}
      {tab === 'calendar' && (
        <div>
          {!guestMode && gStatus.household?.connected && <Segmented value={calView} onChange={setCalView} options={[['house', 'House'], ['google', 'Shared Google']]} />}
          {calView === 'google' && gStatus.household?.connected && !guestMode
            ? <GoogleCalendar scope="shared" />
            : <HouseholdCalendar chores={h.chores} meals={h.meals} trips={trips} spaceId={spaceId} />}
        </div>
      )}

      {tab === 'upkeep' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {!guestMode && spaceId && <AwayCard away={h.away} onSet={h.setAway} onEnd={h.endAway} />}
          <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div className="t-card">Chores</div>
              <button onClick={() => goToSection('habits')} className="press" style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '0.66rem', padding: 0, opacity: 0.7,
              }}>Track habits →</button>
            </div>
            {renderChores()}
            {renderStarterChores()}
            <Sheet open={!!editingChore} title={editingChore?.id ? 'Edit chore' : 'New chore'} onClose={() => setEditingChore(null)}
              footer={editingChore && (
                <>
                  <button className="btn btn-primary press" onClick={async () => {
                    const name = editingChore.name.trim()
                    if (!name) return
                    const every = Math.max(1, Number(editingChore.cadence) || 7)
                    const folder = editingChore.folder.trim() || null
                    if (editingChore.id) await h.updateChore(editingChore.id, { name, cadence_days: every, folder })
                    else await h.addChore(name, every, folder)
                    setEditingChore(null)
                  }}>Save</button>
                  <button className="btn btn-ghost press" onClick={() => setEditingChore(null)}>Cancel</button>
                  {editingChore.id && (
                    <button className="btn btn-ghost press" style={{ marginLeft: 'auto', color: 'var(--rose)' }} onClick={async () => {
                      if (!window.confirm(`Remove "${editingChore.name}"?`)) return
                      await h.removeChore(editingChore.id!)
                      setEditingChore(null)
                    }}>Remove</button>
                  )}
                </>
              )}>
              {editingChore && (
                <>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--muted)' }}>Chore
                    <input value={editingChore.name} onChange={e => setEditingChore({ ...editingChore, name: e.target.value })} placeholder="Water the plants" autoFocus style={{ ...input, minHeight: 44, fontSize: '0.95rem' }} />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--muted)' }}>Every how many days
                    <input type="number" inputMode="numeric" min={1} value={editingChore.cadence} onChange={e => setEditingChore({ ...editingChore, cadence: e.target.value })} style={{ ...input, minHeight: 44, fontSize: '0.95rem' }} />
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    {[[1, 'Daily'], [7, 'Weekly'], [14, 'Every 2 weeks'], [30, 'Monthly']].map(([n, l]) => (
                      <button key={n} className="pill press" onClick={() => setEditingChore({ ...editingChore, cadence: String(n) })}>{l}</button>
                    ))}
                  </div>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--muted)' }}>Folder (optional)
                    <input value={editingChore.folder} onChange={e => setEditingChore({ ...editingChore, folder: e.target.value })} list="chore-folders" placeholder="Somi, House…" style={{ ...input, minHeight: 44, fontSize: '0.95rem' }} />
                  </label>
                </>
              )}
            </Sheet>
          </section>

        </div>
      )}

      {/* Date ideas, movies and shows, games, and any shared collection — one
          Collections section (2026-10-12), replacing the separate Date Ideas
          and game/watch list blocks. See ReferenceCollections. */}
      {/* Our photos and the shared Drive (2026-10-24). Guests see only the
          photos marked for them, and no Drive. */}
      {tab === 'reference' && <OurPhotos spaceId={spaceId} guestMode={guestMode} />}
      {tab === 'reference' && !guestMode && <SharedDrive />}
      {tab === 'reference' && <ReferenceCollections spaceId={spaceId} userId={userId} guestMode={guestMode} sharedMode={sharedMode} />}
      {/* Things we own lives with the house's other reference things (2026-10-21). */}
      {tab === 'reference' && !sharedMode && <ThingsWeOwn spaceId={spaceId} userId={userId} />}

      {/* Notes the two of you share, after the collections (2026-10-19). */}
      {tab === 'reference' && !sharedMode && <HouseholdNotes spaceId={spaceId} />}


      {/* Photo albums + the keepsakes from hosting (2026-09-10). */}
      {tab === 'reference' && <HouseholdReferenceMemories spaceId={spaceId} />}


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
