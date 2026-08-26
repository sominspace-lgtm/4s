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

  // Bloom — the shared world with BloomScan.
  //
  // Palette lifted from the live Bloom app rather than approximated by eye:
  // cream paper, sage, warm brown ink, and its soft botanical pastels. The
  // brief says BloomScan and 4S are two products sharing one world — this is
  // the seam where that becomes visible instead of just being asserted.
  //
  // Two things here exist only for this theme:
  //   --radius-organic   hand-drawn, slightly-uneven corners (Bloom's most
  //                      distinctive move — every card is a little wonky, so
  //                      nothing looks machine-stamped)
  //   --card-border-style  dashed, for the "pressed botanical specimen" feel
  // Every other theme leaves both unset and cards fall back to plain radii.
  bloom: {
    '--scheme': 'light',
    '--bg': '#f7f0df', '--surface': '#fffaf0', '--surface2': '#e8dfcd',
    '--border': 'rgba(91,76,59,0.20)', '--text': '#493f35',
    '--muted': 'rgba(73,63,53,0.80)', '--faint': 'rgba(91,76,59,0.09)',
    // Accents darkened from Bloom's display pastels so they clear contrast
    // on cream — the pastels themselves are decorative fills there, not text.
    '--gold': '#4f6350', '--purple': '#7a6d94', '--emerald': '#54704f',
    '--rose': '#b05c62', '--blush': '#c98f91', '--amber': '#96701f',
    '--slate': '#5d7780', '--lavender': '#7a6d94',
    '--accent-2': '#b05c62', '--shadow': 'rgba(99,78,52,0.20)',
    '--glow': 'rgba(79,99,80,0.18)', '--selection': 'rgba(79,99,80,0.15)',
    '--hover-bg': 'rgba(116,99,76,0.08)',
    '--font-display': "var(--font-lora),'Lora',Georgia,serif",
    '--font-body':    "var(--font-nunito),'Nunito Sans',sans-serif",
    '--font-mono':    "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
    '--aurora-1': 'rgba(160,140,90,0.07)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(120,140,110,0.06)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(200,180,130,0.05)', '--aurora-pos-3': 'center top',
    '--radius': '20px', '--radius-sm': '12px',
    // Three variants, cycled by :nth-of-type in globals.css, so a column of
    // cards isn't wonky in the exact same way down the page.
    '--radius-organic':   '27px 21px 26px 23px',
    '--radius-organic-b': '22px 28px 20px 26px',
    '--radius-organic-c': '25px 22px 29px 20px',
    '--card-border-style': 'dashed',
  },

  // Moonlight — deep indigo, premium minimal
  //
  // RENAMED from key `sunset` (2026-08-11) — the label was always
  // "Moonlight"; the key just never matched, which is exactly backwards from
  // a genuine Sunset theme that was added below. LEGACY_THEME_MAP carries the
  // old key forward so nobody's saved preference breaks.
  moonlight: {
    '--bg': '#06070f', '--surface': '#0f1226', '--surface2': '#1a1e3c',
    '--border': 'rgba(140,155,245,0.17)', '--text': '#edf0fc',
    '--muted': 'rgba(237,240,252,0.80)', '--faint': 'rgba(237,240,252,0.07)',
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

  // Ember — charcoal with warm amber-orange
  ember: {
    '--bg': '#0b0806', '--surface': '#1a1410', '--surface2': '#2a221a',
    '--border': 'rgba(224,140,64,0.19)', '--text': '#f5ede3',
    '--muted': 'rgba(245,237,227,0.80)', '--faint': 'rgba(245,237,227,0.07)',
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

  // Sunset — warm dark, dusky plum-to-amber
  //
  // NEW (2026-08-11). Deliberately not a repaint of Ember: Ember is charcoal
  // with orange embers (a fire palette), Sunset leans pink-purple-to-amber
  // (a sky palette) — the two should never be mistaken for each other in a
  // theme picker.
  //
  // Key is `dusk`, NOT `sunset`, even though the label is "Sunset" — the
  // string "sunset" is what old accounts have literally stored from when
  // THAT key meant today's Moonlight. normalizeTheme() checks THEMES before
  // LEGACY_THEME_MAP, so if this new theme also claimed the key "sunset", a
  // stored "sunset" would resolve straight to THIS palette and silently skip
  // the migration to Moonlight — no error, just the wrong theme. Keeping the
  // key distinct is what lets LEGACY_THEME_MAP's `sunset: 'moonlight'` entry
  // ever actually run.
  dusk: {
    '--bg': '#170b16', '--surface': '#241226', '--surface2': '#341c38',
    '--border': 'rgba(232,140,120,0.20)', '--text': '#f8ece8',
    '--muted': 'rgba(248,236,232,0.80)', '--faint': 'rgba(248,236,232,0.07)',
    '--gold': '#f0966a', '--purple': '#c8709c', '--emerald': '#6ecca0',
    '--rose': '#ec6a7e', '--blush': '#f0a888', '--amber': '#f5b45a',
    '--slate': '#a87ca0', '--lavender': '#d896b8',
    '--accent-2': '#e0567e', '--shadow': 'rgba(10,4,10,0.72)',
    '--glow': 'rgba(240,150,106,0.24)', '--selection': 'rgba(240,150,106,0.20)',
    '--hover-bg': 'rgba(232,140,120,0.075)',
    '--font-display': "var(--font-fraunces),'Fraunces',serif",
    '--font-body':    "var(--font-work-sans),'Work Sans',sans-serif",
    '--font-mono':    "var(--font-jetbrains),'JetBrains Mono',monospace",
    '--aurora-1': 'rgba(240,150,106,0.13)', '--aurora-pos-1': 'bottom right',
    '--aurora-2': 'rgba(200,90,140,0.08)', '--aurora-pos-2': 'top left',
    '--aurora-3': 'rgba(245,180,90,0.05)', '--aurora-pos-3': 'center bottom',
    '--radius': '15px', '--radius-sm': '8px',
  },

  // Sage — soft green on warm off-white
  //
  // NEW (2026-08-11), the second light theme alongside Bloom. Pairs with
  // Bloom's paper feel but reads cooler/quieter — sage rather than cream,
  // ink-grey rather than warm brown.
  sage: {
    '--scheme': 'light',
    '--bg': '#f1f0e6', '--surface': '#fbfbf6', '--surface2': '#e2e2d0',
    '--border': 'rgba(60,80,58,0.18)', '--text': '#2e332c',
    '--muted': 'rgba(46,51,44,0.80)', '--faint': 'rgba(46,51,44,0.07)',
    '--gold': '#4d7a52', '--purple': '#71708e', '--emerald': '#3f7d55',
    '--rose': '#b0605c', '--blush': '#9a8a5c', '--amber': '#8a7a2c',
    '--slate': '#5c7266', '--lavender': '#7c7a9e',
    '--accent-2': '#3f7d55', '--shadow': 'rgba(50,64,48,0.20)',
    '--glow': 'rgba(77,122,82,0.14)', '--selection': 'rgba(77,122,82,0.12)',
    '--hover-bg': 'rgba(60,80,58,0.045)',
    '--font-display': "var(--font-newsreader),'Newsreader',serif",
    '--font-body':    "var(--font-nunito),'Nunito Sans',sans-serif",
    '--font-mono':    "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
    '--aurora-1': 'rgba(77,122,82,0.05)', '--aurora-pos-1': 'top right',
    '--aurora-2': 'rgba(120,140,90,0.035)', '--aurora-pos-2': 'bottom left',
    '--aurora-3': 'rgba(90,110,70,0.025)', '--aurora-pos-3': 'center top',
    '--radius': '17px', '--radius-sm': '9px',
  },

  // Obsidian — near-monochrome, stark and focused
  //
  // RENAMED from key `noir` (2026-08-11), same reasoning as Moonlight above:
  // the label was already "Obsidian".
  obsidian: {
    '--bg': '#030304', '--surface': '#0d0d10', '--surface2': '#18181c',
    '--border': 'rgba(255,255,255,0.14)', '--text': '#f4f4f6',
    '--muted': 'rgba(244,244,246,0.76)', '--faint': 'rgba(244,244,246,0.06)',
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

}

export const THEME_LABELS: Record<string, string> = {
  bloom: 'Bloom', moonlight: 'Moonlight', dusk: 'Sunset',
  obsidian: 'Obsidian', ember: 'Ember', sage: 'Sage',
}

// --danger, added 2026-08-21 — three components already referenced it with a
// hardcoded #c0554d fallback (var(--danger, #c0554d)) because it was never
// actually in ALL_VARS or any theme, so that fallback was silently the only
// value that ever rendered. Mapped to each theme's own --rose, which is
// already that theme's "something's wrong" red.
for (const t of Object.values(THEMES)) t['--danger'] = t['--rose']

// Cut from 13 to 6 (2026-08-07), then re-cut to a different 6 (2026-08-11):
// Bloom, Moonlight, Sunset, Obsidian, Ember, Sage. Same reasoning both times
// — enough range for every mood without asking a new user to compare a dozen
// near-identical dark palettes at the one moment they should be experiencing
// the product, not deciding about it.
//
// Every entry below must point at a key that still exists in THEMES. This is
// the actual migration mechanism — normalizeTheme() checks THEMES first and
// falls back to this map, so a wrong or dangling target here means a real
// account silently lands on the default (or errors) instead of migrating.
// The two 2026-08-11 renames (old `sunset`→`moonlight`, `noir`→`obsidian`)
// are entries too, not just the fully-retired themes.
export const LEGACY_THEME_MAP: Record<string, string> = {
  // Renamed keys, not retired palettes — the account's stored value is exact,
  // it just needs to point at the same palette's new key.
  sunset: 'moonlight',  // old key for what was always labeled "Moonlight"
  noir: 'obsidian',     // old key for what was always labeled "Obsidian"

  // Genuinely retired (2026-08-07 cut), targets re-picked 2026-08-11 since
  // their original targets (plum, sunset-the-old-moonlight, ash) no longer
  // exist under those names.
  rose: 'dusk',         // dark warm jewel-tone family → Sunset
  lavender: 'moonlight', // dark purple family → Moonlight's indigo/purple
  forest: 'moonlight',   // dark neutral calm
  ocean: 'moonlight',    // dark neutral blue
  aurora: 'moonlight',   // dark neutral premium multi-tone
  sand: 'ember',         // dark warm coffee/amber family — unchanged, still valid
  sakura: 'bloom',       // light warm/gentle → Bloom's cream, not Sage's green

  // Retired 2026-08-11.
  plum: 'dusk',    // dark violet/jewel-tone → Sunset's pink-purple
  ash: 'sage',     // light, minimal, paper-adjacent → Sage
  solar: 'sage',   // bright light → Sage (Bloom is warmer/cream; Sage is the cooler light option)
}

// Bloom is the default (2026-08-07) — 4S and BloomScan are meant to read as
// one world, and the cream/sage paper feel is that world's look. Only
// affects accounts with no stored theme: anyone who has ever picked one
// keeps it, since a stored value short-circuits the fallback below.
export const DEFAULT_THEME = 'bloom'

export function normalizeTheme(raw: string | null | undefined): string {
  // 'custom' isn't a THEMES key — it's a distinct third option alongside "a
  // preset" and "nothing set", so it has to be recognised before the THEMES
  // lookup below or it falls straight through to DEFAULT_THEME. Blocker #1
  // from the 2026-08-21 customization work: this function used to return
  // DEFAULT_THEME for literally any unknown string, silently discarding a
  // real account's choice to go custom.
  if (raw === 'custom') return 'custom'
  if (raw && raw in THEMES) return raw
  if (raw && raw in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[raw]
  return DEFAULT_THEME
}

// Custom themes (2026-08-21) — "make everything completely customizable
// instead of themes". A full 36-variable editor would work against the
// product's own "calm premium" standard — most combinations of 36 free
// colors look like nothing a person would choose on purpose. So the surface
// is six colors and a font pairing; everything else (surface2, borders,
// muted text, hover states, glow, the three aurora washes) is DERIVED from
// those six via CSS color-mix() at the string level, so a browser evaluates
// the actual blending — no color-math library needed, and the relationships
// between tokens (e.g. surface2 is always "a bit more text mixed into bg")
// stay the same ones the 6 hand-tuned presets already use.
export interface CustomThemeSeed {
  scheme: 'light' | 'dark'
  bg: string
  text: string
  accent: string   // → --gold, the theme's signature color
  rose: string
  emerald: string
  amber: string
  fontPreset: string
}

export const DEFAULT_CUSTOM_SEED: CustomThemeSeed = {
  scheme: 'dark', bg: '#0f1226', text: '#edf0fc',
  accent: '#8b9dff', rose: '#ff8080', emerald: '#5fd9bd', amber: '#f5c876',
  fontPreset: 'elegant',
}

// Light/Dark + accent (2026-08-21) — "instead of themes, a light and dark
// mode where we can choose the accent color". These are the same custom-seed
// mechanism as DEFAULT_CUSTOM_SEED, just with bg/text/rose/emerald/amber
// fixed to a calm neutral per scheme so the ONLY decision left is accent —
// the picker's simple mode only ever changes `accent` on top of one of
// these two. Fully-custom (all six colors) is still there for anyone who
// wants deeper control, one level down.
export const NEUTRAL_LIGHT: Omit<CustomThemeSeed, 'accent'> = {
  scheme: 'light', bg: '#f3f2ee', text: '#2b2a27',
  rose: '#b0605c', emerald: '#3f7d55', amber: '#8a7a2c',
  fontPreset: 'botanical',
}
export const NEUTRAL_DARK: Omit<CustomThemeSeed, 'accent'> = {
  scheme: 'dark', bg: '#0d0e14', text: '#eceef4',
  rose: '#ff8080', emerald: '#5fd9bd', amber: '#f5c876',
  fontPreset: 'elegant',
}
export const DEFAULT_ACCENT = '#8b9dff'

// Each entry pairs two ALREADY-PRELOADED next/font variables (see
// app/layout.tsx) — a custom theme can pick among real fonts, not name an
// arbitrary one that was never loaded. Named by feel, not by the preset that
// happens to use them, since a custom theme isn't "secretly Moonlight".
export const FONT_PRESETS: Record<string, { label: string; display: string; body: string; mono: string }> = {
  elegant: {
    label: 'Elegant',
    display: "var(--font-cormorant),'Cormorant Garamond',serif",
    body: "var(--font-inter),'Inter',sans-serif",
    mono: "var(--font-jetbrains),'JetBrains Mono',monospace",
  },
  botanical: {
    label: 'Botanical',
    display: "var(--font-lora),'Lora',Georgia,serif",
    body: "var(--font-nunito),'Nunito Sans',sans-serif",
    mono: "var(--font-ibm-plex-mono),'IBM Plex Mono',monospace",
  },
  modern: {
    label: 'Modern',
    display: "var(--font-dm-serif),'DM Serif Display',serif",
    body: "var(--font-inter),'Inter',sans-serif",
    mono: "var(--font-jetbrains),'JetBrains Mono',monospace",
  },
  warm: {
    label: 'Warm',
    display: "var(--font-fraunces),'Fraunces',serif",
    body: "var(--font-work-sans),'Work Sans',sans-serif",
    mono: "var(--font-jetbrains),'JetBrains Mono',monospace",
  },
}

export function buildCustomVars(seed: CustomThemeSeed): Record<string, string> {
  const mix = (a: string, b: string, pct: number) => `color-mix(in srgb, ${a} ${100 - pct}%, ${b} ${pct}%)`
  const alpha = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`
  const fonts = FONT_PRESETS[seed.fontPreset] ?? FONT_PRESETS.elegant
  return {
    '--scheme': seed.scheme,
    '--bg': seed.bg,
    '--surface': mix(seed.bg, seed.text, 6),
    '--surface2': mix(seed.bg, seed.text, 12),
    '--border': alpha(seed.text, 16),
    '--text': seed.text,
    '--muted': alpha(seed.text, 80),
    '--faint': alpha(seed.text, 7),
    '--gold': seed.accent,
    '--purple': mix(seed.accent, seed.rose, 50),
    '--emerald': seed.emerald,
    '--rose': seed.rose,
    '--danger': seed.rose,
    '--blush': mix(seed.rose, seed.bg, 30),
    '--amber': seed.amber,
    '--slate': mix(seed.text, seed.accent, 30),
    '--lavender': mix(seed.accent, seed.rose, 35),
    '--accent-2': seed.rose,
    '--shadow': seed.scheme === 'light' ? alpha(seed.text, 20) : 'rgba(0,0,0,0.7)',
    '--glow': alpha(seed.accent, 24),
    '--selection': alpha(seed.accent, 18),
    '--hover-bg': alpha(seed.text, 7),
    '--font-display': fonts.display, '--font-body': fonts.body, '--font-mono': fonts.mono,
    '--aurora-1': alpha(seed.accent, 10), '--aurora-pos-1': 'top right',
    '--aurora-2': alpha(seed.rose, 7), '--aurora-pos-2': 'bottom left',
    '--aurora-3': alpha(seed.amber, 5), '--aurora-pos-3': 'center top',
    '--radius': '16px', '--radius-sm': '9px',
  }
}

// Single resolution point for "what are the actual CSS values for this
// theme id" — every caller that used to do THEMES[normalizeTheme(x)]
// directly (ThemeProvider, Village's light/dark check, the account Settings
// page) goes through this instead, so 'custom' behaves correctly everywhere
// at once rather than needing the same special case copy-pasted four times.
// Blockers #2 and (structurally) #3 from the 2026-08-21 customization work.
export function resolveThemeVars(themeId: string | null | undefined, customSeed?: CustomThemeSeed | null): Record<string, string> {
  const norm = normalizeTheme(themeId)
  if (norm === 'custom') return customSeed ? buildCustomVars(customSeed) : THEMES[DEFAULT_THEME]
  return THEMES[norm]
}
