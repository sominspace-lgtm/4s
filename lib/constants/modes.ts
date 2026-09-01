// Guides — the "voice" of 4S OS. A Guide shapes tone, greetings, and how
// proactive the system is; it never touches themes (appearance)
// or data. Stored per user in user_prefs.mode for backward compatibility, so
// the TypeScript identifiers stay `Mode`/`MODES` even though the product calls
// them Guides.
//
// Three Guides (down from five, then nine, 2026-08-21): fewer, sharper
// voices beat a menu of near-duplicates. Therapist and Challenger read as
// the same underlying disposition as Friend and Executive respectively,
// just with different framing on top — reflective-and-warm vs.
// direct-and-decisive is the actual axis, and three points cover it without
// asking "who's talking to me today" to be a bigger decision than it needs
// to be. Old stored values are normalized at read time via normalizeMode(),
// so nobody's preference breaks — see LEGACY_MODE_MAP for where they land.

export type Mode = 'peaceful' | 'friend' | 'executive'

export type Proactivity = 'low' | 'medium' | 'high'

export interface ModeConfig {
  label: string
  description: string
  proactivity: Proactivity
  transform: (advice: string, verdict: string, domain: string) => string
}

export const MODES: Record<Mode, ModeConfig> = {
  peaceful: {
    label: 'Peaceful',
    // absorbed Monk: stillness, one thing at a time
    description: 'Gentle and unhurried. One thing at a time, no pressure.',
    proactivity: 'low',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return a.replace(/you need to|push|make sure|don't let/gi, 'when you\'re ready,').replace(/\.$/, '. There\'s no rush — just notice.')
      if (verdict === 'fine') return a + ' You\'re doing well.'
      return `${domain} is still. Let it be until it calls you.`
    },
  },
  friend: {
    label: 'Friend',
    // absorbed Butler: quietly keeps an eye on the small practical stuff
    description: 'Warm and human. Encouraging, and quietly keeps an eye on the small stuff.',
    proactivity: 'medium',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return `hey, ${domain.toLowerCase()} looks a little rough — ${a.charAt(0).toLowerCase() + a.slice(1)}`
      if (verdict === 'fine') return `${domain} is good! ${a}`
      return `${domain} is all good — nothing to worry about, I've got an eye on it`
    },
  },
  executive: {
    label: 'Executive',
    // absorbed Navigator: forward-looking, aware of where things are heading
    description: 'Concise and decision-focused. High signal, and aware of where things are heading.',
    proactivity: 'high',
    transform: (a, verdict, domain) => {
      const tag = verdict === 'watch' ? 'Priority' : verdict === 'fine' ? 'On track' : 'Monitor'
      const trend = verdict === 'watch' ? ' Left alone, this shapes the next few weeks.' : ''
      return `${tag} — ${domain}: ${a}${trend}`
    },
  },
}

// Where every retired Guide (and the pre-Guides modes before them) lands.
// Applied at read time — stored values never break, with or without the
// cleanup migration (supabase/migrations/guides_five_modes.sql).
export const LEGACY_MODE_MAP: Record<string, Mode> = {
  // 5→3 consolidation (2026-08-21) — reflective-and-warm folds into Friend,
  // direct-and-decisive folds into Executive.
  therapist: 'friend',
  challenger: 'executive',
  // 9→5 consolidation (2026-07)
  monk: 'peaceful',
  teacher: 'friend',
  navigator: 'executive',
  butler: 'friend',
  // original modes→Guides migration (kept so even never-migrated rows resolve)
  balanced: 'peaceful',
  harsh: 'executive',
  coach: 'executive',
  ceo: 'executive',
  hype: 'friend',
  gamer: 'friend',
}

export function normalizeMode(raw: string | null | undefined): Mode {
  if (raw && raw in MODES) return raw as Mode
  if (raw && raw in LEGACY_MODE_MAP) return LEGACY_MODE_MAP[raw]
  return 'peaceful'
}
