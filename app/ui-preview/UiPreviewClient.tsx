'use client'

import { useState } from 'react'
import ThemeProvider from '@/components/ui/ThemeProvider'
import HomeBar, { type HomeBarGroup } from '@/components/ui/HomeBar'
import SubNav from '@/components/ui/SubNav'
import MeGrid from '@/components/ui/MeGrid'

const GROUPS: HomeBarGroup[] = [
  { id: 'today',  icon: 'today',     label: 'Today',  members: ['brief'] },
  { id: 'home',   icon: 'household', label: 'Home',   members: ['home', 'upkeep', 'kitchen', 'reference', 'mail'] },
  { id: 'me',     icon: 'personal',  label: 'Me',     members: ['me', 'tasks', 'habits', 'notes', 'money', 'wishlist', 'people', 'vault', 'village'] },
  { id: 'places', icon: 'places',    label: 'Places', members: ['places', 'places-trips', 'places-nearby'] },
]
const LABELS: Record<string, string> = {
  home: 'Home', upkeep: 'Chores', kitchen: 'Kitchen', reference: 'Collections', mail: 'Mail',
  places: 'Map', 'places-trips': 'Trips', 'places-nearby': 'Nearby',
  tasks: 'Tasks', habits: 'Habits', notes: 'Notes', money: 'Money', wishlist: 'Wishlist', people: 'People', vault: 'Passwords', village: 'Village',
}

export default function UiPreviewClient() {
  const [tab, setTab] = useState('home')
  const [theme, setTheme] = useState('bloom')
  const g = GROUPS.find(x => x.members.includes(tab))!
  const all = new Set(Object.keys(LABELS))

  return (
    <ThemeProvider theme={theme} customTheme={null}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <div style={{ padding: '0.5rem 1rem', fontSize: 12, color: 'var(--muted)' }}>
          ui-preview · theme <select value={theme} onChange={e => setTheme(e.target.value)}>
            {['bloom', 'moonlight', 'ember', 'dusk', 'sage', 'obsidian', 'elegant', 'botanical', 'modern', 'warm'].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <main style={{ maxWidth: 'min(1240px, 94vw)', margin: '0 auto', padding: '1.2rem 2rem 6rem' }}>
          {g.id === 'me' && tab !== 'me'
            ? <SubNav activeId={tab} onSelect={setTab} back={{ label: 'Me', title: LABELS[tab], onClick: () => setTab('me') }} />
            : g.members.length > 1 && g.id !== 'me'
              ? <SubNav items={g.members.map(m => ({ id: m, label: LABELS[m] }))} activeId={tab} onSelect={setTab} />
              : null}
          {tab === 'me' && <MeGrid visible={all} onOpen={setTab} />}
          {tab !== 'me' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {[1, 2, 3, 4].map(i => (
                <section key={i} className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
                  <div className="t-card">Card {i} on {LABELS[tab] ?? tab}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>Tiny helper text at 0.62rem</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text)' }}>Body text at 0.74rem with a few more words to wrap on a phone.</div>
                  <button className="btn btn-primary press" style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>Action</button>
                </section>
              ))}
            </div>
          )}
        </main>
        <HomeBar groups={GROUPS} activeId={tab} onSelect={setTab} />
      </div>
    </ThemeProvider>
  )
}
