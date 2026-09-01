# Project Context

This document reflects the latest known state of the 4S OS codebase and should be read before any coding session.

## App

- Product: **4S OS**
- Positioning: calm personal operating system
- Repo: `sominspace-lgtm/4s`
- Live: `4s-coral.vercel.app`
- Local: `C:\Users\harol\Documents\4s`
- Deployment: Vercel auto-deploys on push to `main`

## Stack

- Next.js 16 App Router
- TypeScript strict
- Supabase Postgres + Auth + RLS via `@supabase/ssr`
- Vercel
- Windows development environment
- `git bash` available
- CRLF warnings are normal
- `sharp` is installed for image work

## Environment Variables

Required locally in `.env.local` and in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — server-only; powers admin routes
- `ANTHROPIC_API_KEY` — server-only; enables AI
- Optional: `AI_MODEL`, defaults to `claude-haiku-4-5`
- `ALEXA_SKILL_ID` = `amzn1.ask.skill.0d40939a-9aad-4842-91fd-fbc88e770484`

## Verify Workflow

Before considering work complete, run:

```bash
npx tsc --noEmit
npx next build
```

Commit and push only when explicitly asked.

No live database access. Migrations should be handed to the user as raw SQL to run in the Supabase SQL Editor.

## Core Architecture

- Themes are visual only.
- Themes live in `components/ui/ThemeProvider.tsx` via CSS custom properties.
- There are currently 13 themes.
- Personality modes are tone/copy only.
- Personality modes live in `lib/constants/modes.ts`.
- Themes and modes must never be mixed.

## Navigation

Current primary nav:

- Brief
- Tasks
- Habits
- Life
- Money
- Calendar
- Shared
- Council

## Sharing

Private by default everywhere.

Current sharing concepts:

- Friends via `companions` table
- Shared Spaces via `shared_spaces` and `shared_space_members`
- Generic per-item sharing via `shared_item_links` and `ShareMenu`

## Migrations Confirmed Applied

Original applied migrations:

- `shared_spaces_and_item_sharing.sql`
- `fix_shared_spaces_recursion.sql`
- `refill_intelligence.sql`
- `habit_schedules.sql`
- `companions_invite_visibility_fix.sql`
- `capture_wishlist_sharing_policies.sql`

Additional applied migrations:

- `alexa_account_linking.sql`
- `alexa_code_linking.sql`

All migrations are in `supabase/migrations/`.

## Major Features Built And Shipped

- Money hub: Wishlist, Gifts, Renewals, Buy Again
- Refill Intelligence with mock AI extraction
- Custom habit schedules
- Themed onboarding
- PWA support
- Friends invite/accept flow
- Command palette
- Focus View
- Council advisor cards
- Weekly Review
- Ask Jarvis
- Tab-based dashboard
- Controls bar rebuilt as `.pill` buttons
- Softer first-time states
- Tasks NLP confirm chip
- Calendar Agenda + Month views from app data
- Shared hub with With Me / By Me / Spaces / People
- Real AI route via Claude Haiku
- Alexa skill webhook and code-based linking
- Public guide page
- Refreshed help panel

## Current Dashboard Architecture

- Dashboard is tab-based.
- Brief is the command center.
- Each section renders alone via `activeTab` in `app/dashboard/DashboardClient.tsx`.
- Navigation uses `4s:navigate` CustomEvent and `lib/utils/navigate.ts`.
- Focus View keeps the old stacked layout.

## Current Controls Bar

- Controls bar uses `.pill` buttons.
- Controls include Ask Jarvis, Focus view, Configure, Simple/Full view, and Guide.
- Styles live in `app/globals.css`.

## Current Tasks NLP

- `lib/utils/parseTask.ts`
- Example: `hw due today` becomes a confirm chip.
- Never auto-saves without user confirmation.

## Current Calendar

- Agenda and Month views use app data.
- Key files:
  - `lib/hooks/useAgendaEntries.ts`
  - `CalendarMonth.tsx`
  - `CalendarSummary.tsx`
- These sit above the Google iframe embed.

## Current Shared Hub

- `SharedHub.tsx` includes With Me / By Me / Spaces / People.
- `PeopleList.tsx` is also used in Friends panel.
- `useCompanions` broadcasts `4s:companions-changed`.

## Current AI

- API route: `app/api/ai/route.ts`
- Uses `@anthropic-ai/sdk`.
- Model: Claude Haiku via `AI_MODEL` / default `claude-haiku-4-5`.
- Uses `output_config.format` structured outputs.
- Powers refill label/link extraction, Council review, and Ask Jarvis.
- Graceful fallback when no API key: 503 to fallback.
- `lib/hooks/useAppSnapshot.ts` sends only counts, titles, and dates — never note bodies.

## Current Alexa Skill

- Webhook: `app/api/alexa/route.ts`
- Uses code-based linking, not Amazon account linking.
- Every request has `context.System.user.userId`.
- User gets a 4-digit code at Account → Connect Alexa through `app/api/alexa/link-code/route.ts`.
- User speaks the code with `LinkAccountIntent`.
- Webhook maps via `alexa_links.alexa_user_id`.
- `proxy.ts` exempts `/api/alexa/*` from the auth gate.
- Setup guide: `docs/alexa-skill.md`.
- Invocation name: `four s`.
- Best phrasing: say “Alexa, open four s” then command. One-shot phrasing can mis-parse.

Supported Alexa intents:

- AddTask
- ListTasks
- CompleteTask
- Capture
- Habits
- CompleteHabit
- AddHabit
- AddRefill
- MarkBought
- Money
- Calendar
- WhatsNext
- Brief

Implementation notes:

- Uses fuzzy `bestMatch()`.
- Amazon-side beta setup remains user-managed.
- Account Linking should be off in Alexa console because 4S uses code linking.

## Real Bugs Fixed

- RLS infinite recursion between `shared_spaces` and `shared_space_members`, fixed via SECURITY DEFINER function.
- Pending friend invites invisible to recipients because RLS keyed on wrong column.
- Wrong email displayed in invite list.
- Stale data across component instances, fixed with CustomEvent pub/sub pattern per hook.
- Silent insert failures now surface real error messages.
- Light-theme accent colors had bad contrast, fixed with real WCAG math.
- Hardcoded pink buttons regardless of active theme, fixed.

## Explicitly Deferred

Do not silently assume these exist:

- Alexa request signature verification. Needed for public store certification, not beta.
- Push notifications.
- Barcode scan.
- Full per-item Shared With Me feed. Current state is category-level sharing only.
- Habit schedule editing after creation.
- Real Google Calendar API. Current state is still an iframe.

## In-Flight Task

The app icon task is unfinished and should be handled first when relevant. See:

- `21-IN-FLIGHT-ICON-TASK.md`

## Process Notes

- No live database access beyond read-only checks.
- Migrations are handed to the user as raw SQL to run themselves.
- No destructive actions should ever be executed directly, even on request.
- Account deletion and data wipes belong in Supabase Dashboard or explicit safe UX flows with confirmations.
- Commit and push only when asked.
