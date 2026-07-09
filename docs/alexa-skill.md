# Connecting 4S Home to Amazon Alexa

4S talks to Alexa through a **custom Alexa Skill**. The skill's endpoint is a
webhook already built into this app, and Alexa figures out *which* 4S user is
speaking through **account linking**. Nothing runs on an Alexa device — Alexa
sends a JSON request to your deployed app, the app reads/writes Supabase, and
replies with speech.

Once set up you can say things like:

- *"Alexa, ask four s to add a task to call the dentist tomorrow."*
- *"Alexa, tell four s to capture: remember to water the plants."*
- *"Alexa, ask four s to remind me to buy coffee."* (defaults to a 30-day reminder; adjust the interval in the app)
- *"Alexa, ask four s what needs attention."*

---

## What's already built

| Piece | Where | Purpose |
|---|---|---|
| Skill webhook | `app/api/alexa/route.ts` | Handles Launch + Intent requests, writes tasks / captures / refills, speaks your brief |
| Account linking | code-based — spoken 4-digit code, see step 5 below | Maps each Alexa account to a 4S user |
| Link tables | `supabase/migrations/alexa_account_linking.sql` then `alexa_code_linking.sql` | `alexa_links` (+ `alexa_user_id` col) and `alexa_link_codes` (run both migrations once, in order) |

> `app/api/alexa/authorize/route.ts` (OAuth implicit-grant) also exists in the
> repo but is **dead code** — Amazon's Account Linking UI didn't work
> reliably for this setup, so the app switched to the code-based flow below.
> Do not configure Account Linking in the Alexa console; it writes a token the
> webhook never reads, so linking would silently appear to work while the
> skill still says you're not linked.

## One-time setup

### 0. Run the migrations

In the Supabase SQL editor, run **`alexa_account_linking.sql`, then
`alexa_code_linking.sql`** — in that order (the second adds the
`alexa_user_id` column and `alexa_link_codes` table onto what the first creates).

### 1. Create the skill

1. Go to **developer.amazon.com/alexa/console/ask** → **Create Skill**.
2. Name it `4S Home`. Model: **Custom**. Hosting: **Provision your own**.
3. Create it, then open the **Build** tab.

### 2. Set the invocation name

**Build → Invocation** → set the invocation name to `four s`. (It can't start
with a digit, so "4 s" is rejected — "four s" is what you say aloud.) Save.

### 3. Paste the interaction model

**Build → Interaction Model → JSON Editor**, replace everything with the JSON
in the section below, then **Save Model** and **Build Model**.

### 4. Point the endpoint at your app

**Build → Endpoint** → choose **HTTPS**.

- Default region URL: `https://4s-coral.vercel.app/api/alexa`
- SSL certificate type: **"My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority"** (Vercel provides this).

### 5. Set the environment variables in Vercel

**Settings → Environment Variables** on the Vercel project:

