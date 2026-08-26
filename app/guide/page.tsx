import Link from 'next/link'
import Logo from '@/components/ui/Logo'

export const metadata = {
  title: '4S — Guide',
  description: 'How to use 4S Home: tasks, habits, life, money, calendar, council, sharing, AI, and Alexa.',
}

// Public, shareable guide for new users. Uses default (Moonlight) theme tokens
// from globals.css so it renders correctly without a logged-in ThemeProvider.

function Section({ id, kicker, title, children }: { id: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: '5rem', marginBottom: '2.6rem' }}>
      <div style={{ fontSize: '0.6rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--muted)', opacity: 0.7, marginBottom: '0.35rem' }}>{kicker}</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: '1.5rem', color: 'var(--text)', margin: '0 0 0.9rem', letterSpacing: '0.01em' }}>{title}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>{children}</div>
    </section>
  )
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.1rem 1.25rem' }}>
      {title && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>{title}</div>}
      <div style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}

function Say({ children }: { children: React.ReactNode }) {
  return (
    <code style={{
      display: 'inline-block', fontFamily: 'var(--font-mono)', fontSize: '0.76rem',
      background: 'color-mix(in srgb, var(--gold) 8%, transparent)',
      border: '1px solid color-mix(in srgb, var(--gold) 22%, transparent)',
      color: 'var(--text)', borderRadius: '6px', padding: '0.15em 0.5em', margin: '0.15em 0.25em 0.15em 0',
    }}>{children}</code>
  )
}

const NAV = [
  ['start', 'Getting started'],
  ['brief', 'Today'],
  ['tasks', 'Tasks'],
  ['habits', 'Habits'],
  ['notes', 'Notes'],
  ['money', 'Money'],
  ['calendar', 'Calendar'],
  ['council', 'Council'],
  ['shared', 'People'],
  ['household', 'Household'],
  ['places', 'Places'],
  ['ai', 'AI'],
  ['alexa', 'Alexa'],
  ['keys', 'Getting around'],
  ['themes', 'Themes'],
]

function IconRow({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      <span style={{
        width: '2rem', height: '2rem', flexShrink: 0, borderRadius: '8px',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--gold)', fontSize: '0.9rem',
      }}>{icon}</span>
      <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{children}</span>
    </div>
  )
}

