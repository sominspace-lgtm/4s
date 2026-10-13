'use client'

import { useEffect, useState } from 'react'
import { addDays, format } from 'date-fns'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useRecipes } from '@/lib/hooks/useRecipes'
import { useHousehold } from '@/lib/hooks/useHousehold'
import { useFoodLog } from '@/lib/hooks/useFoodLog'
import RecipeBook from './RecipeBook'
import { RECIPE_URL_KEY } from '@/lib/share/parse'
import { INCOMING_KEY, decodeIncoming, draftFromBlocks, type Incoming } from '@/lib/recipes/bookmarklet'
import type { RecipeDraft } from '@/lib/recipes/types'
import MealPlanner from './MealPlanner'
import GroceryBuilder from './GroceryBuilder'
import CalorieTracker from './CalorieTracker'
import { chip, muted } from './ui'

// The kitchen (2026-10-13): one place for what you cook and eat. Recipes you
// save from anywhere, a plan for the week, a grocery list built from the plan,
// and a calorie log. It replaces the two external cheat-sheet apps the village
// used to link out to; everything the two of you cook lives here, shared.
//
// Calories are the one personal tab: your own log, hidden on the shared screen.

type Tab = 'recipes' | 'plan' | 'groceries' | 'calories'
export const KITCHEN_OPEN_KEY = '4s:kitchen-open'

export default function KitchenHub({ userId, sharedMode = false }: { userId: string; sharedMode?: boolean }) {
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(s => members.some(m => m.space_id === s.id && m.status === 'accepted'))?.id ?? spaces[0]?.id ?? null

  const book = useRecipes(spaceId)
  const h = useHousehold(spaceId)
  const food = useFoodLog(format(addDays(new Date(), -6), 'yyyy-MM-dd'), format(new Date(), 'yyyy-MM-dd'))

  const [tab, setTab] = useState<Tab>('recipes')
  const [openId, setOpenId] = useState<string | null>(null)
  const [week, setWeek] = useState<string | null>(null)
  // A recipe sent over by the "Save from any page" bookmarklet.
  // A link or words sent from the phone's share sheet, to read straight away.
  const [shared, setShared] = useState<{ url: string | null; text: string } | null>(null)
  const [incoming, setIncoming] = useState<{ draft: RecipeDraft | null; text: string | null; url: string } | null>(null)

  // Another screen (the village, Today) can ask for a particular recipe.
  useEffect(() => {
    try {
      const id = sessionStorage.getItem(KITCHEN_OPEN_KEY)
      if (id) { sessionStorage.removeItem(KITCHEN_OPEN_KEY); setOpenId(id); setTab('recipes') }
    } catch { /* private mode */ }
    try {
      const sh = sessionStorage.getItem(RECIPE_URL_KEY)
      if (sh) { sessionStorage.removeItem(RECIPE_URL_KEY); setShared(JSON.parse(sh)); setTab('recipes') }
    } catch { /* private mode */ }
    try {
      const raw = sessionStorage.getItem(INCOMING_KEY)
      if (raw) {
        sessionStorage.removeItem(INCOMING_KEY)
        const inc: Incoming | null = decodeIncoming(raw)
        if (inc) {
          setTab('recipes')
          setIncoming(inc.kind === 'ld'
            ? { draft: draftFromBlocks(inc.blocks, inc.url), text: null, url: inc.url }
            : { draft: null, text: inc.text, url: inc.url })
        }
      }
    } catch { /* private mode */ }
  }, [])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'recipes', label: 'Recipes' }, { id: 'plan', label: 'Plan' }, { id: 'groceries', label: 'Groceries' },
    ...(sharedMode ? [] : [{ id: 'calories' as Tab, label: 'Calories' }]),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {tabs.map(t => <button key={t.id} className="press" style={{ ...chip(tab === t.id), fontSize: '0.74rem', padding: '0.35em 1em' }} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {book.error && <div style={muted}>{book.error}</div>}

      {tab === 'recipes' && <RecipeBook book={book} h={h} food={food} spaceId={spaceId} openId={openId} onOpen={setOpenId} shared={shared} onSharedHandled={() => setShared(null)} incoming={incoming} onIncomingHandled={() => setIncoming(null)} />}
      {tab === 'plan' && <MealPlanner h={h} book={book} onBuildList={w => { setWeek(w); setTab('groceries') }} onOpenRecipe={id => { setOpenId(id); setTab('recipes') }} />}
      {tab === 'groceries' && <GroceryBuilder h={h} book={book} weekStart={week} />}
      {tab === 'calories' && !sharedMode && <CalorieTracker userId={userId} book={book} h={h} />}
    </div>
  )
}