- `ALEXA_SKILL_ID` — copy from the Alexa console (**Build → Endpoint**, "Your
  Skill ID", starts with `amzn1.ask.skill.`). This locks the webhook to your
  skill.
- `SUPABASE_SERVICE_ROLE_KEY` — required; the webhook, link-code issuing, and
  the multi-user lookup all run through the admin client.
- (`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, etc. as already documented.)

Redeploy so the vars take effect. **Skip Account Linking entirely** — leave it
disabled in the Alexa console. It is not part of this flow.

### 6. Invite everyone who'll use it (required for anyone but you)

An unpublished custom skill is invisible to everyone except your own Amazon
developer account **unless you invite them as beta testers**:

**Alexa Developer Console → your skill → Distribution → Beta Test** →
**Create Beta Test** → add each person's email → **Send Invitation**.

Each person opens the emailed invite link on the browser or phone they use
for Alexa, taps **Accept and enable**, which turns the skill on for their
Amazon account. Only after this step can they say *"Alexa, open four s"* on
their own devices. Do this for every household/friend who'll use it — it is
separate from and required in addition to the 4S account linking below.

### 7. Each person links their own 4S account

Every person does this once, on their own device, after accepting the beta
invite above:

1. Open **4S → Account → Connect Alexa** → tap **Get my code**. A 4-digit
   code appears, tied to their 4S login.
2. Say to their Echo/Alexa app: *"Alexa, ask four s to link"* then read the
   4 digits when asked (or in one breath: *"Alexa, ask four s to link 4 2 9 1"*).
3. Alexa confirms *"You're linked."* From then on, that Alexa account always
   resolves to that person's 4S data — everyone's tasks, habits, and money
   stay private to them even though they share one skill.

Codes expire when a new one is generated and are deleted immediately after a
successful link, so there's no lingering code to guess.

---

## Interaction model JSON

```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "four s",
      "intents": [
        { "name": "AMAZON.HelpIntent", "samples": [] },
        { "name": "AMAZON.StopIntent", "samples": [] },
        { "name": "AMAZON.CancelIntent", "samples": [] },
        { "name": "AMAZON.FallbackIntent", "samples": [] },
        {
          "name": "AddTaskIntent",
          "slots": [{ "name": "TaskText", "type": "AMAZON.SearchQuery" }],
          "samples": [
            "add a task {TaskText}",
            "add task {TaskText}",
            "new task {TaskText}",
            "remind me to {TaskText}",
            "to do {TaskText}"
          ]
        },
        {
          "name": "ListTasksIntent",
          "samples": [
            "tasks",
            "my tasks",
            "task list",
            "what are my tasks",
            "list my tasks",
            "read my tasks",
            "what's on my list",
            "what tasks do i have",
            "read my task list"
          ]
        },
        {
          "name": "CompleteTaskIntent",
          "slots": [{ "name": "TaskText", "type": "AMAZON.SearchQuery" }],
          "samples": [
            "mark task {TaskText} done",
            "complete task {TaskText}",
            "finish task {TaskText}",
            "i finished the task {TaskText}",
            "check off task {TaskText}",
            "i finished {TaskText}"
          ]
        },
        {
          "name": "CaptureIntent",
          "slots": [{ "name": "NoteText", "type": "AMAZON.SearchQuery" }],
          "samples": [
            "capture {NoteText}",
            "capture that {NoteText}",
            "note {NoteText}",
            "remember {NoteText}",
            "jot down {NoteText}"
          ]
        },
        {
          "name": "AddRefillIntent",
          "slots": [{ "name": "ItemName", "type": "AMAZON.SearchQuery" }],
          "samples": [
            "remind me to buy {ItemName}",
            "add a refill for {ItemName}",
            "buy again {ItemName}",
            "restock {ItemName}"
          ]
        },
        {
          "name": "MarkBoughtIntent",
          "slots": [{ "name": "ItemName", "type": "AMAZON.SearchQuery" }],
          "samples": [
            "i bought {ItemName}",
            "mark {ItemName} as bought",
            "i got more {ItemName}",
            "i restocked {ItemName}",
            "bought {ItemName}"
          ]
        },
        {
          "name": "SnoozeRefillIntent",
          "slots": [{ "name": "ItemName", "type": "AMAZON.SearchQuery" }],
          "samples": [
            "snooze {ItemName}",
            "snooze the refill for {ItemName}",
            "hold off on {ItemName}",
            "not now on {ItemName}"
          ]
        },
        {
          "name": "HabitsIntent",
          "samples": [
            "habits",
            "my habits",
            "what habits are due",
            "what habits do i have",
            "habit check",
            "what's due today"
          ]
        },
        {
          "name": "CompleteHabitIntent",
          "slots": [{ "name": "HabitName", "type": "AMAZON.SearchQuery" }],
          "samples": [
            "i did my {HabitName} habit",
            "log habit {HabitName}",
            "complete habit {HabitName}",
            "check off habit {HabitName}",
            "mark habit {HabitName} done"
          ]
        },
        {
          "name": "AddHabitIntent",
          "slots": [{ "name": "HabitName", "type": "AMAZON.SearchQuery" }],
          "samples": [
            "add a habit {HabitName}",
            "new habit {HabitName}",
            "add habit {HabitName}",
            "start tracking {HabitName}",
            "track a habit called {HabitName}"
          ]
        },
        {
          "name": "PauseHabitIntent",
          "slots": [{ "name": "HabitName", "type": "AMAZON.SearchQuery" }],
          "samples": [
            "pause my {HabitName} habit",
            "pause habit {HabitName}",
            "pause {HabitName} habit"
          ]
        },
        {
          "name": "ResumeHabitIntent",
          "slots": [{ "name": "HabitName", "type": "AMAZON.SearchQuery" }],
          "samples": [
            "resume my {HabitName} habit",
            "resume habit {HabitName}",
            "unpause {HabitName}",
            "unpause habit {HabitName}"
          ]
        },
        {
          "name": "MoneyIntent",
          "samples": [
            "money",
            "my money",
            "how's my money",
            "what am i spending",
            "my subscriptions",
            "money update",
            "what's my spending"
          ]
        },
        {
          "name": "CalendarIntent",
          "samples": [
            "calendar",
            "schedule",
            "what's coming up",
            "my calendar",
            "what's on my calendar",
            "what's next this week",
            "upcoming events"
          ]
        },
        {
          "name": "LinkAccountIntent",
          "slots": [{ "name": "Code", "type": "AMAZON.FOUR_DIGIT_NUMBER" }],
          "samples": [
            "{Code}",
            "it's {Code}",
            "it is {Code}",
            "the code is {Code}",
            "my code is {Code}",
            "code {Code}",
            "link {Code}",
            "to link {Code}",
            "link account {Code}",
            "connect {Code}"
          ]
        },
        {
          "name": "WhatsNextIntent",
          "samples": [
            "what needs attention",
            "what should i do next",
            "what's next",
            "what do i have"
          ]
        },
        {
          "name": "BriefIntent",
          "samples": [
            "my brief",
            "today's brief",
            "give me my brief",
            "what's on my plate"
          ]
        }
      ],
      "types": []
    }
  }
}
```

> Note: `AddTaskIntent` reuses the same natural-language parser as the web app
> (`lib/utils/parseTask.ts`), so "call the dentist tomorrow" or "pay rent p1
> friday" set the due date and priority automatically.

---

## Troubleshooting "I can't connect"

The backend was verified healthy on 2026-07-09 (prod webhook accepts the correct
skill id, rejects others, and returns the right "not linked yet" prompt). So if
linking fails, it's almost always one of these, in order of likelihood:

1. **You spoke only the bare digits before rebuilding the model.** The webhook
   says "just say the four digits," but that only works after the interaction
   model above (with the `"{Code}"` sample) is pasted in **and Build Model is
   run**. Until then, say the digits *with* a carrier word:
   *"Alexa, ask four s to link four two nine one."*
2. **The interaction model wasn't (re)built.** Any time the model changes,
   **Build → Interaction Model → JSON Editor → Save Model → Build Model**.
   Without a build, new/updated intents don't exist for Alexa's speech matching.
3. **The skill isn't enabled for that person's Amazon account.** Your own dev
   account has it automatically; everyone else needs a **Beta Test invite**
   (step 6) accepted first, or Alexa won't recognize "four s" at all.
4. **The endpoint isn't pointed at prod.** Build → Endpoint must be
   `https://4s-coral.vercel.app/api/alexa` (HTTPS, wildcard-cert option).
