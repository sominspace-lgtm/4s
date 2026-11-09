import { createAdminClient } from '@/lib/supabase/admin'
import type { Habit } from '@/lib/hooks/useHabits'
import type { WorkItem } from '@/lib/hooks/useWorkItems'
import type { VillageLayout } from '@/lib/village/layout'
import type { ActiveScene, BinDays } from '@/lib/hooks/useSmartHome'
import { parseFinds, grownCount } from '@/lib/village/finds'

// What a paired wall screen is allowed to know (2026-11-08). Built on the
// server for exactly one household, from the screen's own key, never a
// person's sign-in. It is only enough to draw the village and the home
// glance: plants and buildings come through with their names and titles
// blanked, nothing from calendars, notes, mail, money or check-ins is read,
// and tonight's dinner is the one line of text that leaves.

export interface HomeSnapshot {
  household: string | null
  /** Both of your habits, nameless: just enough to grow the plants. */
  habits: Habit[]
  completions: Record<string, string[]>
  /** The household's projects, untitled: just enough to raise the buildings. */
  workItems: WorkItem[]
  accountCreated: string | null
  layout: VillageLayout
  grown: number
  activeScene: ActiveScene | null
  binDays: BinDays
  dinner: string | null
}

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

export async function homeSnapshot(spaceId: string, today: string): Promise<HomeSnapshot> {
  const admin = createAdminClient()
  const day = isDate(today) ? today : new Date().toISOString().slice(0, 10)

  const [{ data: space }, { data: members }] = await Promise.all([
    admin.from('shared_spaces').select('name, owner_id, active_scene, bin_days').eq('id', spaceId).maybeSingle(),
    admin.from('shared_space_members').select('member_id').eq('space_id', spaceId).eq('status', 'accepted'),
  ])
  const people = [...new Set([space?.owner_id, ...(members ?? []).map(m => m.member_id)].filter((x): x is string => !!x))]

  const [habitsRes, workRes, layoutRes, findsRes, mealRes, owner] = await Promise.all([
    people.length
      ? admin.from('habits').select('id, category, schedule_type, interval_days, days_of_week, paused, kind, created_at').in('user_id', people).order('created_at')
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    admin.from('work_items').select('id, status, energy, due_date, completed_at, created_at, landmark')
      .eq('space_id', spaceId).or('status.neq.done,landmark.eq.true'),
    admin.from('village_layout').select('layout').eq('space_id', spaceId).maybeSingle(),
    admin.from('village_idle').select('state').eq('space_id', spaceId).maybeSingle(),
    admin.from('household_meals').select('title, slot, meal_date').eq('space_id', spaceId).eq('slot', 'dinner').eq('meal_date', day).limit(1),
    space?.owner_id ? admin.auth.admin.getUserById(space.owner_id) : Promise.resolve(null),
  ])

  const habits = ((habitsRes.data ?? []) as Record<string, unknown>[])
    .filter(h => h.kind !== 'avoid')
    .map(h => ({ ...h, name: '' }) as unknown as Habit)
  const ids = habits.map(h => h.id)
  const completions: Record<string, string[]> = {}
  if (ids.length) {
    const { data: done } = await admin.from('habit_completions').select('habit_id, completed_date').in('habit_id', ids)
    for (const c of done ?? []) (completions[c.habit_id] ??= []).push(String(c.completed_date).slice(0, 10))
  }
  const workItems = ((workRes.data ?? []) as Record<string, unknown>[])
    .map(w => ({ ...w, title: '', notes: null }) as unknown as WorkItem)

  const meal = (mealRes.data ?? [])[0] as { title?: string } | undefined

  return {
    household: space?.name ?? null,
    habits,
    completions,
    workItems,
    accountCreated: owner && 'data' in owner ? owner.data.user?.created_at ?? null : null,
    layout: (layoutRes.data?.layout as VillageLayout | undefined) ?? {},
    grown: findsRes.data ? grownCount(parseFinds(findsRes.data.state, new Date()).kept.length) : 0,
    activeScene: (space?.active_scene as ActiveScene | null) ?? null,
    binDays: (space?.bin_days as BinDays | undefined) ?? {},
    dinner: meal?.title?.trim() || null,
  }
}
