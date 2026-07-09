import { NextResponse } from 'next/server'
import { format, addDays, parseISO, differenceInCalendarDays } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseTaskInput } from '@/lib/utils/parseTask'

// Amazon Alexa Skill endpoint. Alexa POSTs a JSON request here for every
// LaunchRequest / IntentRequest; we reply with Alexa-format speech JSON.
//
// Identity: the user links the skill once (see /api/alexa/authorize), after
// which Alexa sends context.System.user.accessToken on every request. We map
// that token to a 4S user via the alexa_links table (service-role client).
//
// Security boundary for this private skill: skill-id check + request-timestamp
// freshness + a valid link token. NOTE(before publishing publicly): Amazon
// also requires validating the Signature / SignatureCertChainUrl headers.
// That cert-chain check is intentionally omitted here — add it if this skill
// is ever submitted for certification rather than kept private.

const SKILL_ID = process.env.ALEXA_SKILL_ID // set to your skill's ApplicationId

interface AlexaSlot { value?: string }
interface AlexaRequestBody {
  version: string
  context?: { System?: { application?: { applicationId?: string }; user?: { userId?: string; accessToken?: string } } }
  request: {
    type: string
    timestamp?: string
    intent?: { name?: string; slots?: Record<string, AlexaSlot> }
    reason?: string
  }
}

function say(text: string, opts?: { end?: boolean; reprompt?: string }): NextResponse {
  return NextResponse.json({
    version: '1.0',
    response: {
      outputSpeech: { type: 'PlainText', text },
      ...(opts?.reprompt ? { reprompt: { outputSpeech: { type: 'PlainText', text: opts.reprompt } } } : {}),
      shouldEndSession: opts?.end ?? false,
    },
  })
}

function slot(body: AlexaRequestBody, name: string): string {
  return (body.request.intent?.slots?.[name]?.value ?? '').trim()
}

// Fuzzy-match a spoken name to a list item (task title, habit name, refill).
// Voice transcription is imperfect, so we match on exact, substring, then
// word overlap, and only accept a reasonably confident hit.
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}
function bestMatch<T>(items: T[], spoken: string, key: (t: T) => string): T | null {
  const q = norm(spoken)
  if (!q) return null
  let best: T | null = null
  let bestScore = 0
  for (const it of items) {
    const name = norm(key(it))
    if (!name) continue
    let score = 0
    if (name === q) score = 100
    else if (name.includes(q) || q.includes(name)) score = 60 + Math.min(name.length, q.length)
    else {
      const nWords = new Set(name.split(' '))
      score = q.split(' ').filter(w => w.length > 2 && nWords.has(w)).length * 15
    }
    if (score > bestScore) { bestScore = score; best = it }
  }
  return bestScore >= 20 ? best : null
}

// Server copy of the habit schedule check (the client version lives in a
// 'use client' module we can't import here).
interface HabitRow { schedule_type: string; interval_days: number | null; days_of_week: number[] | null; paused: boolean }
function isHabitDue(habit: HabitRow, dates: string[], dateStr: string): boolean {
  if (habit.paused) return false
  if (habit.schedule_type === 'daily') return true
  if (habit.schedule_type === 'weekly') return (habit.days_of_week ?? []).includes(parseISO(dateStr).getDay())
  const n = habit.interval_days ?? 1
  const prior = dates.filter(d => d <= dateStr).sort()
  const last = prior[prior.length - 1]
  if (!last) return true
  return differenceInCalendarDays(parseISO(dateStr), parseISO(last)) >= n
}

