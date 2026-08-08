// Theme data + normalization, as a plain module (no 'use client').
//
// This used to live inside components/ui/ThemeProvider.tsx, which broke
// app/dashboard/page.tsx (a Server Component) at runtime with "Attempted to
// call normalizeTheme() from the server but normalizeTheme is on the
// client" — Next.js's RSC boundary treats every export of a 'use client'
// module as a client reference, not just its React component, so a Server
// Component can render <ThemeProvider> as JSX but can never directly call a
// plain function from that same file. lib/constants/modes.ts's
// normalizeMode() never had this problem for the exact same reason: it was
// never a client module to begin with. ThemeProvider.tsx now imports THEMES
// from here and re-exports it (and THEME_LABELS) so nothing else has to
// change its import path.
//
// Each theme: colors + typography + aurora + motion accents
// VISUAL ONLY — themes never affect greetings, personality, copy, or dashboard logic.
//
// Palette philosophy (refined for a calmer, more premium feel):
//   bg       — deepest, slightly desaturated so accents sing against it
//   surface  — one elevation step up (cards)
//   surface2 — a second step (inputs, nested surfaces)
//   accent (--gold) — the theme's signature, kept sophisticated, never neon
// Dark themes use a soft ~72% muted text; light themes tune for WCAG contrast.
//
// DEPTH PASS (2026-08-07): bg→surface→surface2 used to move only ~7% in
// lightness, so a card had no visible edge against the page and everything
// read as one flat plane. Each step is roughly doubled now, borders carry
// more alpha, and the accents are more saturated — the old ones were pale
// enough that "the theme's signature" barely registered. Calm was being
// achieved by making everything faint, which isn't calm, it's washed out.
export const THEMES: Record<string, Record<string, string>> = {

  // 🌙 Moonlight — deep indigo, premium minimal
  sunset: {
    '--bg': '#06070f', '--surface': '#0f1226', '--surface2': '#1a1e3c',
    '--border': 'rgba(140,155,245,0.17)', '--text': '#edf0fc',
    '--muted': 'rgba(237,240,252,0.68)', '--faint': 'rgba(237,240,252,0.07)',
    '--gold': '#8b9dff', '--purple': '#a58bf5', '--emerald': '#5fd9bd',
    '--rose': '#ff8080', '--blush': '#aab6ff', '--amber': '#f5c876',
    '--slate': '#6d80d8', '--lavender': '#c4a8ff',
    '--accent-2': '#c9a0ff', '--shadow': 'rgba(2,3,12,0.7)',
    '--glow': 'rgba(139,157,255,0.26)', '--selection': 'rgba(139,157,255,0.22)',
    '--hover-bg': 'rgba(140,155,245,0.07)',
    '--font-display': "var(--font-cormorant),'Cormorant Garamond',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(80,90,240,0.10)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(100,60,220,0.06)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(140,100,255,0.04)', '--aurora-pos-3': '60% 20%',
    '--radius': '14px', '--radius-sm': '8px',
  },

  // 🔥 Ember — charcoal with warm amber-orange
  ember: {
    '--bg': '#0b0806', '--surface': '#1a1410', '--surface2': '#2a221a',
    '--border': 'rgba(224,140,64,0.19)', '--text': '#f5ede3',
    '--muted': 'rgba(245,237,227,0.68)', '--faint': 'rgba(245,237,227,0.07)',
    '--gold': '#f0964a', '--purple': '#c88ad8', '--emerald': '#7ac87a',
    '--rose': '#f0806f', '--blush': '#f5b478', '--amber': '#f0b83c',
    '--slate': '#a8a4bc', '--lavender': '#cc9ecc',
    '--accent-2': '#e0602c', '--shadow': 'rgba(6,4,2,0.72)',
    '--glow': 'rgba(240,150,74,0.26)', '--selection': 'rgba(240,150,74,0.20)',
    '--hover-bg': 'rgba(224,140,64,0.075)',
    '--font-display': "var(--font-bitter),'Bitter',serif",
    '--font-body':    "var(--font-manrope),'Manrope',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(220,100,20,0.12)', '--aurora-pos-1': 'bottom right',
    '--aurora-2': 'rgba(180,140,40,0.08)', '--aurora-pos-2': 'top left',
    '--aurora-3': 'rgba(200,70,10,0.05)', '--aurora-pos-3': 'center bottom',
    '--radius': '12px', '--radius-sm': '7px',
  },

  // 📄 Linen — warm paper, minimal light mode
  ash: {
    '--scheme': 'light',
    // Light themes keep their accent hues untouched — those were picked with
    // real relative-luminance math, and re-tuning them by eye is how you get
    // a 2:1 "gold" that looked fine on dark. Only depth cues change here.
    '--bg': '#f2ede2', '--surface': '#fefdfa', '--surface2': '#e6ddcc',
    '--border': 'rgba(80,55,30,0.20)', '--text': '#2a1e12',
    '--muted': 'rgba(42,30,18,0.68)', '--faint': 'rgba(42,30,18,0.07)',
    '--gold': '#985018', '--purple': '#68408e', '--emerald': '#367040',
    '--rose': '#a03e3e', '--blush': '#a86048', '--amber': '#8c5414',
    '--slate': '#4c5c6c', '--lavender': '#6f5c8c',
    '--accent-2': '#68408e', '--shadow': 'rgba(90,62,34,0.22)',
    '--glow': 'rgba(152,80,24,0.14)', '--selection': 'rgba(152,80,24,0.12)',
    '--hover-bg': 'rgba(80,55,30,0.045)',
    '--font-display': "var(--font-libre-baskerville),'Libre Baskerville',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(160,90,30,0.05)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(120,60,20,0.035)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(180,110,40,0.025)', '--aurora-pos-3': 'center top',
    '--radius': '18px', '--radius-sm': '10px',
  },

  // 🍇 Plum — dark violet, creative and expressive
  plum: {
    '--bg': '#0a0410', '--surface': '#170a25', '--surface2': '#241338',
    '--border': 'rgba(168,96,224,0.19)', '--text': '#f0e8f8',
    '--muted': 'rgba(240,232,248,0.68)', '--faint': 'rgba(240,232,248,0.07)',
    '--gold': '#cc6ff5', '--purple': '#ae5cd0', '--emerald': '#5fd8a4',
    '--rose': '#f55fa8', '--blush': '#e88ce8', '--amber': '#d0a0f0',
    '--slate': '#9060b4', '--lavender': '#cc8cf0',
    '--accent-2': '#f55fa8', '--shadow': 'rgba(6,2,12,0.72)',
    '--glow': 'rgba(204,111,245,0.26)', '--selection': 'rgba(204,111,245,0.20)',
    '--hover-bg': 'rgba(168,96,224,0.075)',
    '--font-display': "var(--font-playfair),'Playfair Display',serif",
    '--font-body':    "var(--font-plus-jakarta),'Plus Jakarta Sans',sans-serif",
    '--font-mono':    "var(--font-fira),'Fira Code',monospace",
    '--aurora-1': 'rgba(160,40,220,0.13)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(220,60,160,0.08)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(200,60,240,0.05)', '--aurora-pos-3': '70% 30%',
    '--radius': '15px', '--radius-sm': '8px',
  },

  // ⚫ Obsidian — near-monochrome, stark and focused
  noir: {
    '--bg': '#030304', '--surface': '#0d0d10', '--surface2': '#18181c',
    '--border': 'rgba(255,255,255,0.14)', '--text': '#f4f4f6',
    '--muted': 'rgba(244,244,246,0.64)', '--faint': 'rgba(244,244,246,0.06)',
    '--gold': '#e8e8ec', '--purple': '#9494b4', '--emerald': '#74d274',
    '--rose': '#e27474', '--blush': '#f0f0f4', '--amber': '#d2b464',
    '--slate': '#7c7ca4', '--lavender': '#c4c4dc',
    '--accent-2': '#a4a4b4', '--shadow': 'rgba(0,0,0,0.78)',
    '--glow': 'rgba(232,232,236,0.13)', '--selection': 'rgba(232,232,236,0.10)',
    '--hover-bg': 'rgba(255,255,255,0.045)',
    '--font-display': "var(--font-dm-serif),'DM Serif Display',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(255,255,255,0.022)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(200,200,220,0.014)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(150,150,180,0.010)', '--aurora-pos-3': 'center',
    '--radius': '10px', '--radius-sm': '6px',
  },

  // ☀️ Solar — bright premium light theme, sunlit cream and sky
  solar: {
    '--scheme': 'light',
    '--bg': '#f8f2e2', '--surface': '#ffffff', '--surface2': '#eee6cc',
    '--border': 'rgba(150,120,30,0.22)', '--text': '#1c2338',
    '--muted': 'rgba(28,35,56,0.68)', '--faint': 'rgba(28,35,56,0.07)',
    '--gold': '#8a600e', '--purple': '#5868ae', '--emerald': '#367e5e',
    '--rose': '#be464e', '--blush': '#386ea6', '--amber': '#88660c',
    '--slate': '#4676ae', '--lavender': '#48569e',
    '--accent-2': '#2a6896', '--shadow': 'rgba(120,95,40,0.24)',
    '--glow': 'rgba(138,96,14,0.16)', '--selection': 'rgba(138,96,14,0.12)',
    '--hover-bg': 'rgba(150,120,30,0.045)',
    '--font-display': "var(--font-libre-baskerville),'Libre Baskerville',serif",
    '--font-body':    "var(--font-manrope),'Manrope',sans-serif",
    '--font-mono':    "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
    '--aurora-1': 'rgba(220,180,40,0.09)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(80,140,200,0.05)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(240,210,120,0.045)', '--aurora-pos-3': 'center top',
    '--radius': '13px', '--radius-sm': '7px',
  },
}

