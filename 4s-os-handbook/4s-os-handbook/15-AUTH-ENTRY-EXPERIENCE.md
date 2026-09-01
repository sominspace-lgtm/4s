# Auth and Entry Experience

## Task

Improve the login / entry experience for 4S OS.

The current login/dashboard entry experience is too vague and the authentication UI feels unfinished.

The goal is to make the product promise concrete before asking users to sign in.

## Core question

The entry page should immediately answer:

1. What is 4S OS?
2. What can I do here?
3. Why should I log in?

## Product positioning

4S OS is a calm personal operating system for organizing goals, tasks, routines, reflections, and priorities in one place.

It is not a generic SaaS login screen.

It should feel like entering a quiet private workspace.

## Required copy

Headline:

4S

Tagline:

Your personal operating system

Supporting copy:

Organize your goals, tasks, routines, reflections, and priorities in one calm workspace.

Alternative supporting copy:

Build your personal system for planning, reviewing, and staying aligned.

Optional footer line:

Built for planning, reviewing, and staying aligned.

Optional trust copy:

Private by default.

Your space stays yours.

After signing in, your Brief shows what needs attention today.

## Authentication hierarchy

Do not display “sign in sign up magic link” as equal inline options.

Use one obvious primary action.

Primary:

Continue with magic link

Secondary:

Sign in with password

Tertiary:

Create an account

Use polished labels:

- Sign in
- Sign up
- Magic link
- Remember me

Only show Remember me if it is relevant to password login and functional.

## Recommended interaction model

Default state:

- Show email input.
- Show primary button: Continue with magic link.
- Show quiet secondary action: Sign in with password.
- Show tertiary link: New to 4S? Create an account.

Password state:

- Show email and password fields.
- Show Remember me only if functional.
- Primary button: Sign in.
- Secondary quiet option: Use magic link instead.

Sign-up state:

- Show sign-up form.
- Primary button: Create account.
- Secondary quiet option: Already have an account? Sign in.

## Layout

Use a centered auth card.

Include:

1. 4S logo/name at top
2. tagline underneath
3. one short explanatory sentence
4. optional three-item feature preview
5. auth controls
6. privacy reassurance

Do not create a giant marketing page.

Feature preview should use at most three items:

- Capture what matters
- Plan your day
- Review your life with calm guidance
- Share only what you choose
- Build routines that last

## Visual direction

Make the page feel finished.

Use:

- clean typography
- clear spacing
- quiet hierarchy
- dominant primary action
- subtle secondary actions
- minimal but not empty design

Avoid:

- clutter
- generic SaaS marketing
- multiple equal CTAs
- prototype-like lowercase labels
- cramped inline controls

## Mobile

Mobile must feel native.

Use:

- readable text
- large touch targets
- centered card
- minimal vertical scrolling
- no desktop compression
- collapsed password flow until selected
- quiet account creation link

## Loading and feedback

Use polished loading states:

- Sending magic link...
- Checking your account...
- Creating your space...

Success:

Check your email for a secure sign-in link.

Errors:

Instead of “Invalid login credentials”:

That email and password did not match. Try again or use a magic link.

Instead of “Email rate limit exceeded”:

Too many attempts. Please wait a moment before trying again.

## Constraints

Preserve existing:

- routes
- Supabase auth logic
- magic-link flow
- password sign-in flow
- sign-up flow
- session handling
- themes
- personality modes
- dashboard behavior

Do not overbuild.

Keep the change focused and elegant.
