export type Mode = 'balanced' | 'harsh' | 'peaceful' | 'teacher' | 'friend' | 'coach' | 'ceo' | 'monk' | 'hype'

export interface ModeConfig {
  label: string
  description: string
  // Transforms advice text for this mode
  transform: (advice: string, verdict: string, domain: string) => string
}

export const MODES: Record<Mode, ModeConfig> = {
  balanced: {
    label: 'Balanced',
    description: 'Warm and neutral — honest without being sharp.',
    transform: (a) => a,
  },
  harsh: {
    label: 'Harsh',
    description: 'No softening. Direct, blunt, no excuses.',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return a.replace(/consider|worth a|try to|maybe|perhaps/gi, 'you need to').replace(/\.$/, '. No excuses.')
      if (verdict === 'fine') return a.replace(/\.$/, '. Don\'t get comfortable.')
      return `${domain} is quiet. That\'s not good enough — what are you actually doing here?`
    },
  },
  peaceful: {
    label: 'Peaceful',
    description: 'Gentle, non-judgmental. Notice without pressure.',
    transform: (a, verdict) => {
      if (verdict === 'watch') return a.replace(/you need to|push|make sure|don't let/gi, 'when you\'re ready,').replace(/\.$/, '. There\'s no rush — just notice.')
      return a + ' You\'re doing well.'
    },
  },
  teacher: {
    label: 'Teacher',
    description: 'Explains the why behind every recommendation.',
    transform: (a, verdict) => {
      const why: Record<string, string> = {
        watch: ' Consistency compounds — small daily action outperforms sporadic bursts every time.',
        fine: ' This is the result of showing up regularly. That\'s the whole system.',
        quiet: ' Low signal doesn\'t mean unimportant — it means this area needs definition.',
      }
      return a + (why[verdict] ?? '')
    },
  },
  friend: {
    label: 'Friend',
    description: 'Casual, warm, like a friend who actually pays attention.',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return `hey, ${domain.toLowerCase()} looks a little rough — ${a.charAt(0).toLowerCase() + a.slice(1)}`
      if (verdict === 'fine') return `${domain} is good! ${a}`
      return `${domain} is all good, nothing to worry about here 😌`
    },
  },
  coach: {
    label: 'Coach',
    description: 'Motivational and action-oriented. Let\'s go energy.',
    transform: (a, verdict) => {
      if (verdict === 'watch') return `Here\'s the play: ${a.charAt(0).toLowerCase() + a.slice(1)} You\'ve got this — just move.`
      if (verdict === 'fine') return `Let\'s go! ${a} Keep that momentum.`
      return a + ' Stay sharp.'
    },
  },
  ceo: {
    label: 'CEO',
    description: 'Executive summary. Metrics first, decisions second.',
    transform: (a, verdict, domain) => {
      const prefix = verdict === 'watch' ? `[${domain.toUpperCase()} — ACTION REQUIRED] ` : verdict === 'fine' ? `[${domain.toUpperCase()} — ON TRACK] ` : `[${domain.toUpperCase()} — MONITOR] `
      return prefix + a
    },
  },
  monk: {
    label: 'Monk',
    description: 'Minimal and philosophical. Strips to what truly matters.',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return `${domain} calls for attention. ${a.split('.')[0]}.`
      if (verdict === 'fine') return `${domain} is in balance.`
      return `${domain} is still. Observe before acting.`
    },
  },
  hype: {
    label: 'Hype',
    description: 'Enthusiastic, celebratory. Everything is a win or a challenge.',
    transform: (a, verdict, domain) => {
      if (verdict === 'watch') return `Okay ${domain} needs some LOVE right now!! ${a} You can turn this around TODAY! 🔥`
      if (verdict === 'fine') return `${domain} IS CRUSHING IT!! ${a} KEEP GOING!! 🚀`
      return `${domain} is holding steady — stay locked in!! 💪`
    },
  },
}
