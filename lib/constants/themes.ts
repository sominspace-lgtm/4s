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
export const THEMES: Record<string, Record<string, string>> = {

  // 🌙 Moonlight — deep indigo, premium minimal
  sunset: {
    '--bg': '#0a0b15', '--surface': '#111324', '--surface2': '#191c30',
    '--border': 'rgba(140,155,245,0.10)', '--text': '#edf0fc',
    '--muted': 'rgba(237,240,252,0.70)', '--faint': 'rgba(237,240,252,0.06)',
    '--gold': '#94a4f4', '--purple': '#a89af0', '--emerald': '#7ed8c4',
    '--rose': '#f28a8a', '--blush': '#b4bcf8', '--amber': '#ecc888',
    '--slate': '#7a8ad0', '--lavender': '#c4b0ff',
    '--accent-2': '#c9adff', '--shadow': 'rgba(4,6,20,0.55)',
    '--glow': 'rgba(148,164,244,0.20)', '--selection': 'rgba(148,164,244,0.18)',
    '--hover-bg': 'rgba(140,155,245,0.05)',
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
    '--bg': '#100c09', '--surface': '#1b1611', '--surface2': '#26201a',
    '--border': 'rgba(224,140,64,0.11)', '--text': '#f5ede3',
    '--muted': 'rgba(245,237,227,0.70)', '--faint': 'rgba(245,237,227,0.06)',
    '--gold': '#e39653', '--purple': '#c494d2', '--emerald': '#84c284',
    '--rose': '#e2857a', '--blush': '#f0b486', '--amber': '#e3b44c',
    '--slate': '#a4a4b4', '--lavender': '#c4a4c4',
    '--accent-2': '#d4683a', '--shadow': 'rgba(10,7,4,0.55)',
    '--glow': 'rgba(227,150,83,0.20)', '--selection': 'rgba(227,150,83,0.15)',
    '--hover-bg': 'rgba(224,140,64,0.055)',
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
    '--bg': '#f6f2ea', '--surface': '#fbf8f2', '--surface2': '#ece5d9',
    '--border': 'rgba(80,55,30,0.12)', '--text': '#2a1e12',
    '--muted': 'rgba(42,30,18,0.66)', '--faint': 'rgba(42,30,18,0.06)',
    '--gold': '#985018', '--purple': '#68408e', '--emerald': '#367040',
    '--rose': '#a03e3e', '--blush': '#a86048', '--amber': '#8c5414',
    '--slate': '#4c5c6c', '--lavender': '#6f5c8c',
    '--accent-2': '#68408e', '--shadow': 'rgba(90,62,34,0.14)',
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
    '--bg': '#0e0616', '--surface': '#170b22', '--surface2': '#20122e',
    '--border': 'rgba(168,96,224,0.11)', '--text': '#f0e8f8',
    '--muted': 'rgba(240,232,248,0.70)', '--faint': 'rgba(240,232,248,0.06)',
    '--gold': '#c274e6', '--purple': '#a666c2', '--emerald': '#74d2a4',
    '--rose': '#e468a4', '--blush': '#e296e2', '--amber': '#c4a4e2',
    '--slate': '#8666a4', '--lavender': '#c496e2',
    '--accent-2': '#e468a4', '--shadow': 'rgba(10,4,18,0.55)',
    '--glow': 'rgba(194,116,230,0.20)', '--selection': 'rgba(194,116,230,0.16)',
    '--hover-bg': 'rgba(168,96,224,0.055)',
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
    '--bg': '#050506', '--surface': '#0c0c0e', '--surface2': '#141416',
    '--border': 'rgba(255,255,255,0.09)', '--text': '#f4f4f6',
    '--muted': 'rgba(244,244,246,0.66)', '--faint': 'rgba(244,244,246,0.05)',
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
    '--bg': '#fdf9ef', '--surface': '#ffffff', '--surface2': '#f4eed7',
    '--border': 'rgba(150,120,30,0.14)', '--text': '#1c2338',
    '--muted': 'rgba(28,35,56,0.66)', '--faint': 'rgba(28,35,56,0.06)',
    '--gold': '#8a600e', '--purple': '#5868ae', '--emerald': '#367e5e',
    '--rose': '#be464e', '--blush': '#386ea6', '--amber': '#88660c',
    '--slate': '#4676ae', '--lavender': '#48569e',
    '--accent-2': '#2a6896', '--shadow': 'rgba(150,120,50,0.16)',
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
