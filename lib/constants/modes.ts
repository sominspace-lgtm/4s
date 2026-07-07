// Guides — the "voice" of 4S OS. A Guide shapes tone, greetings, Council
// advice, and how proactive the system is; it never touches themes (appearance)
// or data. Stored per user in user_prefs.mode for backward compatibility, so
// the TypeScript identifiers stay `Mode`/`MODES` even though the product calls
// them Guides. Proactivity is advisory metadata Guides can act on (e.g. Butler
// surfaces quiet maintenance; Monk/Peaceful stay hands-off).

export type Mode =
  | 'peaceful' | 'monk' | 'friend' | 'teacher' | 'therapist'
  | 'navigator' | 'executive' | 'butler' | 'challenger'

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
    description: 'Gentle, calm, nonjudgmental. Notice without pressure.',
    proactivity: 'low',
    transform: (a, verdict) => {
      if (verdict === 'watch') return a.replace(/you need to|push|make sure|don't let/gi, 'when you\'re ready,').replace(/\.$/, '. There\'s no rush — just notice.')
      return a + ' You\'re doing well.'
    },
  },
  monk: {
    label: 'Monk',
    description: 'Minimal and philosophical. One thing at a time.',
    proactivity: 'low',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return `${domain} calls for attention. ${a.split('.')[0]}.`
      if (verdict === 'fine') return `${domain} is in balance.`
      return `${domain} is still. Observe before acting.`
    },
  },
  friend: {
    label: 'Friend',
    description: 'Warm and human. Encouraging, like a friend who pays attention.',
    proactivity: 'medium',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return `hey, ${domain.toLowerCase()} looks a little rough — ${a.charAt(0).toLowerCase() + a.slice(1)}`
      if (verdict === 'fine') return `${domain} is good! ${a}`
      return `${domain} is all good, nothing to worry about here`
    },
  },
  teacher: {
    label: 'Teacher',
    description: 'Explains the why behind every recommendation.',
    proactivity: 'medium',
    transform: (a, verdict) => {
      const why: Record<string, string> = {
        watch: ' Consistency compounds — small daily action outperforms sporadic bursts every time.',
        fine: ' This is the result of showing up regularly. That\'s the whole system.',
        quiet: ' Low signal doesn\'t mean unimportant — it means this area needs definition.',
      }
      return a + (why[verdict] ?? '')
    },
  },
  therapist: {
    label: 'Therapist',
    description: 'Reflective and emotionally aware. Notices what keeps returning.',
    proactivity: 'medium',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return `${a} What\'s making this one hard to start?`
      if (verdict === 'fine') return `${a} Notice how that steadiness feels.`
      return `${domain} has been quiet. What would feel supportive here?`
    },
  },
  navigator: {
    label: 'Navigator',
    description: 'Strategic and future-facing. Aware of tradeoffs and direction.',
    proactivity: 'high',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return `${a} Left alone, this shapes the next few weeks.`
      if (verdict === 'fine') return `${a} The direction here is holding — keep it steady.`
      return `${domain} is quiet. Worth deciding whether it belongs in this season.`
    },
  },
  executive: {
    label: 'Executive',
    description: 'Concise and decision-focused. High signal, low noise.',
    proactivity: 'high',
    transform: (a, verdict, domain) => {
      const tag = verdict === 'watch' ? 'Priority' : verdict === 'fine' ? 'On track' : 'Monitor'
      return `${tag} — ${domain}: ${a}`
    },
  },
  butler: {
    label: 'Butler',
    description: 'Quiet maintenance. Practical, discreet, always there.',
    proactivity: 'high',
    transform: (a, verdict) => {
      if (verdict === 'watch') return `A quiet note: ${a.charAt(0).toLowerCase() + a.slice(1)}`
      if (verdict === 'fine') return `${a} All in order.`
      return a + ' Nothing needs you here for now.'
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
