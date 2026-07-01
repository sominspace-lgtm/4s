'use client'

import { useEffect } from 'react'

// Each theme: colors + font pairing + aurora atmosphere
export const THEMES: Record<string, Record<string, string>> = {
  sunset: {
    // Default colors from globals.css — romantic editorial
    '--font-display': "var(--font-cormorant),'Cormorant Garamond',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(200,60,130,0.10)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(160,40,120,0.08)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(230,100,160,0.05)', '--aurora-pos-3': 'center top',
  },
  midnight: {
    '--bg': '#080c14', '--surface': '#0d1220', '--surface2': '#121828',
    '--border': 'rgba(120,160,255,0.09)', '--text': '#e8eef8',
    '--muted': 'rgba(232,238,248,0.45)', '--faint': 'rgba(232,238,248,0.1)',
    '--gold': '#90b8f0', '--purple': '#7890d8', '--emerald': '#60a8c8',
    '--rose': '#6090d8', '--blush': '#90a8e8', '--amber': '#78a0d0',
    '--slate': '#8090c8', '--lavender': '#90a0e0',
    // Technical monospace — precise, focused
    '--font-display': "var(--font-space-mono),'Space Mono',monospace",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(40,90,255,0.10)', '--aurora-pos-1': 'top left',
    '--aurora-2': 'rgba(60,40,200,0.07)', '--aurora-pos-2': 'bottom right',
    '--aurora-3': 'rgba(80,140,255,0.04)', '--aurora-pos-3': '70% 20%',
  },
  sage: {
    '--bg': '#09100d', '--surface': '#0f1a14', '--surface2': '#14211a',
    '--border': 'rgba(120,200,150,0.09)', '--text': '#e8f2ec',
    '--muted': 'rgba(232,242,236,0.45)', '--faint': 'rgba(232,242,236,0.1)',
    '--gold': '#90d8a8', '--purple': '#78c090', '--emerald': '#60c878',
    '--rose': '#80d898', '--blush': '#a0d8b0', '--amber': '#b0d890',
    '--slate': '#78c8a0', '--lavender': '#90d0a8',
    // Natural, grounded
    '--font-display': "var(--font-dm-serif),'DM Serif Display',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(40,180,100,0.08)', '--aurora-pos-1': 'bottom left',
    '--aurora-2': 'rgba(60,160,80,0.06)',  '--aurora-pos-2': 'top right',
    '--aurora-3': 'rgba(80,200,120,0.04)', '--aurora-pos-3': 'center bottom',
  },
  terracotta: {
    '--bg': '#110c08', '--surface': '#1c1208', '--surface2': '#231710',
    '--border': 'rgba(220,140,90,0.09)', '--text': '#f5ede8',
    '--muted': 'rgba(245,237,232,0.45)', '--faint': 'rgba(245,237,232,0.1)',
    '--gold': '#e8a878', '--purple': '#d08060', '--emerald': '#c87850',
    '--rose': '#d06848', '--blush': '#e8a890', '--amber': '#e09060',
    '--slate': '#c88870', '--lavender': '#d89078',
    // Earthy editorial
    '--font-display': "var(--font-playfair),'Playfair Display',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(200,100,40,0.10)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(180,80,30,0.07)',  '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(220,120,50,0.04)', '--aurora-pos-3': 'center',
  },
  ocean: {
    '--bg': '#050d14', '--surface': '#091420', '--surface2': '#0e1d2c',
    '--border': 'rgba(60,180,220,0.1)', '--text': '#e0f0f8',
    '--muted': 'rgba(224,240,248,0.45)', '--faint': 'rgba(224,240,248,0.08)',
    '--gold': '#60d0e8', '--purple': '#50a8d8', '--emerald': '#40c8b8',
    '--rose': '#5890c8', '--blush': '#80b8e0', '--amber': '#70b8d8',
    '--slate': '#5098c0', '--lavender': '#70a8d8',
    // Clean, flowing
    '--font-display': "var(--font-dm-serif),'DM Serif Display',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(20,140,220,0.12)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(20,100,200,0.08)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(40,180,220,0.05)', '--aurora-pos-3': '80% top',
  },
  rose: {
    '--bg': '#120810', '--surface': '#1e0f1a', '--surface2': '#271420',
    '--border': 'rgba(240,100,160,0.1)', '--text': '#f8e8f2',
    '--muted': 'rgba(248,232,242,0.45)', '--faint': 'rgba(248,232,242,0.08)',
    '--gold': '#f090c0', '--purple': '#d870a8', '--emerald': '#e060b0',
    '--rose': '#f05090', '--blush': '#f8a0cc', '--amber': '#e880b8',
    '--slate': '#d060a0', '--lavender': '#e890c8',
    // Soft romantic
    '--font-display': "var(--font-cormorant),'Cormorant Garamond',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(240,80,160,0.12)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(200,60,130,0.08)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(255,100,180,0.05)', '--aurora-pos-3': '50% 20%',
  },
  ash: {
    '--bg': '#0c0c0e', '--surface': '#141416', '--surface2': '#1c1c20',
    '--border': 'rgba(200,200,220,0.08)', '--text': '#e8e8ee',
    '--muted': 'rgba(232,232,238,0.4)', '--faint': 'rgba(232,232,238,0.07)',
    '--gold': '#c0c0d0', '--purple': '#a0a0c0', '--emerald': '#90a0b8',
    '--rose': '#b0a8c8', '--blush': '#c8c0d8', '--amber': '#b8b0c8',
    '--slate': '#9898b8', '--lavender': '#b0a8d0',
    // Stark minimal monospace
    '--font-display': "var(--font-space-mono),'Space Mono',monospace",
    '--font-body':    "var(--font-space-mono),'Space Mono',monospace",
    '--aurora-1': 'rgba(180,180,220,0.05)', '--aurora-pos-1': 'top left',
    '--aurora-2': 'rgba(140,140,180,0.03)', '--aurora-pos-2': 'bottom right',
    '--aurora-3': 'rgba(160,160,200,0.02)', '--aurora-pos-3': 'center',
  },
  amber: {
    '--bg': '#100e06', '--surface': '#1c1808', '--surface2': '#251f0a',
    '--border': 'rgba(220,180,60,0.1)', '--text': '#f8f0d8',
    '--muted': 'rgba(248,240,216,0.45)', '--faint': 'rgba(248,240,216,0.08)',
    '--gold': '#e8c040', '--purple': '#d0a030', '--emerald': '#c8b040',
    '--rose': '#e0a020', '--blush': '#f0d060', '--amber': '#e8b828',
    '--slate': '#c89820', '--lavender': '#d8b030',
    // Warm geometric
    '--font-display': "var(--font-raleway),'Raleway',sans-serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(220,170,20,0.10)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(180,130,10,0.07)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(240,190,40,0.04)', '--aurora-pos-3': 'center top',
  },
  forest: {
    '--bg': '#060e08', '--surface': '#0a1810', '--surface2': '#0f2018',
    '--border': 'rgba(60,180,100,0.08)', '--text': '#e0f0e4',
    '--muted': 'rgba(224,240,228,0.4)', '--faint': 'rgba(224,240,228,0.07)',
    '--gold': '#60c878', '--purple': '#48a860', '--emerald': '#40c060',
    '--rose': '#50b868', '--blush': '#80d098', '--amber': '#90c850',
    '--slate': '#48a868', '--lavender': '#70b880',
    // Grounded editorial
    '--font-display': "var(--font-dm-serif),'DM Serif Display',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(30,160,70,0.09)',  '--aurora-pos-1': 'bottom left',
    '--aurora-2': 'rgba(20,120,50,0.06)',  '--aurora-pos-2': 'top right',
    '--aurora-3': 'rgba(60,180,90,0.04)',  '--aurora-pos-3': '20% 80%',
  },
  lavender: {
    '--bg': '#0c0812', '--surface': '#160f20', '--surface2': '#1e1530',
    '--border': 'rgba(160,120,240,0.1)', '--text': '#ede8f8',
    '--muted': 'rgba(237,232,248,0.45)', '--faint': 'rgba(237,232,248,0.08)',
    '--gold': '#c0a0f0', '--purple': '#a880e0', '--emerald': '#9070d8',
    '--rose': '#b890e8', '--blush': '#d0b8f8', '--amber': '#b8a0e0',
    '--slate': '#9880d0', '--lavender': '#c0a8f0',
    // Dreamy editorial
    '--font-display': "var(--font-playfair),'Playfair Display',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(140,80,240,0.10)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(100,60,200,0.08)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(180,120,255,0.05)', '--aurora-pos-3': '60% 10%',
  },
  noir: {
    '--bg': '#050505', '--surface': '#0a0a0a', '--surface2': '#111111',
    '--border': 'rgba(255,255,255,0.07)', '--text': '#f0f0f0',
    '--muted': 'rgba(240,240,240,0.4)', '--faint': 'rgba(240,240,240,0.06)',
    '--gold': '#e0e0e0', '--purple': '#c0c0c0', '--emerald': '#a8a8a8',
    '--rose': '#d0d0d0', '--blush': '#e8e8e8', '--amber': '#c8c8c8',
    '--slate': '#b0b0b0', '--lavender': '#d8d8d8',
    // Pure monospace — stark, no color
    '--font-display': "var(--font-space-mono),'Space Mono',monospace",
    '--font-body':    "var(--font-space-mono),'Space Mono',monospace",
    '--aurora-1': 'rgba(255,255,255,0.02)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(255,255,255,0.01)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(255,255,255,0.01)', '--aurora-pos-3': 'center',
  },
  sand: {
    '--bg': '#14120e', '--surface': '#1e1c16', '--surface2': '#28261e',
    '--border': 'rgba(210,195,160,0.1)', '--text': '#f5f0e8',
    '--muted': 'rgba(245,240,232,0.45)', '--faint': 'rgba(245,240,232,0.08)',
    '--gold': '#d4b880', '--purple': '#b89860', '--emerald': '#a89050',
    '--rose': '#c8a870', '--blush': '#e0c898', '--amber': '#d4b060',
    '--slate': '#b09858', '--lavender': '#c8b078',
    // Classic warm serif
    '--font-display': "var(--font-playfair),'Playfair Display',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(200,170,100,0.08)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(160,130,70,0.06)',  '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(220,190,120,0.04)', '--aurora-pos-3': 'center top',
  },
  ember: {
    '--bg': '#100600', '--surface': '#1c0a00', '--surface2': '#280e00',
    '--border': 'rgba(240,80,20,0.1)', '--text': '#f8ede8',
    '--muted': 'rgba(248,237,232,0.45)', '--faint': 'rgba(248,237,232,0.08)',
    '--gold': '#f06030', '--purple': '#d84020', '--emerald': '#e05018',
    '--rose': '#f04010', '--blush': '#f88050', '--amber': '#e87030',
    '--slate': '#c84010', '--lavender': '#e06040',
    // Bold geometric — energy
    '--font-display': "var(--font-raleway),'Raleway',sans-serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(240,60,10,0.14)', '--aurora-pos-1': 'bottom right',
    '--aurora-2': 'rgba(200,40,5,0.10)',  '--aurora-pos-2': 'top left',
    '--aurora-3': 'rgba(255,80,20,0.06)', '--aurora-pos-3': 'bottom center',
  },
  arctic: {
    '--bg': '#080e14', '--surface': '#0e1820', '--surface2': '#142030',
    '--border': 'rgba(160,220,240,0.1)', '--text': '#e8f4f8',
    '--muted': 'rgba(232,244,248,0.45)', '--faint': 'rgba(232,244,248,0.08)',
    '--gold': '#a0d8f0', '--purple': '#80c0e8', '--emerald': '#70d8e8',
    '--rose': '#90c8e8', '--blush': '#b8e0f8', '--amber': '#a0cce8',
    '--slate': '#78b8e0', '--lavender': '#a8cce8',
    // Crisp, clean
    '--font-display': "var(--font-dm-serif),'DM Serif Display',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(140,220,255,0.10)', '--aurora-pos-1': 'top center',
    '--aurora-2': 'rgba(100,190,240,0.07)', '--aurora-pos-2': 'top right',
    '--aurora-3': 'rgba(160,230,255,0.04)', '--aurora-pos-3': '30% top',
  },
  plum: {
    '--bg': '#0e0610', '--surface': '#180a1e', '--surface2': '#220e2a',
    '--border': 'rgba(180,80,200,0.1)', '--text': '#f0e8f8',
    '--muted': 'rgba(240,232,248,0.45)', '--faint': 'rgba(240,232,248,0.08)',
    '--gold': '#d060e8', '--purple': '#b040c8', '--emerald': '#c050d8',
    '--rose': '#e060d0', '--blush': '#e890e8', '--amber': '#c058c8',
    '--slate': '#a840b8', '--lavender': '#d070e0',
    // Rich dark romantic
    '--font-display': "var(--font-cormorant),'Cormorant Garamond',serif",
    '--font-body':    "var(--font-inter),'Inter',sans-serif",
    '--aurora-1': 'rgba(180,40,220,0.12)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(140,20,180,0.09)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(200,60,240,0.05)', '--aurora-pos-3': '70% 30%',
  },
}

export const THEME_LABELS: Record<string, string> = {
  sunset: 'Sunset', midnight: 'Midnight', sage: 'Sage', terracotta: 'Terracotta',
  ocean: 'Ocean', rose: 'Rose', ash: 'Ash', amber: 'Amber', forest: 'Forest',
  lavender: 'Lavender', noir: 'Noir', sand: 'Sand', ember: 'Ember',
  arctic: 'Arctic', plum: 'Plum',
}

const ALL_VARS = [
  '--bg','--surface','--surface2','--border','--text','--muted','--faint',
  '--gold','--purple','--emerald','--rose','--blush','--amber','--slate','--lavender',
  '--font-display','--font-body',
  '--aurora-1','--aurora-2','--aurora-3','--aurora-pos-1','--aurora-pos-2','--aurora-pos-3',
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
