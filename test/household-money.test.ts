import { describe, it, expect } from 'vitest'
import { billsThisMonth, balanceFor, type HouseholdBill, type HouseholdPayment } from '@/lib/money/household'

const bill = (id: string, f: Partial<HouseholdBill>): HouseholdBill => ({ id, space_id: 's', label: id, amount: 50, due_day: 1, cadence: 'monthly', due_month: null, paid_month: null, ...f })
const pay = (by: string, amount: number, kind: HouseholdPayment['kind'] = 'expense'): HouseholdPayment => ({ id: Math.random().toString(), space_id: 's', paid_by: by, label: 'x', amount, kind, paid_on: '2026-10-01' })

describe('billsThisMonth', () => {
  const now = new Date(2026, 9, 19) // Oct 19
  it('lists monthly bills and this month\'s yearly ones, unpaid first', () => {
    const r = billsThisMonth([
      bill('rent', { due_day: 1, paid_month: '2026-10' }),
      bill('internet', { due_day: 25 }),
      bill('insurance', { cadence: 'yearly', due_month: 10, due_day: 30 }),
      bill('car', { cadence: 'yearly', due_month: 3 }),
    ], now)
    expect(r.map(x => [x.bill.id, x.paid, x.daysLeft])).toEqual([['internet', false, 6], ['insurance', false, 11], ['rent', true, -18]])
  })
  it('a 31st bill lands on the last day of a short month', () => {
    expect(billsThisMonth([bill('b', { due_day: 31 })], new Date(2026, 10, 5))[0].due).toBe('2026-11-30')
  })
})

describe('balanceFor', () => {
  it('splits shared costs in half', () => {
    expect(balanceFor('a', [pay('a', 80), pay('b', 20)])).toBe(30)
    expect(balanceFor('b', [pay('a', 80), pay('b', 20)])).toBe(-30)
  })
  it('settling up evens it out', () => {
    expect(balanceFor('a', [pay('a', 80), pay('b', 20), pay('b', 30, 'settle')])).toBe(0)
  })
})
