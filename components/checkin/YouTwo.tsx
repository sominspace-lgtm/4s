'use client'

import { useState } from 'react'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { useCheckins, groupCheckinsByWeek, checkinStreak } from '@/lib/hooks/useCheckins'
import { weekOfSunday } from '@/lib/utils/checkinQuestions'
import HouseholdUnderstanding from '@/components/household/HouseholdUnderstanding'
import CheckinForm from './CheckinForm'
import CheckinPhoto from './CheckinPhoto'

// You two (2026-10-21 redesign): the weekly check-in history and
// Understanding each other, moved out of Collections into People. These are
// about the two of you, not the house, and never on the shared screen.

// The emoji vibe check — the first check-in question. The four quick picks
// map to a word + color, same language the due-date coloring elsewhere in
// this file uses; any other emoji the person typed is shown as-is with a
// neutral dot (2026-09-03 — "put any emoji" is now supported in the form).
const VIBE_MAP: Record<string, { label: string; color: string }> = {
  '🥱': { label: 'Tired', color: 'var(--muted)' },
  '😐': { label: 'Meh', color: 'var(--amber)' },
  '🙂': { label: 'Good', color: 'var(--emerald)' },
  '🥰': { label: 'Great', color: 'var(--gold)' },
}
function VibeBadge({ emoji }: { emoji: string }) {
  const known = VIBE_MAP[emoji]
  const color = known?.color ?? 'var(--muted)'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.62rem', color, opacity: 0.9 }}>
      <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {known ? known.label : <span style={{ fontSize: '0.85rem' }}>{emoji}</span>}
    </span>
  )
}


export default function YouTwo({ userId }: { userId: string }) {
  const { spaces, members } = useSharedSpaces(userId)
  const spaceId = spaces.find(sp => members.some(m => m.space_id === sp.id && m.status === 'accepted'))?.id ?? spaces[0]?.id ?? null
  const { checkins, loading: checkinsLoading, submitCheckin, thisWeekMine, doneThisWeek } = useCheckins(userId)
  const [checkinFormOpen, setCheckinFormOpen] = useState(false)

  function nameFor(uid: string | null): string | null {
    if (!uid) return null
    if (uid === userId) return 'You'
    return members.find(m => m.member_id === uid)?.member_email ?? null
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.2rem' }}>
      {(() => {
        const weeks = groupCheckinsByWeek(checkins)
        const isSunday = new Date().getDay() === 0
        const mineDone = !!thisWeekMine
        const weekStart = weekOfSunday()
        const streak = checkinStreak(checkins, userId)
        return (
          <section className="organic specimen" style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '1rem 1.2rem' }}>
            {/* Take-it prompt shows whenever this week isn't done yet (Sunday
                or catch-up). Once submitted there's no button — answers can't
                be revised — just a quiet confirmation and the history. */}
            {!mineDone ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.9rem',
                padding: '0.8rem 1rem',
                border: '1px solid color-mix(in srgb, var(--rose) 25%, var(--border))',
                background: 'color-mix(in srgb, var(--rose) 6%, var(--surface))',
                borderRadius: '12px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500 }}>
                    {isSunday ? 'Time for your weekly check-in' : 'This week’s check-in isn’t done'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                    A few minutes, just between you two. You can’t change answers once submitted.
                  </div>
                </div>
                <button onClick={() => setCheckinFormOpen(true)} className="btn btn-primary press"
                  style={{ fontSize: '0.74rem', flexShrink: 0 }}>
                  Complete check-in
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.9rem' }}>
                You’re in for this week. Next check-in: Sunday.
              </div>
            )}
            {checkinFormOpen && <CheckinForm onSubmit={submitCheckin} onClose={() => setCheckinFormOpen(false)} />}

            <details open={isSunday && !mineDone}>
              <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span className="t-card">Check-ins</span>
                <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>{weeks.length}</span>
                {streak > 1 && <span style={{ fontSize: '0.62rem', color: 'var(--gold)' }}>{streak} weeks running</span>}
              </summary>
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.6, marginBottom: '0.7rem' }}>
                  Your weekly check-in, kept here.
                </div>

                {weeks.length === 0 && !checkinsLoading && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.75 }}>
                    No check-ins yet — the first one you answer on Today shows up here.
                  </div>
                )}

                {weeks.map(w => {
                  // This week's count comes from who has checked in, since a
                  // partner's answers stay hidden until you both have.
                  const answered = w.weekOf >= weekStart ? Math.max(doneThisWeek.length, Object.keys(w.byUser).length) : Object.keys(w.byUser).length
                  // This week's answers open once you have both checked in
                  // (the database enforces it, checkin_privacy.sql). Past
                  // weeks are always open.
                  const locked = w.weekOf >= weekStart && (!mineDone || answered < 2)
                  return (
                  <details key={w.weekOf} style={{ borderBottom: '1px solid var(--faint)', padding: '0.6rem 0' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>Week of {w.weekOf}</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.7 }}>
                        {answered >= 2 ? 'both of you checked in' : answered === 1 ? 'one of you checked in' : 'no answers yet'}
                      </span>
                      {!locked && w.weekOf >= weekStart && answered >= 2 && (
                        <span style={{ fontSize: '0.62rem', color: 'var(--gold)' }}>✓ both in</span>
                      )}
                    </summary>
                    {/* Your own answers always show. Your partner's show once you
                        have both checked in, or the week is over (2026-10-23). */}
                    {locked && (
                      <div style={{ marginTop: '0.6rem', fontSize: '0.72rem', color: 'var(--muted)', fontStyle: 'italic', opacity: 0.8 }}>
                        {mineDone
                          ? 'Your answers are in. You will both see each other’s once your partner checks in, or when the week ends.'
                          : 'Your partner’s answers open once you check in too, or when the week ends.'}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', marginTop: '0.6rem' }}>
                      {Object.entries(w.byUser).filter(([uid]) => !locked || uid === userId).map(([uid, c]) => {
                        const vibe = c.answers.find(a => a.questionKey === 'vibe')
                        // The old form's photos were copied into 4S (2026-10-27); a Drive link that
                        // could not be copied is left out rather than shown as an answer.
                        const questions = c.answers.filter(a => a.questionKey !== 'vibe' && !/drive\.google\.com/.test(a.answer))
                        return (
                          <div key={uid} style={{ background: 'var(--surface2)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                              <div style={{ fontSize: '0.68rem', color: 'var(--gold)' }}>{nameFor(uid) ?? 'Partner'}</div>
                              {vibe && <VibeBadge emoji={vibe.answer} />}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                              {questions.map((a, i) => (
                                <div key={i}>
                                  {a.questionText && <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.75 }}>{a.questionText}</div>}
                                  <div style={{ fontSize: '0.74rem', color: 'var(--text)', lineHeight: 1.5 }}>{a.answer}</div>
                                </div>
                              ))}
                              {c.note && (
                                <div>
                                  <div style={{ fontSize: '0.62rem', color: 'var(--muted)', opacity: 0.75 }}>Anything else</div>
                                  <div style={{ fontSize: '0.74rem', color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.note}</div>
                                </div>
                              )}
                            </div>
                            <CheckinPhoto path={c.photo_path} />
                          </div>
                        )
                      })}
                    </div>
                  </details>
                  )
                })}
              </div>
            </details>
          </section>
        )
      })()}

      <HouseholdUnderstanding spaceId={spaceId} userId={userId} partnerName={uid => nameFor(uid) ?? 'Partner'} collapsible />
    </div>
  )
}
