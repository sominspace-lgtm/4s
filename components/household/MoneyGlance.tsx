'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { billsThisMonth, balanceFor, money, type HouseholdBill, type HouseholdPayment } from '@/lib/money/household'

// Money this month (2026-10-19): the shared bills due this month and a "who
// paid" balance. Not budgeting. Paying a bill here also counts toward who
// paid. On the shared screen it shows the bills only.

const field: React.CSSProperties = { minHeight: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', padding: '0 0.6rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none', minWidth: 0 }

export default function MoneyGlance({ spaceId, userId, sharedMode = false }: { spaceId: string | null; userId: string; sharedMode?: boolean }) {
  const supabase = useMemo(() => createClient(), [])
  const [bills, setBills] = useState<HouseholdBill[]>([])
  const [payments, setPayments] = useState<HouseholdPayment[]>([])
  const [ready, setReady] = useState<'loading' | 'ok' | 'missing'>('loading')
  const [mode, setMode] = useState<'none' | 'bill' | 'paid'>('none')
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [day, setDay] = useState('1')
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!spaceId) { setReady('ok'); return }
    const [b, p] = await Promise.all([
      supabase.from('household_bills').select('*').eq('space_id', spaceId).order('due_day'),
      supabase.from('household_payments').select('*').eq('space_id', spaceId).order('paid_on', { ascending: false }).limit(500),
    ])
    if (b.error || p.error) { setReady('missing'); return }
    setBills((b.data ?? []) as HouseholdBill[]); setPayments((p.data ?? []) as HouseholdPayment[]); setReady('ok')
  }, [supabase, spaceId])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- load from the server on mount
  useEffect(() => { void load() }, [load])

  if (!spaceId || ready === 'loading') return null
  if (ready === 'missing') return null

  const due = billsThisMonth(bills)
  const unpaidTotal = due.filter(d => !d.paid).reduce((s, d) => s + (Number(d.bill.amount) || 0), 0)
  const bal = balanceFor(userId, payments)
  const now = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  async function addBill() {
    const n = amount ? Number(amount) : null
    if (!label.trim()) { setErr('Name the bill.'); return }
    const { error } = await supabase.from('household_bills').insert({ user_id: userId, space_id: spaceId, label: label.trim().slice(0, 80), amount: n && n > 0 ? n : null, due_day: Math.min(31, Math.max(1, Number(day) || 1)) })
    if (error) { setErr('That did not save.'); return }
    setLabel(''); setAmount(''); setDay('1'); setMode('none'); setErr(null); void load()
  }
  async function addPaid(kind: 'expense' | 'settle', l: string, amt: number) {
    const { error } = await supabase.from('household_payments').insert({ space_id: spaceId, paid_by: userId, label: l.slice(0, 80), amount: amt, kind })
    if (error) { setErr('That did not save.'); return false }
    return true
  }
  async function payBill(b: HouseholdBill) {
    const { error } = await supabase.from('household_bills').update({ paid_month: month }).eq('id', b.id)
    if (error) { setErr('That did not save.'); return }
    if (b.amount && !sharedMode) await addPaid('expense', b.label, Number(b.amount))
    void load()
  }

  return (
    <section style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '0.5rem' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-card)', color: 'var(--text)' }}>Money this month</span>
        {unpaidTotal > 0 && <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{money(unpaidTotal)} still to pay</span>}
      </div>

      {due.length === 0
        ? <div style={{ fontSize: '0.84rem', color: 'var(--muted)' }}>No shared bills yet. Add rent, internet, anything you split.</div>
        : due.map(({ bill, paid, daysLeft }) => (
          <div key={bill.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem' }}>
            <span style={{ flex: 1, color: 'var(--text)', textDecoration: paid ? 'line-through' : 'none', opacity: paid ? 0.5 : 1 }}>{bill.label}</span>
            {bill.amount != null && <span style={{ color: 'var(--muted)' }}>{money(Number(bill.amount))}</span>}
            <span style={{ fontSize: '0.74rem', minWidth: '4.5rem', textAlign: 'right', color: paid ? 'var(--emerald)' : daysLeft < 0 ? 'var(--rose)' : daysLeft <= 3 ? 'var(--amber)' : 'var(--muted)' }}>
              {paid ? 'Paid' : daysLeft < 0 ? `${-daysLeft}d late` : daysLeft === 0 ? 'Today' : `in ${daysLeft}d`}
            </span>
            {!paid && <button onClick={() => payBill(bill)} className="btn btn-secondary press" style={{ minHeight: 34, padding: '0 0.7rem' }}>Paid</button>}
          </div>
        ))}

      {!sharedMode && (
        <div style={{ fontSize: '0.88rem', color: 'var(--text)', paddingTop: '0.3rem', borderTop: '1px solid var(--faint)' }}>
          {Math.abs(bal) < 0.01 ? 'You two are even.' : bal > 0 ? `Your partner owes you ${money(bal)}.` : `You owe your partner ${money(bal)}.`}
          {bal < 0 && <button onClick={async () => { if (await addPaid('settle', 'Settled up', Math.abs(bal))) void load() }} className="btn btn-ghost press" style={{ minHeight: 34, marginLeft: '0.5rem' }}>I paid them back</button>}
        </div>
      )}

      {!sharedMode && mode === 'none' && (
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button onClick={() => setMode('paid')} className="btn btn-secondary press" style={{ minHeight: 40 }}>I paid for something</button>
          <button onClick={() => setMode('bill')} className="btn btn-ghost press" style={{ minHeight: 40 }}>+ Shared bill</button>
        </div>
      )}
      {mode !== 'none' && (
        <form onSubmit={async e => {
          e.preventDefault()
          if (mode === 'bill') { await addBill(); return }
          const n = Number(amount)
          if (!label.trim() || !(n > 0)) { setErr('Say what it was and how much.'); return }
          if (await addPaid('expense', label.trim(), n)) { setLabel(''); setAmount(''); setMode('none'); setErr(null); void load() }
        }} style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder={mode === 'bill' ? 'Bill (Internet)' : 'What (Groceries)'} style={{ ...field, flex: '2 1 9rem' }} autoFocus />
          <input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="$" style={{ ...field, flex: '1 1 4.5rem' }} />
          {mode === 'bill' && <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>due on day <input value={day} onChange={e => setDay(e.target.value)} inputMode="numeric" style={{ ...field, width: '3.5rem' }} /></label>}
          <button type="submit" className="btn btn-primary press" style={{ minHeight: 40 }}>Save</button>
          <button type="button" onClick={() => { setMode('none'); setErr(null) }} className="btn btn-ghost press" style={{ minHeight: 40 }}>Cancel</button>
          {mode === 'paid' && <div style={{ width: '100%', fontSize: '0.74rem', color: 'var(--muted)' }}>Split in half between you two.</div>}
        </form>
      )}
      {err && <div style={{ fontSize: '0.8rem', color: 'var(--rose)' }}>{err}</div>}
    </section>
  )
}
