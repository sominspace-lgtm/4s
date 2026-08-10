'use client'

import { useEffect } from 'react'
import { THEMES, normalizeTheme, DEFAULT_THEME } from '@/lib/constants/themes'

// Theme data + normalizeTheme() live in lib/constants/themes.ts (a plain
// module) — see the comment there for why: a Server Component can render
// this file's default export as JSX, but it can never directly call one of
// this file's other exports, because 'use client' marks every export of a
// module as a client reference, not just the component. Re-exported here so
// nothing that already imports THEMES/THEME_LABELS from '@/components/ui/
// ThemeProvider' has to change.
export { THEMES, THEME_LABELS, LEGACY_THEME_MAP, normalizeTheme, DEFAULT_THEME } from '@/lib/constants/themes'

const ALL_VARS = [
  '--scheme',
  '--bg','--surface','--surface2','--border','--text','--muted','--faint',
  '--gold','--purple','--emerald','--rose','--blush','--amber','--slate','--lavender',
  '--accent-2','--shadow','--glow','--selection','--hover-bg',
  '--font-display','--font-body','--font-mono',
  '--aurora-1','--aurora-2','--aurora-3','--aurora-pos-1','--aurora-pos-2','--aurora-pos-3',
  '--radius','--radius-sm',
  '--radius-organic','--radius-organic-b','--radius-organic-c','--card-border-style',
]

export default function ThemeProvider({ theme = DEFAULT_THEME, children }: { theme?: string; children: React.ReactNode }) {
  useEffect(() => {
    const vars = THEMES[normalizeTheme(theme)]
    const root = document.documentElement
    ALL_VARS.forEach(k => root.style.removeProperty(k))
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  }, [theme])

  return <>{children}</>
}
