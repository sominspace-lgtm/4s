'use client'

import { useEffect } from 'react'

// Each theme: colors + typography + aurora + motion accents
// VISUAL ONLY — themes never affect greetings, personality, copy, or dashboard logic.
export const THEMES: Record<string, Record<string, string>> = {

  // 🌙 Moonlight — deep indigo, premium minimal
  sunset: {
    '--bg': '#080a18', '--surface': '#0e1028', '--surface2': '#141638',
    '--border': 'rgba(120,130,240,0.11)', '--text': '#eaebfc',
    '--muted': 'rgba(234,235,252,0.72)', '--faint': 'rgba(234,235,252,0.07)',
    '--gold': '#8fa0f0', '--purple': '#a090e8', '--emerald': '#7ad4c0',
    '--rose': '#f08080', '--blush': '#b0b8f8', '--amber': '#eac070',
    '--slate': '#7080c8', '--lavender': '#c0a8ff',
    '--accent-2': '#c8a8ff', '--shadow': 'rgba(8,10,32,0.65)',
    '--glow': 'rgba(143,160,240,0.22)', '--selection': 'rgba(143,160,240,0.20)',
    '--hover-bg': 'rgba(120,130,240,0.06)',
    '--font-display': "var(--font-cormorant),'Cormorant Garamond',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(80,90,240,0.12)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(100,60,220,0.08)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(140,100,255,0.05)', '--aurora-pos-3': '60% 20%',
    '--radius': '14px', '--radius-sm': '8px',
  },

  // 🌸 Rose — soft plum and pink, elegant
  rose: {
    '--bg': '#130810', '--surface': '#1e0e1c', '--surface2': '#291428',
    '--border': 'rgba(220,100,160,0.12)', '--text': '#f8e8f4',
    '--muted': 'rgba(248,232,244,0.72)', '--faint': 'rgba(248,232,244,0.07)',
    '--gold': '#e888c8', '--purple': '#d060c0', '--emerald': '#a0d8a0',
    '--rose': '#f06090', '--blush': '#f0b0d8', '--amber': '#e8a080',
    '--slate': '#b080b8', '--lavender': '#e090d0',
    '--accent-2': '#b870d0', '--shadow': 'rgba(20,8,18,0.65)',
    '--glow': 'rgba(232,136,200,0.22)', '--selection': 'rgba(232,136,200,0.18)',
    '--hover-bg': 'rgba(220,100,160,0.06)',
    '--font-display': "var(--font-cormorant),'Cormorant Garamond',serif",
    '--font-body':    "var(--font-instrument),'Instrument Sans',sans-serif",
    '--font-mono':    "var(--font-fira),'Fira Code',monospace",
    '--aurora-1': 'rgba(220,80,160,0.12)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(160,50,130,0.08)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(240,100,180,0.05)', '--aurora-pos-3': '50% 20%',
    '--radius': '16px', '--radius-sm': '9px',
  },

  // 🌿 Forest — evergreen, calm and grounded
  forest: {
    '--bg': '#050e08', '--surface': '#091510', '--surface2': '#0e1d16',
    '--border': 'rgba(60,180,100,0.10)', '--text': '#e0f2e8',
    '--muted': 'rgba(224,242,232,0.72)', '--faint': 'rgba(224,242,232,0.07)',
    '--gold': '#58c880', '--purple': '#70b890', '--emerald': '#40c878',
    '--rose': '#d08870', '--blush': '#80d0a0', '--amber': '#c8b060',
    '--slate': '#50a870', '--lavender': '#90c8a0',
    '--accent-2': '#90c840', '--shadow': 'rgba(4,14,8,0.65)',
    '--glow': 'rgba(88,200,128,0.20)', '--selection': 'rgba(88,200,128,0.16)',
    '--hover-bg': 'rgba(60,180,100,0.05)',
    '--font-display': "var(--font-lora),'Lora',serif",
    '--font-body':    "var(--font-source-sans),'Source Sans 3',sans-serif",
    '--font-mono':    "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
    '--aurora-1': 'rgba(30,160,70,0.10)', '--aurora-pos-1': 'bottom left',
    '--aurora-2': 'rgba(60,120,40,0.07)', '--aurora-pos-2': 'top right',
    '--aurora-3': 'rgba(100,200,80,0.04)', '--aurora-pos-3': '20% 80%',
    '--radius': '13px', '--radius-sm': '7px',
  },

  // 🌊 Ocean — slate blue, clean and flowing
  ocean: {
    '--bg': '#040c14', '--surface': '#081420', '--surface2': '#0c1e30',
    '--border': 'rgba(60,160,220,0.12)', '--text': '#e0f0f8',
    '--muted': 'rgba(224,240,248,0.72)', '--faint': 'rgba(224,240,248,0.07)',
    '--gold': '#50c8e8', '--purple': '#70a0d8', '--emerald': '#40d0b0',
    '--rose': '#e08890', '--blush': '#80d8f0', '--amber': '#d0c060',
    '--slate': '#5080b8', '--lavender': '#90b0e0',
    '--accent-2': '#6090d0', '--shadow': 'rgba(4,12,20,0.65)',
    '--glow': 'rgba(80,200,232,0.20)', '--selection': 'rgba(80,200,232,0.16)',
    '--hover-bg': 'rgba(60,160,220,0.06)',
    '--font-display': "var(--font-fraunces),'Fraunces',serif",
    '--font-body':    "var(--font-ibm-plex-sans),'IBM Plex Sans',sans-serif",
    '--font-mono':    "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
    '--aurora-1': 'rgba(30,140,220,0.14)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(20,100,200,0.09)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(50,180,240,0.05)', '--aurora-pos-3': '80% top',
    '--radius': '12px', '--radius-sm': '7px',
  },

  // 🔥 Ember — charcoal with warm amber-orange
  ember: {
    '--bg': '#0e0b08', '--surface': '#181410', '--surface2': '#221e18',
    '--border': 'rgba(220,130,50,0.12)', '--text': '#f5ede4',
    '--muted': 'rgba(245,237,228,0.72)', '--faint': 'rgba(245,237,228,0.07)',
    '--gold': '#e09040', '--purple': '#c090d0', '--emerald': '#80c080',
    '--rose': '#e08070', '--blush': '#f0b080', '--amber': '#e0b040',
    '--slate': '#a0a0b0', '--lavender': '#c0a0c0',
    '--accent-2': '#d06030', '--shadow': 'rgba(14,11,8,0.65)',
    '--glow': 'rgba(224,144,64,0.22)', '--selection': 'rgba(224,144,64,0.16)',
    '--hover-bg': 'rgba(220,130,50,0.06)',
    '--font-display': "var(--font-bitter),'Bitter',serif",
    '--font-body':    "var(--font-manrope),'Manrope',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(220,100,20,0.14)', '--aurora-pos-1': 'bottom right',
    '--aurora-2': 'rgba(180,140,40,0.09)', '--aurora-pos-2': 'top left',
    '--aurora-3': 'rgba(200,70,10,0.06)', '--aurora-pos-3': 'center bottom',
    '--radius': '12px', '--radius-sm': '7px',
  },

  // ☀️ Linen — warm paper, minimal light mode
  ash: {
    '--scheme': 'light',
    '--bg': '#f7f3ed', '--surface': '#f0ebe3', '--surface2': '#e8e2d8',
    '--border': 'rgba(80,55,30,0.10)', '--text': '#2a1e12',
    '--muted': 'rgba(42,30,18,0.72)', '--faint': 'rgba(42,30,18,0.07)',
    '--gold': '#9a5020', '--purple': '#6a4090', '--emerald': '#3a7040',
    '--rose': '#a04040', '--blush': '#c08060', '--amber': '#965c18',
    '--slate': '#506070', '--lavender': '#756090',
    '--accent-2': '#6a4090', '--shadow': 'rgba(100,70,40,0.18)',
    '--glow': 'rgba(154,80,32,0.16)', '--selection': 'rgba(154,80,32,0.12)',
    '--hover-bg': 'rgba(80,55,30,0.04)',
    '--font-display': "var(--font-libre-baskerville),'Libre Baskerville',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(160,90,30,0.06)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(120,60,20,0.04)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(180,110,40,0.03)', '--aurora-pos-3': 'center top',
    '--radius': '18px', '--radius-sm': '10px',
  },

  // 🟤 Sand — muted beige, coffee shop warmth
  sand: {
    '--bg': '#13110d', '--surface': '#1d1a15', '--surface2': '#27241e',
    '--border': 'rgba(210,185,140,0.10)', '--text': '#f2ede4',
    '--muted': 'rgba(242,237,228,0.72)', '--faint': 'rgba(242,237,228,0.07)',
    '--gold': '#c4a05a', '--purple': '#a888b0', '--emerald': '#80a870',
    '--rose': '#c08070', '--blush': '#d8b880', '--amber': '#c0a040',
    '--slate': '#9898a8', '--lavender': '#c0a8b8',
    '--accent-2': '#8a6840', '--shadow': 'rgba(18,15,10,0.65)',
    '--glow': 'rgba(196,160,90,0.20)', '--selection': 'rgba(196,160,90,0.16)',
    '--hover-bg': 'rgba(210,185,140,0.06)',
    '--font-display': "var(--font-spectral),'Spectral',serif",
    '--font-body':    "var(--font-work-sans),'Work Sans',sans-serif",
    '--font-mono':    "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
    '--aurora-1': 'rgba(200,165,90,0.08)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(160,125,60,0.06)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(220,190,120,0.04)', '--aurora-pos-3': 'center top',
    '--radius': '17px', '--radius-sm': '9px',
  },

  // 🍇 Plum — dark violet, creative and expressive
  plum: {
    '--bg': '#0c0514', '--surface': '#140a1e', '--surface2': '#1c1028',
    '--border': 'rgba(160,80,220,0.12)', '--text': '#f0e8f8',
    '--muted': 'rgba(240,232,248,0.72)', '--faint': 'rgba(240,232,248,0.07)',
    '--gold': '#c060e8', '--purple': '#a060c0', '--emerald': '#70d0a0',
    '--rose': '#e060a0', '--blush': '#e090e0', '--amber': '#c0a0e0',
    '--slate': '#8060a0', '--lavender': '#c090e0',
    '--accent-2': '#e060a0', '--shadow': 'rgba(12,5,20,0.65)',
    '--glow': 'rgba(192,96,232,0.22)', '--selection': 'rgba(192,96,232,0.18)',
    '--hover-bg': 'rgba(160,80,220,0.06)',
    '--font-display': "var(--font-playfair),'Playfair Display',serif",
    '--font-body':    "var(--font-plus-jakarta),'Plus Jakarta Sans',sans-serif",
    '--font-mono':    "var(--font-fira),'Fira Code',monospace",
    '--aurora-1': 'rgba(160,40,220,0.16)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(220,60,160,0.10)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(200,60,240,0.06)', '--aurora-pos-3': '70% 30%',
    '--radius': '15px', '--radius-sm': '8px',
  },

  // ⚫ Obsidian — near-monochrome, stark and focused
  noir: {
    '--bg': '#040404', '--surface': '#0a0a0c', '--surface2': '#111114',
    '--border': 'rgba(255,255,255,0.08)', '--text': '#f4f4f6',
    '--muted': 'rgba(244,244,246,0.72)', '--faint': 'rgba(244,244,246,0.06)',
    '--gold': '#e8e8ec', '--purple': '#9090b0', '--emerald': '#70d070',
    '--rose': '#e07070', '--blush': '#f0f0f4', '--amber': '#d0b060',
    '--slate': '#7878a0', '--lavender': '#c0c0d8',
    '--accent-2': '#a0a0b0', '--shadow': 'rgba(0,0,0,0.80)',
    '--glow': 'rgba(232,232,236,0.14)', '--selection': 'rgba(232,232,236,0.10)',
    '--hover-bg': 'rgba(255,255,255,0.04)',
    '--font-display': "var(--font-dm-serif),'DM Serif Display',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(255,255,255,0.025)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(200,200,220,0.015)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(150,150,180,0.010)', '--aurora-pos-3': 'center',
    '--radius': '10px', '--radius-sm': '6px',
  },

  // 🪻 Lavender — soft purple-gray, relaxed and dreamy
  lavender: {
    '--bg': '#0d0b14', '--surface': '#15121e', '--surface2': '#1e1828',
    '--border': 'rgba(160,140,220,0.10)', '--text': '#ece8f8',
    '--muted': 'rgba(236,232,248,0.72)', '--faint': 'rgba(236,232,248,0.07)',
    '--gold': '#b0a0e0', '--purple': '#a090d0', '--emerald': '#88c8a0',
    '--rose': '#e090b0', '--blush': '#d0b8e8', '--amber': '#d0b880',
    '--slate': '#8880b8', '--lavender': '#c0b0e0',
    '--accent-2': '#e0a0d0', '--shadow': 'rgba(13,11,20,0.65)',
    '--glow': 'rgba(176,160,224,0.20)', '--selection': 'rgba(176,160,224,0.16)',
    '--hover-bg': 'rgba(160,140,220,0.05)',
    '--font-display': "var(--font-newsreader),'Newsreader',serif",
    '--font-body':    "var(--font-nunito),'Nunito Sans',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(140,100,240,0.10)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(200,120,200,0.07)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(160,120,255,0.05)', '--aurora-pos-3': '60% 10%',
    '--radius': '15px', '--radius-sm': '8px',
  },

  // 🌌 Aurora — deep teal/navy with green, cyan and violet northern-lights accents
  aurora: {
    '--bg': '#050e12', '--surface': '#081820', '--surface2': '#0c222c',
    '--border': 'rgba(80,220,180,0.12)', '--text': '#e6faf4',
    '--muted': 'rgba(230,250,244,0.72)', '--faint': 'rgba(230,250,244,0.07)',
    '--gold': '#5ce8b0', '--purple': '#9878e8', '--emerald': '#50e0a0',
    '--rose': '#e08890', '--blush': '#80e0d0', '--amber': '#e0c060',
    '--slate': '#50a8c0', '--lavender': '#a090e8',
    '--accent-2': '#48c8e0', '--shadow': 'rgba(5,14,18,0.65)',
    '--glow': 'rgba(92,232,176,0.22)', '--selection': 'rgba(92,232,176,0.18)',
    '--hover-bg': 'rgba(80,220,180,0.06)',
    '--font-display': "var(--font-newsreader),'Newsreader',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(60,220,150,0.14)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(60,160,220,0.10)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(140,90,230,0.08)', '--aurora-pos-3': '50% 30%',
    '--radius': '14px', '--radius-sm': '8px',
  },

  // 🌸 Sakura — soft pink light theme, warm and gentle
  sakura: {
    '--scheme': 'light',
    '--bg': '#fdf2f4', '--surface': '#fdf7f8', '--surface2': '#f9ebee',
    '--border': 'rgba(200,90,130,0.12)', '--text': '#3a2028',
    '--muted': 'rgba(58,32,40,0.72)', '--faint': 'rgba(58,32,40,0.07)',
    '--gold': '#a8305f', '--purple': '#8a5a90', '--emerald': '#3a7050',
    '--rose': '#c8406c', '--blush': '#b8406e', '--amber': '#a05a2c',
    '--slate': '#5a4a80', '--lavender': '#7a5a90',
    '--accent-2': '#8a5a90', '--shadow': 'rgba(180,100,130,0.16)',
    '--glow': 'rgba(168,48,95,0.18)', '--selection': 'rgba(168,48,95,0.14)',
    '--hover-bg': 'rgba(200,90,130,0.05)',
    '--font-display': "var(--font-newsreader),'Newsreader',serif",
    '--font-body':    "var(--font-nunito),'Nunito Sans',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(220,120,160,0.08)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(200,100,140,0.05)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(240,160,190,0.04)', '--aurora-pos-3': 'center top',
    '--radius': '18px', '--radius-sm': '10px',
  },

  // ☀️ Solar — bright premium light theme, sunlit cream/gold/sky
  solar: {
    '--scheme': 'light',
    '--bg': '#fdf9ee', '--surface': '#ffffff', '--surface2': '#f5efd8',
    '--border': 'rgba(180,140,20,0.14)', '--text': '#1c2338',
    '--muted': 'rgba(28,35,56,0.72)', '--faint': 'rgba(28,35,56,0.07)',
    '--gold': '#8a6010', '--purple': '#5a6ab0', '--emerald': '#3a8060',
    '--rose': '#c04850', '--blush': '#3a70a8', '--amber': '#8a680e',
    '--slate': '#4878b0', '--lavender': '#4a58a0',
    '--accent-2': '#2c6a98', '--shadow': 'rgba(180,150,60,0.20)',
    '--glow': 'rgba(138,96,16,0.18)', '--selection': 'rgba(138,96,16,0.14)',
    '--hover-bg': 'rgba(180,140,20,0.05)',
    '--font-display': "var(--font-libre-baskerville),'Libre Baskerville',serif",
    '--font-body':    "var(--font-manrope),'Manrope',sans-serif",
    '--font-mono':    "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
    '--aurora-1': 'rgba(220,180,40,0.10)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(80,140,200,0.06)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(240,210,120,0.05)', '--aurora-pos-3': 'center top',
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
