# Connecting 4S Home to Amazon Alexa

4S talks to Alexa through a **custom Alexa Skill**. The skill's endpoint is a
webhook already built into this app, and Alexa figures out *which* 4S user is
speaking through **account linking**. Nothing runs on an Alexa device — Alexa
sends a JSON request to your deployed app, the app reads/writes Supabase, and
replies with speech.

Once set up you can say things like:

- *"Alexa, ask 4S to add a task to call the dentist tomorrow."*
- *"Alexa, tell 4S to capture: remember to water the plants."*
- *"Alexa, ask 4S to remind me to buy coffee every 14 days."*
- *"Alexa, ask 4S what needs attention."*

---

## What's already built

| Piece | Where | Purpose |
|---|---|---|
| Skill webhook | `app/api/alexa/route.ts` | Handles Launch + Intent requests, writes tasks / captures / refills, speaks your brief |
| Account linking | `app/api/alexa/authorize/route.ts` | OAuth implicit-grant endpoint that maps an Alexa user to a 4S user |
| Link tokens | `supabase/migrations/alexa_account_linking.sql` | `alexa_links` table (run this migration once) |

## One-time setup

### 0. Run the migration

In the Supabase SQL editor, run `supabase/migrations/alexa_account_linking.sql`.

### 1. Create the skill

1. Go to **developer.amazon.com/alexa/console/ask** → **Create Skill**.
2. Name it `4S Home`. Model: **Custom**. Hosting: **Provision your own**.
3. Create it, then open the **Build** tab.

### 2. Set the invocation name

**Build → Invocation** → set the invocation name to `4 s` (Alexa hears "4S"
well as "four s"). Save.

### 3. Paste the interaction model

**Build → Interaction Model → JSON Editor**, replace everything with the JSON
in the section below, then **Save Model** and **Build Model**.

### 4. Point the endpoint at your app

**Build → Endpoint** → choose **HTTPS**.

- Default region URL: `https://4s-coral.vercel.app/api/alexa`
- SSL certificate type: **"My development endpoint is a sub-domain of a domain that has a wildcard certificate from a certificate authority"** (Vercel provides this).

### 5. Account linking

**Build → Account Linking** → enable it, with these values:

| Field | Value |
|---|---|
| Auth Grant type | **Implicit Grant** |
| Authorization URI | `https://4s-coral.vercel.app/api/alexa/authorize` |
| Client ID | `4s-home` (any non-empty string — this flow ignores it) |
| Scope | leave empty |

Save. Alexa shows you one or more **Redirect URLs** (e.g.
`https://layla.amazon.com/api/skill/link/...`) — you don't need to copy these
anywhere; the authorize endpoint accepts any Amazon-owned redirect host.

### 6. Set the environment variables in Vercel

**Settings → Environment Variables** on the Vercel project:

- `ALEXA_SKILL_ID` — copy from the Alexa console (**Build → Endpoint**, "Your
  Skill ID", starts with `amzn1.ask.skill.`). This locks the webhook to your
  skill.
- (`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, etc. as already documented.)

Redeploy so the vars take effect.

### 7. Link your account

On your phone: **Alexa app → More → Skills & Games → Your Skills → Dev →
4S Home → Settings → Link Account**. Sign in to 4S when prompted. Done — Alexa
now knows who you are on every request.

---

## Interaction model JSON

```json
{
  "interactionModel": {
    "languageModel": {
      "invocationName": "4 s",
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
          "slots": [
            { "name": "ItemName", "type": "AMAZON.SearchQuery" },
            { "name": "Days", "type": "AMAZON.NUMBER" }
          ],
          "samples": [
            "remind me to buy {ItemName} every {Days} days",
            "remind me to buy {ItemName}",
            "add a refill for {ItemName}",
            "buy again {ItemName}",
            "restock {ItemName} every {Days} days"
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

## Security notes

- The webhook is locked to your skill via `ALEXA_SKILL_ID`, rejects requests
  older than 150 seconds, and requires a valid link token — so only your linked
  Alexa can write to your account.
- Account link tokens live in `alexa_links` and are only read server-side with
  the service-role client. Delete your row to unlink.
- **Before submitting this skill for public certification**, add Alexa request
  **signature verification** (`Signature` / `SignatureCertChainUrl` headers) to
  `app/api/alexa/route.ts` — Amazon requires it for published skills. It's
  intentionally omitted for a private, single-household skill, where the
  skill-id + token boundary is sufficient. This is the one deferred piece.
```
