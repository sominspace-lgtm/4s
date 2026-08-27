'use client'

import { resolveThemeVars, DEFAULT_THEME, type CustomThemeSeed } from '@/lib/constants/themes'

// Theme data + normalizeTheme() live in lib/constants/themes.ts (a plain
// module) — see the comment there for why: a Server Component can render
// this file's default export as JSX, but it can never directly call one of
// this file's other exports, because 'use client' marks every export of a
// module as a client reference, not just the component. Re-exported here so
// nothing that already imports THEMES/THEME_LABELS from '@/components/ui/
// ThemeProvider' has to change.
export {
  THEMES, THEME_LABELS, LEGACY_THEME_MAP, normalizeTheme, DEFAULT_THEME,
  resolveThemeVars, buildCustomVars, FONT_PRESETS, DEFAULT_CUSTOM_SEED,
  NEUTRAL_LIGHT, NEUTRAL_DARK, DEFAULT_ACCENT,
  type CustomThemeSeed,
} from '@/lib/constants/themes'

// Renders the resolved theme as an inline <style> tag instead of setting
// CSS custom properties imperatively from a useEffect (2026-08-27 fix — was
// the actual cause of "the screen flashes on load" for anyone not on Bloom).
// An effect never runs during SSR and doesn't run before the browser's
// first paint on the client either, so :root's hardcoded light-Bloom
// fallback (see globals.css's own comment on it) painted first on EVERY
// load, then the whole page's colors snapped to the real theme a moment
// later — a full light-to-dark flash for any dark-theme account. A <style>
// tag is ordinary JSX: it's part of the server-rendered HTML (correct
// colors in the very first response, no JS required) and reactive on the
// client (edit `theme`/`customTheme` and it just re-renders), so this is
// strictly more correct than the old imperative version, not just faster —
// no more "clear every known var, then reapply" dance for switching
// themes live, since replacing the tag's whole text content each render
// can never leave a stale property behind the way incremental
// setProperty/removeProperty calls could.
export default function ThemeProvider({ theme = DEFAULT_THEME, customTheme = null, children }: {
  theme?: string
  /** The active palette when theme === 'custom'. Ignored otherwise. */
  customTheme?: CustomThemeSeed | null
  children: React.ReactNode
}) {
  const vars = resolveThemeVars(theme, customTheme)
  const css = `:root{${Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';')}}`

  return (
    <>
      <style>{css}</style>
      {children}
    </>
  )
}
