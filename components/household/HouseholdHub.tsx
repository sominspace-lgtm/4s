'use client'

import { useState } from 'react'
import { addDays, format, isSameDay, parseISO } from 'date-fns'
import { useHousehold, choreDue, type Chore } from '@/lib/hooks/useHousehold'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import HomeBrain from '@/components/home/HomeBrain'
import HouseholdCalendar from './HouseholdCalendar'
import DiscordConnect from './DiscordConnect'
import CompanionSync from '@/components/relationships/CompanionSync'
import SectionCustomizer, { type SectionConfig } from '@/components/ui/SectionCustomizer'
import { DEFAULT_HOUSEHOLD_TABS, DEFAULT_HOME_BLOCKS, type HomeBlockId } from '@/lib/utils/householdLayout'

const SLOTS = ['breakfast', 'lunch', 'dinner'] as const

type HouseholdTab = 'home' | 'reference' | 'setup'

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
export default function HouseholdHub({ userId, userEmail, tabs, onChangeTabs, homeBlocks, onChangeHomeBlocks }: {
  userId: string
  userEmail: string
  tabs: SectionConfig[]
  onChangeTabs: (next: SectionConfig[]) => void
  homeBlocks: SectionConfig[]
  onChangeHomeBlocks: (next: SectionConfig[]) => void
}) {
  const { spaces } = useSharedSpaces(userId)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [tab, setTab] = useState<HouseholdTab>('home')
  const h = useHousehold(spaceId)

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
  const [invName, setInvName] = useState('')
  const [invRoom, setInvRoom] = useState('')
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

      {/* ── Inventory ──────────────────────────────────────────────
          What the household owns. Grows through use — nobody sits down and
          inventories their whole home; this fills in as Discord captures it
          and as things get added here directly. */}
      {tab === 'reference' && (
        <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
          <div className="t-card" style={{ marginBottom: '0.7rem' }}>What we have</div>

          {h.inventory.length === 0 && !h.loading && (
            <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75, marginBottom: '0.6rem' }}>
              Nothing logged yet. This fills in over time — no need to sit down and inventory the house.
            </div>
          )}

          {(() => {
            const byRoom = new Map<string, typeof h.inventory>()
            for (const item of h.inventory) {
              const room = item.room || 'Unsorted'
              byRoom.set(room, [...(byRoom.get(room) ?? []), item])
            }
            return [...byRoom.entries()].map(([room, items]) => (
              <div key={room} style={{ marginBottom: '0.7rem' }}>
                <div className="t-label" style={{ marginBottom: '0.25rem' }}>{room}</div>
                {items.map(i => (
                  <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.3rem 0', borderBottom: '1px solid var(--faint)' }}>
                    <span style={{ flex: 1, minWidth: 0, fontSize: '0.78rem', color: 'var(--text)' }}>{i.name}</span>
                    <button onClick={() => h.removeInventoryItem(i.id)} aria-label={`Remove ${i.name}`} className="press"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', opacity: 0.4, fontSize: '0.6rem', flexShrink: 0 }}>✕</button>
                  </div>
                ))}
              </div>
            ))
          })()}

          <form
            onSubmit={async e => {
              e.preventDefault()
              if (!invName.trim()) return
              await h.addInventoryItem(invName.trim(), invRoom.trim() || null, null)
              setInvName(''); setInvRoom('')
            }}
            style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}
          >
            <input value={invName} onChange={e => setInvName(e.target.value)} placeholder="Add an item" style={{ ...input, flex: 1, minWidth: '140px' }} />
            <input value={invRoom} onChange={e => setInvRoom(e.target.value)} placeholder="Room (optional)" style={{ ...input, width: '120px' }} />
            <button type="submit" className="btn btn-secondary press" style={{ fontSize: '0.7rem' }}>Add</button>
          </form>
        </section>
      )}

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
