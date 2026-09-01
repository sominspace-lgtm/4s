# Engineering Standards

Engineering should serve calm UX.

## General standards

- TypeScript first.
- Small, composable components.
- Clear data ownership.
- Preserve Supabase RLS assumptions.
- Prefer safe migrations.
- Avoid destructive database actions.
- No silent failures.
- Good loading, empty, and error states for every async flow.

## Themes and Guides

Themes are visual only.

Personality modes / Guides are tone and copy only.

Do not mix them.

## State

Avoid stale data across component instances.

Use clear invalidation patterns or the existing CustomEvent pub/sub pattern where appropriate.

## Errors

Never surface raw technical errors directly if they can be translated.

Log useful details for debugging, but show human-readable messages.

## Performance

The app should feel instant.

Prioritize:

- fast initial load
- optimistic UI when safe
- skeletons only when useful
- no layout shift
- mobile performance

## Auth

Preserve existing Supabase auth flows unless explicitly asked.

Do not break:

- magic link
- password sign-in
- sign-up
- session handling
- protected routes

## Database

Migrations should be explicit and reversible when possible.

For user-run SQL, provide clear raw SQL and instructions.

Do not execute destructive actions directly.

## Testing mindset

For every feature, manually test:

- empty state
- loading state
- error state
- success state
- mobile layout
- theme contrast
- authenticated and unauthenticated behavior
- RLS assumptions when data is shared

## Code review rule

If code makes the UI more complex, it must remove more complexity from the user's life.
