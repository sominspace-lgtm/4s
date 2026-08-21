'use client'

import { useEffect } from 'react'
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

const ALL_VARS = [
  '--scheme',
  '--bg','--surface','--surface2','--border','--text','--muted','--faint',
  '--gold','--purple','--emerald','--rose','--danger','--blush','--amber','--slate','--lavender',
  '--accent-2','--shadow','--glow','--selection','--hover-bg',
  '--font-display','--font-body','--font-mono',
  '--aurora-1','--aurora-2','--aurora-3','--aurora-pos-1','--aurora-pos-2','--aurora-pos-3',
  '--radius','--radius-sm',
  '--radius-organic','--radius-organic-b','--radius-organic-c','--card-border-style',
]

export default function ThemeProvider({ theme = DEFAULT_THEME, customTheme = null, children }: {
  theme?: string
  /** The active palette when theme === 'custom'. Ignored otherwise. */
  customTheme?: CustomThemeSeed | null
  children: React.ReactNode
}) {
  useEffect(() => {
    const vars = resolveThemeVars(theme, customTheme)
    const root = document.documentElement
    ALL_VARS.forEach(k => root.style.removeProperty(k))
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  }, [theme, customTheme])

  return <>{children}</>
}
