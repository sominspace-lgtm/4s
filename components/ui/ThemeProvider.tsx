'use client'

import { useEffect } from 'react'

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

  // 🌸 Rose — soft plum and pink, elegant
  rose: {
    '--bg': '#140b12', '--surface': '#1f1220', '--surface2': '#2b1a2b',
    '--border': 'rgba(224,120,176,0.11)', '--text': '#f7e9f4',
    '--muted': 'rgba(247,233,244,0.70)', '--faint': 'rgba(247,233,244,0.06)',
    '--gold': '#e592c8', '--purple': '#cf74c0', '--emerald': '#a4d6a4',
    '--rose': '#ef6f96', '--blush': '#f0b4d8', '--amber': '#e8a684',
    '--slate': '#b88cbc', '--lavender': '#e29ad2',
    '--accent-2': '#bf7cd2', '--shadow': 'rgba(16,6,14,0.55)',
    '--glow': 'rgba(229,146,200,0.20)', '--selection': 'rgba(229,146,200,0.16)',
    '--hover-bg': 'rgba(224,120,176,0.055)',
    '--font-display': "var(--font-cormorant),'Cormorant Garamond',serif",
    '--font-body':    "var(--font-instrument),'Instrument Sans',sans-serif",
    '--font-mono':    "var(--font-fira),'Fira Code',monospace",
    '--aurora-1': 'rgba(220,80,160,0.10)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(160,50,130,0.06)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(240,100,180,0.04)', '--aurora-pos-3': '50% 20%',
    '--radius': '16px', '--radius-sm': '9px',
  },

  // 🌿 Forest — evergreen, calm and grounded
  forest: {
    '--bg': '#07110a', '--surface': '#0d1912', '--surface2': '#14231a',
    '--border': 'rgba(80,190,120,0.10)', '--text': '#e2f3ea',
    '--muted': 'rgba(226,243,234,0.70)', '--faint': 'rgba(226,243,234,0.06)',
    '--gold': '#63cc8a', '--purple': '#78bd96', '--emerald': '#4bcc80',
    '--rose': '#d4917a', '--blush': '#8ad6a8', '--amber': '#ccb468',
    '--slate': '#58ac78', '--lavender': '#98cca8',
    '--accent-2': '#96cc4e', '--shadow': 'rgba(3,12,7,0.55)',
    '--glow': 'rgba(99,204,138,0.18)', '--selection': 'rgba(99,204,138,0.15)',
    '--hover-bg': 'rgba(80,190,120,0.05)',
    '--font-display': "var(--font-lora),'Lora',serif",
    '--font-body':    "var(--font-source-sans),'Source Sans 3',sans-serif",
    '--font-mono':    "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
    '--aurora-1': 'rgba(30,160,70,0.09)', '--aurora-pos-1': 'bottom left',
    '--aurora-2': 'rgba(60,120,40,0.06)', '--aurora-pos-2': 'top right',
    '--aurora-3': 'rgba(100,200,80,0.035)', '--aurora-pos-3': '20% 80%',
    '--radius': '13px', '--radius-sm': '7px',
  },

  // 🌊 Ocean — slate blue, clean and flowing
  ocean: {
    '--bg': '#050f19', '--surface': '#0a1826', '--surface2': '#102234',
    '--border': 'rgba(80,175,225,0.11)', '--text': '#e2f1f9',
    '--muted': 'rgba(226,241,249,0.70)', '--faint': 'rgba(226,241,249,0.06)',
    '--gold': '#56cae8', '--purple': '#76a4da', '--emerald': '#48d2b2',
    '--rose': '#e28d95', '--blush': '#86daf0', '--amber': '#d2c268',
    '--slate': '#5684bc', '--lavender': '#94b4e2',
    '--accent-2': '#6494d2', '--shadow': 'rgba(3,10,18,0.55)',
    '--glow': 'rgba(86,202,232,0.18)', '--selection': 'rgba(86,202,232,0.15)',
    '--hover-bg': 'rgba(80,175,225,0.055)',
    '--font-display': "var(--font-fraunces),'Fraunces',serif",
    '--font-body':    "var(--font-ibm-plex-sans),'IBM Plex Sans',sans-serif",
    '--font-mono':    "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
    '--aurora-1': 'rgba(30,140,220,0.12)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(20,100,200,0.08)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(50,180,240,0.045)', '--aurora-pos-3': '80% top',
    '--radius': '12px', '--radius-sm': '7px',
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

  // ☕ Sand — muted beige, coffee-shop warmth
  sand: {
    '--bg': '#14110c', '--surface': '#1e1a14', '--surface2': '#29251d',
    '--border': 'rgba(210,185,140,0.10)', '--text': '#f2ede4',
    '--muted': 'rgba(242,237,228,0.70)', '--faint': 'rgba(242,237,228,0.06)',
    '--gold': '#c8a563', '--purple': '#ac8cb4', '--emerald': '#84ac74',
    '--rose': '#c4847a', '--blush': '#dcbc84', '--amber': '#c4a448',
    '--slate': '#9c9cac', '--lavender': '#c4acbc',
    '--accent-2': '#8e6c44', '--shadow': 'rgba(14,11,7,0.55)',
    '--glow': 'rgba(200,165,99,0.18)', '--selection': 'rgba(200,165,99,0.15)',
    '--hover-bg': 'rgba(210,185,140,0.055)',
    '--font-display': "var(--font-spectral),'Spectral',serif",
    '--font-body':    "var(--font-work-sans),'Work Sans',sans-serif",
    '--font-mono':    "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
    '--aurora-1': 'rgba(200,165,90,0.07)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(160,125,60,0.05)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(220,190,120,0.035)', '--aurora-pos-3': 'center top',
    '--radius': '17px', '--radius-sm': '9px',
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

  // 🪻 Lavender — soft purple-gray, relaxed and dreamy
  lavender: {
    '--bg': '#0e0c15', '--surface': '#17131f', '--surface2': '#201a2b',
    '--border': 'rgba(168,148,224,0.10)', '--text': '#ece8f8',
    '--muted': 'rgba(236,232,248,0.70)', '--faint': 'rgba(236,232,248,0.06)',
    '--gold': '#b4a4e2', '--purple': '#a494d2', '--emerald': '#8ccaa4',
    '--rose': '#e294b4', '--blush': '#d4bcea', '--amber': '#d2bc84',
    '--slate': '#8c84bc', '--lavender': '#c4b4e2',
    '--accent-2': '#e2a4d2', '--shadow': 'rgba(10,8,18,0.55)',
    '--glow': 'rgba(180,164,226,0.18)', '--selection': 'rgba(180,164,226,0.15)',
    '--hover-bg': 'rgba(168,148,224,0.05)',
    '--font-display': "var(--font-newsreader),'Newsreader',serif",
    '--font-body':    "var(--font-nunito),'Nunito Sans',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(140,100,240,0.09)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(200,120,200,0.06)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(160,120,255,0.045)', '--aurora-pos-3': '60% 10%',
    '--radius': '15px', '--radius-sm': '8px',
  },

  // 🌌 Aurora — deep teal/navy with northern-lights accents
  aurora: {
    '--bg': '#061013', '--surface': '#0a1a22', '--surface2': '#10262f',
    '--border': 'rgba(92,224,184,0.11)', '--text': '#e6faf4',
    '--muted': 'rgba(230,250,244,0.70)', '--faint': 'rgba(230,250,244,0.06)',
    '--gold': '#62e6b4', '--purple': '#9c7ce8', '--emerald': '#54e2a4',
    '--rose': '#e28d95', '--blush': '#84e2d2', '--amber': '#e2c264',
    '--slate': '#54acc4', '--lavender': '#a494e8',
    '--accent-2': '#4ccae2', '--shadow': 'rgba(3,10,14,0.55)',
    '--glow': 'rgba(98,230,180,0.20)', '--selection': 'rgba(98,230,180,0.16)',
    '--hover-bg': 'rgba(92,224,184,0.055)',
    '--font-display': "var(--font-newsreader),'Newsreader',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(60,220,150,0.13)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(60,160,220,0.09)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(140,90,230,0.07)', '--aurora-pos-3': '50% 30%',
    '--radius': '14px', '--radius-sm': '8px',
  },

  // 🌸 Sakura — soft pink light theme, warm and gentle
  sakura: {
    '--scheme': 'light',
    '--bg': '#fdf3f5', '--surface': '#fffafb', '--surface2': '#f8ebee',
    '--border': 'rgba(200,90,130,0.13)', '--text': '#38202a',
    '--muted': 'rgba(56,32,42,0.66)', '--faint': 'rgba(56,32,42,0.06)',
    '--gold': '#a83060', '--purple': '#88588e', '--emerald': '#367048',
    '--rose': '#c8406c', '--blush': '#b23e6a', '--amber': '#9c5628',
    '--slate': '#56487c', '--lavender': '#78588e',
    '--accent-2': '#88588e', '--shadow': 'rgba(170,90,120,0.14)',
    '--glow': 'rgba(168,48,96,0.16)', '--selection': 'rgba(168,48,96,0.12)',
    '--hover-bg': 'rgba(200,90,130,0.045)',
    '--font-display': "var(--font-newsreader),'Newsreader',serif",
    '--font-body':    "var(--font-nunito),'Nunito Sans',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(220,120,160,0.07)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(200,100,140,0.045)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(240,160,190,0.035)', '--aurora-pos-3': 'center top',
    '--radius': '18px', '--radius-sm': '10px',
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
  sunset: 'Moonlight', rose: 'Rose', forest: 'Forest', ocean: 'Ocean',
  ember: 'Ember', ash: 'Linen', sand: 'Sand', plum: 'Plum',
  noir: 'Obsidian', lavender: 'Lavender',
  aurora: 'Aurora', sakura: 'Sakura', solar: 'Solar',
}

const ALL_VARS = [
  '--scheme',
  '--bg','--surface','--surface2','--border','--text','--muted','--faint',
  '--gold','--purple','--emerald','--rose','--blush','--amber','--slate','--lavender',
  '--accent-2','--shadow','--glow','--selection','--hover-bg',
  '--font-display','--font-body','--font-mono',
  '--aurora-1','--aurora-2','--aurora-3','--aurora-pos-1','--aurora-pos-2','--aurora-pos-3',
  '--radius','--radius-sm',
]

export default function ThemeProvider({ theme = 'sunset', children }: { theme?: string; children: React.ReactNode }) {
  useEffect(() => {
    const vars = THEMES[theme] ?? THEMES.sunset
    const root = document.documentElement
    ALL_VARS.forEach(k => root.style.removeProperty(k))
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  }, [theme])

  return <>{children}</>
}
