'use client'

import { useState } from 'react'
import { useCheckins, groupCheckinsByWeek, checkinStreak } from '@/lib/hooks/useCheckins'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'
import { weekOfSunday } from '@/lib/utils/checkinQuestions'
import CheckinForm from './CheckinForm'

// The weekly relationship check-in prompt. Shown on check-in day (Sunday),
// or any day if this week's check-in still isn't done — otherwise it returns
// null. Once you've submitted, there's no button: answers can't be revised
// (2026-09-03).
export default function CheckinCard({ userId }: { userId: string }) {
  const { checkins, submitCheckin, thisWeekMine } = useCheckins(userId)
  const { members } = useSharedSpaces(userId)
  const [formOpen, setFormOpen] = useState(false)

  const weekStart = weekOfSunday()
  const isSunday = new Date().getDay() === 0

  const thisWeek = groupCheckinsByWeek(checkins).find(w => w.weekOf >= weekStart)
  const answeredIds = thisWeek ? Object.keys(thisWeek.byUser) : []
  const partnerId = members.find(m => m.member_id && m.member_id !== userId && m.status === 'accepted')?.member_id ?? null
  const partnerName = members.find(m => m.member_id === partnerId)?.member_email ?? 'your partner'
  const partnerDone = !!partnerId && answeredIds.includes(partnerId)
  const mineDone = !!thisWeekMine
  const streak = checkinStreak(checkins, userId)

  // Only surface it on check-in day, or whenever it's still not done.
  if (mineDone && !isSunday) return null

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
          {mineDone && streak > 1 && (
            <span style={{ color: 'var(--gold)' }}> · {streak} weeks running</span>
          )}
        </div>
      </div>
      {!mineDone && (
        <button onClick={() => setFormOpen(true)} className="btn btn-primary press" style={{ fontSize: '0.74rem', flexShrink: 0 }}>
          Start
        </button>
      )}
      {formOpen && <CheckinForm onSubmit={submitCheckin} onClose={() => setFormOpen(false)} />}
    </div>
  )
}
