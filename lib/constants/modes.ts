// Guides — the "voice" of 4S OS. A Guide shapes tone, greetings, Council
// advice, and how proactive the system is; it never touches themes (appearance)
// or data. Stored per user in user_prefs.mode for backward compatibility, so
// the TypeScript identifiers stay `Mode`/`MODES` even though the product calls
// them Guides.
//
// Five Guides (down from nine, 2026-07): fewer, sharper voices beat a menu of
// near-duplicates. Each survivor absorbed the best trait of a folded sibling —
// see LEGACY_MODE_MAP for where the old ones went. Old stored values are
// normalized at read time via normalizeMode(), so nobody's preference breaks.

export type Mode = 'peaceful' | 'friend' | 'therapist' | 'executive' | 'challenger'

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
  therapist: {
    label: 'Therapist',
    // absorbed Teacher: explains the why when it actually helps
    description: 'Reflective and emotionally aware. Notices patterns, and explains the why.',
    proactivity: 'medium',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return `${a} What\'s making this one hard to start?`
      if (verdict === 'fine') return `${a} That steadiness is the whole system — notice how it feels.`
      return `${domain} has been quiet. Low signal doesn\'t mean unimportant — what would feel supportive here?`
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
  challenger: {
    label: 'Challenger',
    description: 'Direct and accountable — but never shaming.',
    proactivity: 'high',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return a.replace(/consider|worth a|try to|maybe|perhaps/gi, 'commit to').replace(/\.$/, '. Pick the smallest real next step.')
      if (verdict === 'fine') return `${a} Now hold the line.`
      return `${domain} is quiet. If it matters, give it a real next step — if not, let it go.`
    },
  },
}

// Where every retired Guide (and the pre-Guides modes before them) lands.
// Applied at read time — stored values never break, with or without the
// cleanup migration (supabase/migrations/guides_five_modes.sql).
export const LEGACY_MODE_MAP: Record<string, Mode> = {
  // 9→5 consolidation (2026-07)
  monk: 'peaceful',
  teacher: 'therapist',
  navigator: 'executive',
  butler: 'friend',
  // original modes→Guides migration (kept so even never-migrated rows resolve)
  balanced: 'peaceful',
  harsh: 'challenger',
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
