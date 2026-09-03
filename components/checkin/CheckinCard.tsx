'use client'

import { useState } from 'react'
import { useCheckins, groupCheckinsByWeek } from '@/lib/hooks/useCheckins'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { weekOfMonday } from '@/lib/utils/checkinQuestions'
import CheckinForm from './CheckinForm'

// The Today block for the weekly relationship check-in. Nudges toward the
// weekend if you haven't done it; once you have, shows who's in. Returns
// null the rest of the time, so as a default-on block it only appears when
// it has something to say.
export default function CheckinCard({ userId, sundayOnly = false }: { userId: string; sundayOnly?: boolean }) {
  const { checkins, submitCheckin, thisWeekMine } = useCheckins(userId)
  const { members } = useSharedSpaces(userId)
  const [formOpen, setFormOpen] = useState(false)

  const monday = weekOfMonday()
  const day = new Date().getDay() // 0 Sun .. 6 Sat
  // `sundayOnly` (the Household Home block) shows it on check-in day only,
  // done or not; the default (Today) opens the window Thu–Sun.
  const nearWeekend = sundayOnly ? day === 0 : day === 0 || day >= 4

  const thisWeek = groupCheckinsByWeek(checkins).find(w => w.weekOf >= monday)
  const answeredIds = thisWeek ? Object.keys(thisWeek.byUser) : []
  const partnerId = members.find(m => m.member_id && m.member_id !== userId && m.status === 'accepted')?.member_id ?? null
  const partnerName = members.find(m => m.member_id === partnerId)?.member_email ?? 'your partner'
  const partnerDone = !!partnerId && answeredIds.includes(partnerId)

  const mineDone = !!thisWeekMine
  // sundayOnly: never show off check-in day, even the "done" status.
  if (sundayOnly && day !== 0) return null
  // Show when: not done and it's near the weekend, OR not done but the
  // partner already answered (prompt regardless of day), OR done (status).
  if (!mineDone && !nearWeekend && !partnerDone) return null

  return (
    <div style={{
      border: '1px solid color-mix(in srgb, var(--rose) 25%, var(--border))',
      background: 'color-mix(in srgb, var(--rose) 6%, var(--surface))',
      borderRadius: '14px', padding: '0.9rem 1.1rem',
      display: 'flex', alignItems: 'center', gap: '0.8rem',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500 }}>
          {mineDone ? 'Weekly check-in' : 'Time for your weekly check-in'}
        </div>
        <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
          {mineDone
            ? (partnerDone ? 'You’re both in for this week.' : `Done — waiting on ${partnerName}.`)
            : (partnerDone ? `${partnerName} has answered this week.` : 'A few minutes, just between you two.')}
        </div>
      </div>
      {!mineDone && (
        <button onClick={() => setFormOpen(true)} className="btn btn-primary press" style={{ fontSize: '0.74rem', flexShrink: 0 }}>
          Start
        </button>
      )}
      {mineDone && (
        <button onClick={() => setFormOpen(true)} className="btn btn-ghost press" style={{ fontSize: '0.7rem', opacity: 0.7, flexShrink: 0 }}>
          Revise
        </button>
      )}
      {formOpen && <CheckinForm onSubmit={submitCheckin} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
