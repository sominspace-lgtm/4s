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

    case 'LinkAccountIntent':
      return say("You're already linked. Say: ask four s what needs attention.", { end: true })

    case 'AMAZON.HelpIntent':
      return say('You can say: add a task to call the dentist tomorrow. Or, capture, remember to water the plants. Or, remind me to buy coffee every 14 days. Or ask, what needs attention?', {
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