export default function GuidePage() {
  return (
    <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2.5rem 1.25rem 5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <Logo size={48} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--text)', lineHeight: 1 }}>4S Guide</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.75, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.2rem' }}>your personal operating system</div>
          </div>
        </div>
        <Link href="/dashboard" className="btn btn-secondary" style={{ fontSize: '0.75rem' }}>Open dashboard →</Link>
      </div>

      {/* Quick nav */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--faint)' }}>
        {NAV.map(([id, label]) => (
          <a key={id} href={`#${id}`} style={{
            fontSize: '0.7rem', color: 'var(--muted)', textDecoration: 'none',
            padding: '0.3rem 0.7rem', borderRadius: '99px', border: '1px solid var(--border)',
            background: 'var(--surface)',
          }}>{label}</a>
        ))}
      </div>

      <p style={{ fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.7, marginBottom: '2.5rem', fontWeight: 300 }}>
        4S is a calm home for your whole life — tasks, habits, money, and plans in one private place.
        The guiding idea is <em style={{ color: 'var(--gold)', fontStyle: 'normal' }}>alive but quiet</em>: it surfaces what matters
        right now and stays out of the way the rest of the time. Everything is private by default; you share only what you choose.
      </p>

      <Section id="start" kicker="the basics" title="Getting started">
        <Card>
          The top nav is your set of tabs. <strong style={{ color: 'var(--text)' }}>Brief</strong> is home — your command center.
          The other tabs (Tasks, Habits, Life, Money, Calendar, Council, Shared) each open on their own so you only ever see full detail when you ask for it.
        </Card>
        <Card title="Quick Add · Inbox">
          On Brief there&rsquo;s a Quick Add box. Drop any task, thought, or reminder there and sort it later — it lands in your Inbox until you file it.
          Tap the <Say>＋</Say> button (bottom-right on mobile) to capture from anywhere.
        </Card>
      </Section>

      <Section id="brief" kicker="home" title="Brief">
        <Card>
          Brief shows a short summary of your day: what&rsquo;s overdue or due today, anything waiting on you, and a
          <strong style={{ color: 'var(--text)' }}> suggested next action</strong>. Below that, compact cards for every other area link straight to their tab —
          so Brief stays a dashboard, never a wall of detail.
        </Card>
      </Section>

      <Section id="tasks" kicker="get things done" title="Tasks">
        <Card title="Type it like you&rsquo;d say it">
          When adding a task, plain phrasing sets the date and priority for you — 4S shows a suggestion you confirm first. Try:
          <div style={{ marginTop: '0.6rem' }}>
            <Say>hw due today</Say><Say>call mom friday</Say><Say>p1 pay rent tomorrow</Say><Say>dentist due 7/15</Say><Say>essay in 3 days</Say>
          </div>
        </Card>
        <Card>
          Click the circle to cycle status (○ to do → ◑ in progress → ● done). Click the P1/P2/P3 badge to change priority.
          Set a repeat interval and completing a task creates the next one automatically.
        </Card>
      </Section>

      <Section id="habits" kicker="build routines" title="Habits">
        <Card>
          Track daily, weekly (specific weekdays), or every-N-days habits. Each habit knows its own schedule, so
          &ldquo;due today&rdquo; only counts the ones that actually are. Pause a habit any time without losing its history.
        </Card>
      </Section>

      <Section id="notes" kicker="write it down" title="Notes">
        <Card>
          A real note — title, body, as long or short as it needs to be. Pin the ones you keep coming back to.
          Every note can be kept private or shared with your household, the same switch chores, meals and goals
          already have.
        </Card>
      </Section>

      <Section id="money" kicker="stay ahead of it" title="Money">
        <Card>
          Four views: <strong style={{ color: 'var(--text)' }}>Wishlist</strong> (things you want later),
          <strong style={{ color: 'var(--text)' }}> Gifts</strong> (ideas per person/occasion),
          <strong style={{ color: 'var(--text)' }}> Renewals</strong> (subscriptions &amp; bills), and
          <strong style={{ color: 'var(--text)' }}> Buy Again</strong> — Refill Intelligence.
        </Card>
        <Card title="Refill Intelligence">
          Add something you always run out of and 4S stays quiet until it&rsquo;s time to buy again. The quick add takes ~10 seconds
          (name, category, remind-every, notify-before). You can also scan a product photo or paste a link and let AI fill in the details
          for you to confirm.
        </Card>
      </Section>

      <Section id="calendar" kicker="what's ahead" title="Calendar">
        <Card>
          A native <strong style={{ color: 'var(--text)' }}>Agenda</strong> and <strong style={{ color: 'var(--text)' }}>Month</strong> view built from your own data —
          dated tasks, renewals, refill run-outs, and gift dates — so you see what&rsquo;s coming without leaving 4S.
          Connect Google Calendar to see your events alongside it.
        </Card>
      </Section>

      <Section id="council" kicker="a second opinion" title="Council">
        <Card>
          Convene the Council for a calm, per-area review of your dashboard — Finance, Health, Home, Planning, Sharing and more —
          plus one suggested next action. It runs instantly on rules, and upgrades to a real AI review when AI is enabled (below).
        </Card>
      </Section>

      <Section id="shared" kicker="together, privately" title="People">
        <Card>
          The people who matter — birthdays, when you last said hello, and whatever you want to
          remember about them. Everything here is private to you.
        </Card>
      </Section>

      <Section id="household" kicker="shared living" title="Household">
        <Card>
          For the people you live with. <strong style={{ color: 'var(--text)' }}>Home</strong> groups Calendar, Shopping, Chores,
          and Meals — reorder or hide any of them from the ⊹ Customize button, the same as the top-level tabs.
          <strong style={{ color: 'var(--text)' }}> Reference</strong> is the fridge door: gate codes, the vet&rsquo;s number, notes
          with no due date and no owner. Partner pairing and Discord linking live in Settings.
        </Card>
      </Section>

      <Section id="places" kicker="don't lose track of it" title="Places">
        <Card>
          Pin the restaurants, courts, and spots you don&rsquo;t want to have to remember on your own — a themed map plus a list,
          filterable by kind. Status is the only &ldquo;rating&rdquo; this has: <strong style={{ color: 'var(--text)' }}>want to go</strong>,
          <strong style={{ color: 'var(--text)' }}> good</strong> (go again), or <strong style={{ color: 'var(--text)' }}>not again</strong>.
          From Discord, no command needed — post a name or a maps link in #pins and it&rsquo;s saved; react thumbs-up or thumbs-down on the bot&rsquo;s
          message once you&rsquo;ve been.
        </Card>
        <Card title="Photos">
          Open any pin and add photos right there — they&rsquo;re private to you, or shared with your household space if the pin is shared,
          same as everything else. Share a pin to a space and it&rsquo;s on both your maps.
        </Card>
      </Section>

      <Section id="ai" kicker="alive but quiet" title="AI features">
        <Card>
          When an <code style={{ fontSize: '0.72rem' }}>ANTHROPIC_API_KEY</code> is configured, two things come to life:
          the <strong style={{ color: 'var(--text)' }}>Council</strong> AI review, and
          <strong style={{ color: 'var(--text)' }}> Refill</strong> photo/link extraction. Only a light summary of your dashboard —
          counts, titles, dates — is ever sent; never your note contents. Without a key, 4S falls back to its built-in rules automatically.
        </Card>
      </Section>

      <Section id="alexa" kicker="hands-free" title="Alexa">
        <Card title="Link once">
          Account → <strong style={{ color: 'var(--text)' }}>Connect Alexa</strong> → Get my code, then say <Say>Alexa, open four s</Say> and read the code aloud.
          Your Echo now controls your own private 4S data.
        </Card>
        <Card title="Then just talk">
          Open the skill (<Say>Alexa, open four s</Say>), then say things like:
          <div style={{ marginTop: '0.6rem' }}>
            <Say>what needs attention</Say><Say>read my tasks</Say><Say>add a task call mom friday</Say>
            <Say>complete buy milk</Say><Say>what habits are due</Say><Say>i did meditation</Say>
            <Say>money summary</Say><Say>i bought coffee</Say><Say>what is coming up</Say><Say>capture remember the invoice</Say>
          </div>
        </Card>
      </Section>

      <Section id="keys" kicker="move faster" title="Getting around">
        <Card>
          Tap these anywhere in 4S — they work the same on phone, Mac, and Windows.
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginTop: '0.8rem' }}>
            <IconRow icon="⌕">Search — find any task, habit, note, or item</IconRow>
            <IconRow icon="✎">Quick capture — jot anything down instantly</IconRow>
            <IconRow icon="◐">Theme &amp; Guide — change the look and the voice</IconRow>
            <IconRow icon="⊹">Customize — reorder or hide any tab</IconRow>
            <IconRow icon="?">Guide — this page, any time</IconRow>
          </div>
        </Card>
      </Section>

      <Section id="themes" kicker="make it yours" title="Themes &amp; Guides">
        <Card>
          Pick light or dark and one accent <strong style={{ color: 'var(--text)' }}>color</strong>, or go fully custom with
          your own six colors and a font pairing. Three <strong style={{ color: 'var(--text)' }}>Guides</strong> — Peaceful,
          Friend, Executive — change only the tone and greetings. Mix them freely.
        </Card>
        <Card>
          <strong style={{ color: 'var(--text)' }}>Customize:</strong> reorder or hide any tab, from the ⊹ icon next to any tab bar.
        </Card>
      </Section>

      <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--faint)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--muted)', opacity: 0.7 }}>Private by default. You&rsquo;re in control of what&rsquo;s shared.</span>
        <Link href="/dashboard" className="btn btn-primary" style={{ fontSize: '0.78rem' }}>Open your dashboard →</Link>
      </div>
    </main>
  )
}