export async function POST(request: Request) {
  let body: AlexaRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  try {
  // 1. Only accept requests from our own skill.
  const appId = body.context?.System?.application?.applicationId
  if (SKILL_ID && appId !== SKILL_ID) {
    return NextResponse.json({ error: 'Unexpected skill id' }, { status: 401 })
  }

  // 2. Reject stale/replayed requests (Alexa requires <150s).
  const ts = body.request.timestamp ? Date.parse(body.request.timestamp) : NaN
  if (!Number.isNaN(ts) && Math.abs(Date.now() - ts) > 150_000) {
    return NextResponse.json({ error: 'Stale request' }, { status: 400 })
  }

  // SessionEndedRequest never expects speech.
  if (body.request.type === 'SessionEndedRequest') {
    return NextResponse.json({ version: '1.0', response: {} })
  }

  // 3. Resolve the linked 4S user by the stable anonymous Alexa user id.
  const alexaUserId = body.context?.System?.user?.userId
  if (!alexaUserId) {
    return say('I could not identify your Alexa account. Please try again.', { end: true })
  }

  const admin = createAdminClient()
  const { data: link } = await admin
    .from('alexa_links').select('user_id').eq('alexa_user_id', alexaUserId).maybeSingle()

  // Not linked yet — the only thing we accept is the pairing code.
  if (!link) {
    const intentName = body.request.intent?.name ?? ''
    if (body.request.type === 'IntentRequest' && intentName === 'LinkAccountIntent') {
      const code = slot(body, 'Code')
      if (!code) return say('What is your four digit code? You can find it in the 4S app under Account, Connect Alexa.', { reprompt: 'Say your four digit code.' })
      const { data: match } = await admin
        .from('alexa_link_codes').select('user_id').eq('code', code).maybeSingle()
      if (!match) return say("That code didn't match. Open 4S, tap Connect Alexa for a fresh code, and try again.", { end: true })
      // Bind this Alexa account, then clear the user's codes.
      const { error: linkErr } = await admin.from('alexa_links').upsert({ user_id: match.user_id, alexa_user_id: alexaUserId })
      if (linkErr) return say(`I found your code but could not save the link. ${linkErr.message}`, { end: true })
      await admin.from('alexa_link_codes').delete().eq('user_id', match.user_id)
      return say("You're linked. Try saying: ask four s what needs attention.", { end: true })
    }
    // Keep the session open and take the code conversationally — one-shot
    // "ask four s to link 1234" is unreliable to parse, but reading four digits
    // inside an open session is not.
    return say('You are not linked yet. Get a code from the 4S app under Account, Connect Alexa, then just say the four digits now.', { reprompt: 'Say your four digit code from the app.' })
  }
  const userId = link.user_id as string

  if (body.request.type === 'LaunchRequest') {
    const brief = await buildBrief(admin, userId)
    return say(`${brief} What would you like to do?`, { reprompt: 'You can add a task, capture a note, or ask what needs attention.' })
  }

  if (body.request.type !== 'IntentRequest') {
    return say('Sorry, I did not catch that.', { end: true })
  }

  const intent = body.request.intent?.name ?? ''

  switch (intent) {
    case 'AddTaskIntent': {
      const text = slot(body, 'TaskText')
      if (!text) return say('What task should I add?', { reprompt: 'Say, add task, then what you need to do.' })
      const parsed = parseTaskInput(text)
      const title = parsed?.title || text
      const { error } = await admin.from('work_items').insert({
        user_id: userId, title, status: 'todo', shared: false,
        due_date: parsed?.dueDate ?? null, priority: parsed?.priority ?? 2,
        notes: null, domain: null, recur_days: null,
      })
      if (error) return say(`I could not save that task. ${error.message}`, { end: true })
      const whenPart = parsed?.dueDate ? `, due ${spokenDate(parsed.dueDate)}` : ''
      return say(`Added "${title}"${whenPart} to your tasks.`, { end: true })
    }

    case 'CaptureIntent': {
      const text = slot(body, 'NoteText')
      if (!text) return say('What should I capture?', { reprompt: 'Say, capture, then your thought.' })
      const { error } = await admin.from('captures').insert({ user_id: userId, text, domain: null })
      if (error) return say('I could not save that just now.', { end: true })
      return say('Saved to your inbox.', { end: true })
    }

    case 'AddRefillIntent': {
      const name = slot(body, 'ItemName')
      if (!name) return say('What should I remind you to buy again?', { reprompt: 'Say, remind me to buy, then the item.' })
      const daysRaw = parseInt(slot(body, 'Days'), 10)
      const cadence = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 30
      const { error } = await admin.from('buy_items').insert({
        user_id: userId, name, category: 'other', tracking_mode: 'simple-interval',
        cadence_days: cadence, notify_days_before: 3, last_bought: format(new Date(), 'yyyy-MM-dd'),
        status: 'stocked',
      })
      if (error) return say('I could not set up that refill just now.', { end: true })
      return say(`Okay, I'll remind you to buy ${name} about every ${cadence} days.`, { end: true })
    }

    case 'BriefIntent':
    case 'WhatsNextIntent': {
      const brief = await buildBrief(admin, userId, true)
      return say(brief, { end: true })
    }

    case 'ListTasksIntent': {
      const { data } = await admin.from('work_items')
        .select('title, due_date, priority').eq('user_id', userId).neq('status', 'done')
      const open = data ?? []
      if (open.length === 0) return say('You have no open tasks. Clear runway.', { end: true })
      const sorted = [...open].sort((a, b) =>
        (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || (a.priority - b.priority)).slice(0, 5)
      const list = sorted.map(t => t.due_date ? `${t.title}, ${spokenDate(t.due_date)}` : t.title).join('; ')
      const more = open.length > 5 ? ` And ${open.length - 5} more.` : ''
      return say(`You have ${open.length} open task${open.length > 1 ? 's' : ''}. ${list}.${more}`, { end: true })
    }

    case 'CompleteTaskIntent': {
      const text = slot(body, 'TaskText')
      if (!text) return say('Which task should I mark done?', { reprompt: 'Say the task name.' })
      const { data } = await admin.from('work_items').select('id, title').eq('user_id', userId).neq('status', 'done')
      const match = bestMatch(data ?? [], text, t => t.title)
      if (!match) return say(`I couldn't find an open task matching ${text}.`, { end: true })
      const { error } = await admin.from('work_items').update({ status: 'done' }).eq('id', match.id)
      if (error) return say(`I couldn't update that. ${error.message}`, { end: true })
      return say(`Marked "${match.title}" as done. Nice work.`, { end: true })
    }

    case 'HabitsIntent': {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: habits } = await admin.from('habits').select('*').eq('user_id', userId)
      const { data: comps } = await admin.from('habit_completions').select('habit_id, completed_date').eq('user_id', userId)
      const byHabit: Record<string, string[]> = {}
      ;(comps ?? []).forEach(c => { (byHabit[c.habit_id] ??= []).push(c.completed_date) })
      const due = (habits ?? []).filter(h => isHabitDue(h, byHabit[h.id] ?? [], today))
      if (due.length === 0) {
        return say((habits?.length ?? 0) === 0
          ? 'You have no habits yet. Say, add a habit, then its name.'
          : 'No habits are due today. All caught up.', { end: true })
      }
      const remaining = due.filter(h => !(byHabit[h.id] ?? []).includes(today)).map(h => h.name)
      if (remaining.length === 0) return say(`All ${due.length} habits done today. Strong.`, { end: true })
      return say(`${due.length - remaining.length} of ${due.length} habits done. Still due: ${remaining.join(', ')}.`, { end: true })
    }

    case 'CompleteHabitIntent': {
      const name = slot(body, 'HabitName')
      if (!name) return say('Which habit did you do?', { reprompt: 'Say the habit name.' })
      const { data: habits } = await admin.from('habits').select('id, name').eq('user_id', userId)
      const match = bestMatch(habits ?? [], name, h => h.name)
      if (!match) return say(`I couldn't find a habit matching ${name}.`, { end: true })
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: exists } = await admin.from('habit_completions')
        .select('habit_id').eq('habit_id', match.id).eq('completed_date', today).maybeSingle()
      if (exists) return say(`${match.name} is already checked off today.`, { end: true })
      const { error } = await admin.from('habit_completions').insert({ habit_id: match.id, completed_date: today, user_id: userId })
      if (error) return say(`I couldn't log that. ${error.message}`, { end: true })
      return say(`Logged ${match.name} for today. Keep it going.`, { end: true })
    }

    case 'AddHabitIntent': {
      const name = slot(body, 'HabitName')
      if (!name) return say('What habit should I add?', { reprompt: 'Say the habit name.' })
      const { error } = await admin.from('habits').insert({
        name, user_id: userId, schedule_type: 'daily', category: null, interval_days: null, days_of_week: null,
      })
      if (error) return say(`I couldn't add that habit. ${error.message}`, { end: true })
      return say(`Added the daily habit ${name}.`, { end: true })
    }

    case 'PauseHabitIntent': {
      const name = slot(body, 'HabitName')
      if (!name) return say('Which habit should I pause?', { reprompt: 'Say the habit name.' })
      const { data: habits } = await admin.from('habits').select('id, name, paused').eq('user_id', userId)
      const match = bestMatch(habits ?? [], name, h => h.name)
      if (!match) return say(`I couldn't find a habit matching ${name}.`, { end: true })
      if (match.paused) return say(`${match.name} is already paused.`, { end: true })
      const { error } = await admin.from('habits').update({ paused: true }).eq('id', match.id)
      if (error) return say(`I couldn't pause that. ${error.message}`, { end: true })
      return say(`Paused ${match.name}.`, { end: true })
    }

    case 'ResumeHabitIntent': {
      const name = slot(body, 'HabitName')
      if (!name) return say('Which habit should I resume?', { reprompt: 'Say the habit name.' })
      const { data: habits } = await admin.from('habits').select('id, name, paused').eq('user_id', userId)
      const match = bestMatch(habits ?? [], name, h => h.name)
      if (!match) return say(`I couldn't find a habit matching ${name}.`, { end: true })
      if (!match.paused) return say(`${match.name} isn't paused.`, { end: true })
      const { error } = await admin.from('habits').update({ paused: false }).eq('id', match.id)
      if (error) return say(`I couldn't resume that. ${error.message}`, { end: true })
      return say(`Resumed ${match.name}.`, { end: true })
    }

    case 'MoneyIntent': {
      const { data: subs } = await admin.from('subscriptions').select('name, cost_monthly, renewal_date').eq('user_id', userId)
      const { data: buys } = await admin.from('buy_items').select('name, last_bought, cadence_days, status').eq('user_id', userId)
      const total = (subs ?? []).reduce((s, x) => s + Number(x.cost_monthly || 0), 0)
      const soon = (subs ?? []).filter(s => s.renewal_date && differenceInCalendarDays(parseISO(s.renewal_date), new Date()) <= 7)
      const refills = (buys ?? []).filter(b => b.status !== 'paused' && b.last_bought
        && differenceInCalendarDays(addDays(parseISO(b.last_bought), b.cadence_days ?? 30), new Date()) <= 0)
      const parts = [`You're spending about ${Math.round(total)} dollars a month on subscriptions`]
      if (soon.length) parts.push(`${soon.map(s => s.name).join(', ')} renew${soon.length === 1 ? 's' : ''} within a week`)
      if (refills.length) parts.push(`it's time to rebuy ${refills.map(b => b.name).join(', ')}`)
      return say(parts.join('. ') + '.', { end: true })
    }

    case 'MarkBoughtIntent': {
      const name = slot(body, 'ItemName')
      if (!name) return say('Which item did you buy?', { reprompt: 'Say the item name.' })
      const { data: buys } = await admin.from('buy_items').select('id, name').eq('user_id', userId)
      const match = bestMatch(buys ?? [], name, b => b.name)
      if (!match) return say(`I couldn't find a refill item matching ${name}.`, { end: true })
      const { error } = await admin.from('buy_items')
        .update({ last_bought: format(new Date(), 'yyyy-MM-dd'), status: 'stocked', snoozed_until: null }).eq('id', match.id)
      if (error) return say(`I couldn't update that. ${error.message}`, { end: true })
      return say(`Marked ${match.name} as bought. I'll remind you next time.`, { end: true })
    }

    case 'SnoozeRefillIntent': {
      const name = slot(body, 'ItemName')
      if (!name) return say('Which item should I snooze?', { reprompt: 'Say the item name.' })
      const { data: buys } = await admin.from('buy_items').select('id, name').eq('user_id', userId)
      const match = bestMatch(buys ?? [], name, b => b.name)
      if (!match) return say(`I couldn't find a refill item matching ${name}.`, { end: true })
      const until = format(addDays(new Date(), 7), 'yyyy-MM-dd')
      const { error } = await admin.from('buy_items').update({ snoozed_until: until, status: 'snoozed' }).eq('id', match.id)
      if (error) return say(`I couldn't snooze that. ${error.message}`, { end: true })
      return say(`Snoozed ${match.name} for a week.`, { end: true })
    }

    case 'CalendarIntent': {
      const now = new Date()
      const within = (iso: string | null) => iso ? differenceInCalendarDays(parseISO(iso), now) : 999
      const { data: tasks } = await admin.from('work_items').select('title, due_date').eq('user_id', userId).neq('status', 'done')
      const { data: subs } = await admin.from('subscriptions').select('name, renewal_date').eq('user_id', userId)
      const items: { label: string; d: number }[] = []
      ;(tasks ?? []).forEach(t => { const d = within(t.due_date); if (d >= 0 && d <= 14) items.push({ label: `${t.title} ${spokenDate(t.due_date!)}`, d }) })
      ;(subs ?? []).forEach(s => { const d = within(s.renewal_date); if (d >= 0 && d <= 14) items.push({ label: `${s.name} renews ${spokenDate(s.renewal_date!)}`, d }) })
      if (items.length === 0) return say('Nothing scheduled in the next two weeks.', { end: true })
      items.sort((a, b) => a.d - b.d)
      return say(`Coming up: ${items.slice(0, 6).map(i => i.label).join('; ')}.`, { end: true })
    }

    case 'LinkAccountIntent':
      return say("You're already linked. Say: ask four s what needs attention.", { end: true })

    case 'AMAZON.HelpIntent':
      return say('You can add a task, capture a note, or add a refill. Ask what needs attention, read my tasks, or what habits are due. Mark a task or habit done, pause or resume a habit, snooze a refill, or say you bought something. Or ask about your money or what is coming up. What would you like?', {
        reprompt: 'What would you like to do?',
      })

    case 'AMAZON.StopIntent':
    case 'AMAZON.CancelIntent':
      return say('Okay.', { end: true })

    default:
      return say("I'm not sure how to help with that yet. Say help to hear what I can do.", {
        reprompt: 'What would you like to do?',
      })
  }
  } catch (err) {
    // Never return silence — Alexa treats an empty/errored response as "no
    // response." Speak the error so it's visible in the test simulator.
    const message = err instanceof Error ? err.message : 'unknown error'
    return say(`Sorry, something went wrong. ${message}`, { end: true })
  }
}

