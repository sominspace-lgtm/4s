# Refill Intelligence — architecture notes

Lives under Money → Buy Again. Data model: `buy_items` table (see
`supabase/migrations/refill_intelligence.sql`), hook: `lib/hooks/useBuyItems.ts`.
4S is always the source of truth — nothing here depends on Amazon, Alexa, or
any external service actually existing yet.

## What's real today

- Three tracking modes: Simple Interval (default), Smart Supply (quantity /
  serving count / usage-per-day → calculated run-out date), Manual Date.
- Status pipeline: stocked → running-low → due-to-buy → overdue, plus
  backup-stock (bought but not opened), snoozed, and paused.
- "Too early / Just right / Too late" feedback nudges `cadence_days` up or
  down 15% per response (`submitFeedback` in the hook).
- Add flow supports scan/upload and paste-link, but both call **mock**
  extraction functions — see below.
- Private by default via the existing generic sharing system (`ShareMenu`,
  `item_type: 'buy_item'`) — nothing is visible to anyone until explicitly
  shared with a person or space.

## Mock AI extraction — where to wire the real thing

`lib/utils/refillExtraction.ts` exports `extractFromLabel(imageDataUrl)` and
`extractFromLink(url)`. Both are hardcoded mocks today, clearly commented in
that file. To make them real:

- **Label scan**: send the image as a base64 data URL to a vision-capable
  model (e.g. Claude with an image content block) with a prompt asking for
  the `ExtractedProductInfo` fields as JSON.
- **Link paste**: most product pages block CORS from the browser, so this
  needs a server-side route (e.g. `app/api/refill/extract-link/route.ts`)
  that fetches the URL, parses OG/meta tags for title/price/image, and
  optionally re-uses the same label-reading model prompt on the page text
  for quantity/serving extraction.

Neither path is ever trusted blindly — `AddRefillFlow` always shows a
confirmation screen (Confirm / Edit / Try again / Use simple interval
instead) before anything is saved, regardless of extraction confidence.

## Future hooks (not built yet, but the data model supports them)

- **PWA push notifications**: `notify_days_before` + `runoutDate()` (in
  `useBuyItems.ts`) already compute exactly when a reminder should fire —
  a scheduled job just needs to read `buy_items` where
  `computeStatus(item) === 'due-to-buy'` and push via the existing
  service worker (`public/sw.js`).
- **Alexa Skill**: would need a separate Lambda/endpoint authenticated
  against the same Supabase project (service-role key, same pattern as
  `scripts/reset-onboarding.mjs`), translating utterances like:
  - "Alexa, ask 4S what is running out." → query `buy_items` for
    `due-to-buy`/`overdue` status.
  - "Alexa, ask 4S to add Vitamin D to Buy Again." → `useBuyItems().add()`
    with `tracking_mode: 'simple-interval'` and category defaults.
  - "Alexa, ask 4S to mark shampoo as bought." → fuzzy-match name, call
    `markBought(id)`.
  - "Alexa, ask 4S what needs attention." / "…for my daily briefing." →
    reuse the same aggregation logic already in `DailyBrief.tsx`
    (`refillsDue`, `moneyDueSoon`, `domainsNeedingReview`, etc.) via a
    small shared server-side summary function instead of duplicating it.
- **Barcode scan**: same confirmation-screen contract as label scan — a
  barcode lookup API would populate `ExtractedProductInfo` and hand off to
  the existing `AddRefillFlow` confirmation step unchanged.

None of the above is implemented — this section exists so the next pass
doesn't have to re-derive the integration points.
