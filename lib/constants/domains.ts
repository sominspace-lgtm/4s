export interface Domain {
  id: string
  label: string
  sublabel: string
  icon: string
  color: string
}

export const DOMAINS: Domain[] = [
  { id: 'biz-active',   label: 'Business',     sublabel: 'Active',           icon: '◈', color: 'var(--gold)' },
  { id: 'biz-future',   label: 'Business',     sublabel: 'Future / Pipeline', icon: '◇', color: 'var(--purple)' },
  { id: 'money',        label: 'Money',        sublabel: 'Finance',           icon: '◉', color: 'var(--emerald)' },
  { id: 'health',       label: 'Health',       sublabel: 'Body + Mind',       icon: '○', color: 'var(--rose)' },
  { id: 'relationship', label: 'Relationship', sublabel: 'Connection',        icon: '♡', color: 'var(--blush)' },
  { id: 'creative',     label: 'Creative',     sublabel: 'IG + Expression',   icon: '✦', color: 'var(--amber)' },
  { id: 'home',         label: 'Home',         sublabel: 'Admin + Logistics', icon: '⌂', color: 'var(--slate)' },
  { id: 'self',         label: 'Self',         sublabel: 'Growth + Inner Life',icon: '◎', color: 'var(--lavender)' },
]