// A short spoken "state of your day" — mirrors the Brief's counts and the
// Council's suggested-next-action logic, condensed for voice.
async function buildBrief(admin: ReturnType<typeof createAdminClient>, userId: string, detailed = false): Promise<string> {
  const today = format(new Date(), 'yyyy-MM-dd')

  const { data: tasks } = await admin
    .from('work_items').select('title, due_date, status').eq('user_id', userId).neq('status', 'done')
  const open = tasks ?? []
  const overdue = open.filter(t => t.due_date && differenceInCalendarDays(parseISO(t.due_date), new Date()) < 0)
  const dueToday = open.filter(t => t.due_date === today)

  const { count: inboxCount } = await admin
    .from('captures').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('domain', null)

  const { data: buyItems } = await admin
    .from('buy_items').select('name, last_bought, cadence_days, status').eq('user_id', userId)
  const refillsDue = (buyItems ?? []).filter(b => {
    if (b.status === 'paused' || !b.last_bought) return false
    return differenceInCalendarDays(addDays(parseISO(b.last_bought), b.cadence_days ?? 30), new Date()) <= 0
  })

  const parts: string[] = []
  if (overdue.length) parts.push(`${overdue.length} overdue task${overdue.length > 1 ? 's' : ''}`)
  if (dueToday.length) parts.push(`${dueToday.length} due today`)
  if (refillsDue.length) parts.push(`${refillsDue.length} thing${refillsDue.length > 1 ? 's' : ''} to buy again`)
  if (inboxCount && inboxCount > 0) parts.push(`${inboxCount} inbox item${inboxCount > 1 ? 's' : ''}`)

  if (parts.length === 0) {
    return detailed ? 'Nothing needs your attention right now. A good time to plan ahead.' : "You're all clear."
  }

  const summary = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
  const lead = overdue.length ? 'Start with your overdue tasks.'
    : dueToday.length ? "Focus on what's due today."
    : refillsDue.length ? 'Worth restocking what ran out.' : 'A quick inbox sort would help.'

  return detailed ? `You have ${summary}. ${lead}` : `You have ${summary}.`
}

function spokenDate(iso: string): string {
  const d = parseISO(iso)
  const diff = differenceInCalendarDays(d, new Date())
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  return format(d, 'EEEE, MMMM d')
}