export const THEME_LABELS: Record<string, string> = {
  sunset: 'Moonlight', ember: 'Ember', plum: 'Plum',
  noir: 'Obsidian', ash: 'Linen', solar: 'Solar',
}

// Cut from 13 to 6 (2026-08-07): two dark neutral (Moonlight, Obsidian), two
// dark warm (Ember, Plum), two light (Linen, Solar) — enough range for every
// mood without asking a new user to compare thirteen near-identical dark
// palettes at the one moment they should be experiencing the product, not
// deciding about it. Retired themes remap to their nearest surviving
// relative below, same pattern as the Guides 9→5 consolidation — applied at
// read time via normalizeTheme(), so nobody's saved preference breaks.
export const LEGACY_THEME_MAP: Record<string, string> = {
  rose: 'plum',       // dark warm jewel-tone family
  lavender: 'plum',   // dark purple family
  forest: 'sunset',   // dark neutral calm
  ocean: 'sunset',    // dark neutral blue
  aurora: 'sunset',   // dark neutral premium multi-tone
  sand: 'ember',      // dark warm coffee/amber family
  sakura: 'ash',      // light warm/gentle
}

export function normalizeTheme(raw: string | null | undefined): string {
  if (raw && raw in THEMES) return raw
  if (raw && raw in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[raw]
  return 'sunset'
}
