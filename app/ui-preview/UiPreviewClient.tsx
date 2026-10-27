'use client'

import { useState } from 'react'
import ThemeProvider from '@/components/ui/ThemeProvider'
import HomeBar, { type HomeBarGroup } from '@/components/ui/HomeBar'
import SubNav from '@/components/ui/SubNav'
import MeGrid from '@/components/ui/MeGrid'
import Sheet from '@/components/ui/Sheet'
import GoogleCalendar from '@/components/google/GoogleCalendar'
import VoiceRecorder from '@/components/notes/VoiceRecorder'
import { HolidayDecor, type Holiday } from '@/components/village/scene/Holiday'
import PlanWeek from '@/components/brief/PlanWeek'
import DailyBrief from '@/components/brief/DailyBrief'
import SwipeRow from '@/components/ui/SwipeRow'
import DoneCircle from '@/components/ui/DoneCircle'
import UndoToast from '@/components/ui/UndoToast'
import { withUndo } from '@/lib/ui/undo'
import QuickNote from '@/components/ui/QuickNote'
import Village from '@/components/village/Village'

const GROUPS: HomeBarGroup[] = [
  { id: 'today',  icon: 'today',     label: 'Today',  members: ['brief'] },
  { id: 'home',   icon: 'household', label: 'Home',   members: ['home', 'upkeep', 'kitchen', 'reference', 'mail'] },
  { id: 'me',     icon: 'personal',  label: 'Me',     members: ['me', 'tasks', 'mycalendar', 'gmail', 'notes', 'habits', 'money', 'vault', 'checkins', 'settings', 'village'] },
  { id: 'places', icon: 'places',    label: 'Places', members: ['places', 'places-trips', 'places-nearby'] },
]
const LABELS: Record<string, string> = {
  home: 'Home', upkeep: 'Chores', kitchen: 'Kitchen', reference: 'Collections', mail: 'Mail',
  places: 'Map', 'places-trips': 'Trips', 'places-nearby': 'Nearby',
  tasks: 'Tasks', habits: 'Habits', notes: 'Notes', money: 'Money', wishlist: 'Wishlist', people: 'People', vault: 'Passwords', village: 'Village', mycalendar: 'Calendar', gmail: 'Gmail', checkins: 'Check-ins', settings: 'Settings',
}

