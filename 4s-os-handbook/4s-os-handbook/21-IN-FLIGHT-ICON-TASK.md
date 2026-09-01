# In-Flight Task — App Icon

This task was unfinished and should be considered before broad new product work.

## User-Approved Icon Direction

The user wants the icon to be:

> “4S” as the hero, with the SOS Morse code `··· ––– ···` arranged in a ring / circle around it, like the original orbit design, monochrome near-white on charcoal.

The approved design was previewed and accepted, but the apply-everywhere step was interrupted by a permission error. It is not committed.

Current repo icons may still be the aurora “4S + straight morse line” version.

## Before Doing Anything

First run:

```bash
git status
```

There may be uncommitted aurora-version edits in:

- `components/ui/Logo.tsx`
- `app/icons/512.png/route.tsx`
- `public/4s-icon-512.png`

Do not overwrite unrelated user work blindly.

## Approved Final SVG

This SVG is the source of truth. Render this at all sizes.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="bg" cx="50%" cy="30%" r="88%">
      <stop offset="0%" stop-color="#17171b"/><stop offset="55%" stop-color="#0b0b0d"/><stop offset="100%" stop-color="#040405"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="34%" r="55%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.09"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect x="1" y="1" width="98" height="98" rx="26" fill="url(#bg)"/>
  <rect x="1" y="1" width="98" height="98" rx="26" fill="url(#glow)"/>
  <rect x="1.5" y="1.5" width="97" height="97" rx="25.5" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="1"/>
  <g fill="#ededee">
    <circle cx="50.00" cy="10.00" r="3"/>
    <circle cx="75.71" cy="19.36" r="3"/>
    <circle cx="89.39" cy="43.05" r="3"/>
    <rect x="80.14" y="68.40" width="9" height="3.2" rx="1.6" transform="rotate(120 84.64 70.00)"/>
    <rect x="59.18" y="85.99" width="9" height="3.2" rx="1.6" transform="rotate(160 63.68 87.59)"/>
    <rect x="31.82" y="85.99" width="9" height="3.2" rx="1.6" transform="rotate(200 36.32 87.59)"/>
    <circle cx="15.36" cy="70.00" r="3"/>
    <circle cx="10.61" cy="43.05" r="3"/>
    <circle cx="24.29" cy="19.36" r="3"/>
  </g>
  <text x="50" y="52" text-anchor="middle" dominant-baseline="central" font-family="Georgia, 'Times New Roman', serif" font-weight="600" font-size="42" letter-spacing="-2" fill="#f2f2f4">4S</text>
</svg>
```

## Finish Steps

1. Render the SVG via `sharp` to:
   - `alexa-icons/4s-icon-512.png` at 512px
   - `alexa-icons/4s-icon-108.png` at 108px
   - `public/icons/512.png` at 512px
   - `public/icons/192.png` at 192px
   - `public/4s-icon-512.png` at 512px

2. Delete the dynamic satori routes so static files resolve correctly:
   - `app/icons/512.png/route.tsx`
   - `app/icons/192.png/route.tsx`

   Delete the whole `app/icons/512.png` and `app/icons/192.png` folders if they only contain those routes.

3. Preserve references:
   - `public/manifest.json` already references `/icons/192.png` and `/icons/512.png`.
   - `app/layout.tsx` already references `/icons/192.png` and `/icons/512.png`.
   - Notification icons in `DashboardClient` and `AccountClient` use `/icons/192.png`.

4. Update `components/ui/Logo.tsx` to the same circular Morse ring around 4S.
   - In-app mark should be theme-reactive.
   - Use `var(--gold)` for 4S and Morse so it stays monochrome per theme.
   - This mark is used on `/login` and `/guide`.

5. Run:

```bash
npx tsc --noEmit
npx next build
```

6. Commit and push only when asked.

## Alexa Icon Output

Files the user needs for Alexa:

- Small: `alexa-icons/4s-icon-108.png`
- Large: `alexa-icons/4s-icon-512.png`

## Quality Bar

The icon should feel:

- monochrome
- premium
- quiet
- recognizable at small sizes
- connected to the meaning of 4S: `4syl` / always-there SOS

Avoid:

- aurora gradients
- excessive color
- busy symbols
- straight-line Morse when the approved direction is circular/orbiting