5. **No code came back in the app.** If Account → Connect Alexa → "Get my code"
   errors, `SUPABASE_SERVICE_ROLE_KEY` is missing on Vercel (it isn't, as of the
   audit) or the `alexa_link_codes` migration wasn't run.

Quick self-test of the live webhook (replace the skill id if it changed):

```bash
curl -s https://4s-coral.vercel.app/api/alexa -X POST \
  -H "Content-Type: application/json" \
  -d '{"version":"1.0","context":{"System":{"application":{"applicationId":"amzn1.ask.skill.0d40939a-9aad-4842-91fd-fbc88e770484"},"user":{"userId":"amzn1.ask.account.TEST"}}},"request":{"type":"LaunchRequest","timestamp":"'"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"'"}}'
```

Expected: a 200 with *"You are not linked yet…"*. A 401 "Unexpected skill id"
means `ALEXA_SKILL_ID` on Vercel doesn't match your skill.

## Security notes

- The webhook is locked to your skill via `ALEXA_SKILL_ID`, rejects requests
  older than 150 seconds, and requires a valid link (matched on Alexa's stable
  anonymous `userId`, not a bearer token) — so only a linked Alexa account can
  read or write that person's data.
- Links live in `alexa_links`, keyed by `alexa_user_id` with a unique index —
  one Alexa account maps to exactly one 4S user, and each 4S user can have at
  most one linked Alexa account. Only read server-side with the service-role
  client. Delete your row (or ask another linked person to delete theirs) to
  unlink; generating a fresh code and re-linking overwrites the old row.
- **Before submitting this skill for public certification**, add Alexa request
  **signature verification** (`Signature` / `SignatureCertChainUrl` headers) to
  `app/api/alexa/route.ts` — Amazon requires it for published skills. It's
  intentionally omitted for a private, single-household skill, where the
  skill-id + token boundary is sufficient. This is the one deferred piece.
```