export default function UiPreviewClient() {
  const [tab, setTab] = useState('home')
  const [theme, setTheme] = useState('bloom')
  const [sheet, setSheet] = useState(false)
  const [plan, setPlan] = useState(false)
  const [guestV, setGuestV] = useState(false)
  const [idleV, setIdleV] = useState(false)
  const g = GROUPS.find(x => x.members.includes(tab))!
  const all = new Set(Object.keys(LABELS))

  return (
    <ThemeProvider theme={theme} customTheme={null}>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
        <div style={{ padding: '0.5rem 1rem', fontSize: 12, color: 'var(--muted)' }}>
          ui-preview · theme <select value={theme} onChange={e => setTheme(e.target.value)}>
            {['bloom', 'moonlight', 'ember', 'dusk', 'sage', 'obsidian', 'elegant', 'botanical', 'modern', 'warm'].map(t => <option key={t}>{t}</option>)}
          </select>
          {' '}<button onClick={() => setTab('village')}>village</button>{' '}<label><input type="checkbox" checked={guestV} onChange={e => setGuestV(e.target.checked)} /> guest</label>
          {' '}<label><input type="checkbox" checked={idleV} onChange={e => setIdleV(e.target.checked)} /> idle</label>
        </div>
        <main style={{ maxWidth: 'min(1240px, 94vw)', margin: '0 auto', padding: '1.2rem 2rem 6rem' }}>
          {g.id === 'me' && tab !== 'me'
            ? <SubNav activeId={tab} onSelect={setTab} back={{ label: 'Me', title: LABELS[tab], onClick: () => setTab('me') }} />
            : g.members.length > 1 && g.id !== 'me'
              ? <SubNav items={g.members.map(m => ({ id: m, label: LABELS[m] }))} activeId={tab} onSelect={setTab} />
              : null}
          {tab === 'me' && <MeGrid visible={all} onOpen={setTab} userId="" />}
          
          {tab === 'notes' && <VoiceRecorder label="Voice note" onText={t => alert('TEXT: ' + t)} />}
          {tab === 'village' && <Village userId="" guestView={guestV} ambient={idleV} guestInfo={{ welcome: 'Welcome to our home', wifiName: 'SoHome', wifiPassword: 'somi-loves-churu', places: 'Bathroom: down the hall, on the left\nTowels: hall closet', rules: 'Shoes off at the door\nKeep the back door shut for Somi' }} onSetGuestInfo={i => console.log('save', i)} />}
          {tab === 'village' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {(['halloween', 'thanksgiving', 'christmas', 'newyear', 'seollal', 'valentine', 'july4'] as Holiday[]).flatMap(hd => [false, true].map(night => (
                <figure key={hd + night} style={{ margin: 0 }}>
                  <svg viewBox="-55 -110 110 118" style={{ width: '100%', background: night ? '#1f2a44' : '#cfe6f2', borderRadius: 10 }}>
                    <defs><filter id="vglow" x="-250%" y="-250%" width="600%" height="600%"><feGaussianBlur stdDeviation="3" /></filter></defs>
                    <rect x={-55} y={0} width={110} height={10} fill="#8fb07a" />
                    <image href={`/village-assets/cottage-${night ? 'lit' : 'dark'}.png`} x={-45} y={-75.3} width={90} height={75.3} style={{ imageRendering: 'pixelated' }} />
                    <HolidayDecor holiday={hd} night={night} />
                  </svg>
                  <figcaption style={{ fontSize: 12 }}>{hd} {night ? 'night' : 'day'}</figcaption>
                </figure>
              )))}
            </div>
          )}
          {tab === 'habits' && (
            <div>
              <UndoToast />
              {['Water the plants', 'Take out bins', 'Call the vet'].map(t => (
                <SwipeRow key={t} onRight={() => alert('done ' + t)} onLeft={() => withUndo('Removed ' + t, () => console.log('committed ' + t), () => console.log('undone ' + t))} leftLabel="Remove" style={{ borderBottom: '1px solid var(--faint)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.55rem 0' }}>
                    <DoneCircle done={false} onClick={() => withUndo('Removed ' + t, () => console.log('committed ' + t))} label={t} />
                    <span style={{ fontSize: '0.9rem' }}>{t}</span>
                  </div>
                </SwipeRow>
              ))}
            </div>
          )}
          {tab === 'brief' && <DailyBrief userId="" />}
          {tab === 'tasks' && <><button className="btn btn-primary" onClick={() => setPlan(true)}>Plan the week</button><PlanWeek open={plan} onClose={() => setPlan(false)} userId="" /></>}
          {tab !== 'me' && tab !== 'brief' && tab !== 'notes' && tab !== 'village' && tab !== 'tasks' && tab !== 'habits' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {[1, 2, 3, 4].map(i => (
                <section key={i} className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
                  <div className="t-card">Card {i} on {LABELS[tab] ?? tab}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--muted)' }}>Tiny helper text at 0.62rem</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text)' }}>Body text at 0.74rem with a few more words to wrap on a phone.</div>
                  <button onClick={() => setSheet(true)} className="btn btn-primary press" style={{ fontSize: '0.7rem', marginTop: '0.5rem' }}>Action</button>
                </section>
              ))}
            </div>
          )}
        </main>
        <Sheet open={sheet} title="New chore" onClose={() => setSheet(false)} footer={<><button className="btn btn-primary press">Save</button><button className="btn btn-ghost press" onClick={() => setSheet(false)}>Cancel</button></>}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.78rem", color: "var(--muted)" }}>Chore<input placeholder="Water the plants" style={{ minHeight: 44, padding: "0 0.7rem", border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg)", color: "var(--text)" }} /></label>
          <div style={{ fontSize: "0.62rem", color: "var(--muted)" }}>small hint inside a sheet</div>
        </Sheet>
        <QuickNote />
        <HomeBar groups={GROUPS} activeId={tab} onSelect={setTab} />
      </div>
    </ThemeProvider>
  )
}
