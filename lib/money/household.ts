// The household money glance (2026-10-19): bills due this month and who
// paid. Not budgeting. Shared costs split in half; "settle up" is one person
// paying the other back. Pure functions, tested.

export interface HouseholdBill {
  id: string; space_id: string; label: string; amount: number | null
  /** Day of the month it is due, 1 to 31. */
  due_day: number
  cadence: 'monthly' | 'yearly'
  /** yearly bills: which month, 1 to 12. */
  due_month: number | null
  /** The last month it was marked paid, yyyy-MM. */
  paid_month: string | null
}

export interface HouseholdPayment {
  id: string; space_id: string; paid_by: string; label: string; amount: number
  kind: 'expense' | 'settle'; paid_on: string
}

/** Bills due in the month of `now`, with their due date and whether they are paid. */
export function billsThisMonth(bills: HouseholdBill[], now: Date = new Date()): { bill: HouseholdBill; due: string; paid: boolean; daysLeft: number }[] {
  const y = now.getFullYear(), m = now.getMonth() + 1
  const month = `${y}-${String(m).padStart(2, '0')}`
  const lastDay = new Date(y, m, 0).getDate()
  const today = now.getDate()
  return bills
    .filter(b => b.cadence === 'monthly' || b.due_month === m)
    .map(b => {
      const day = Math.min(b.due_day, lastDay)
      return { bill: b, due: `${month}-${String(day).padStart(2, '0')}`, paid: b.paid_month === month, daysLeft: day - today }
    })
    .sort((a, b) => Number(a.paid) - Number(b.paid) || a.due.localeCompare(b.due))
}

/**
 * How much `me` is owed by the other person (negative: `me` owes them).
 * An expense is split in half; a settle-up is paid in full from one to the other.
 */
export function balanceFor(me: string, payments: HouseholdPayment[]): number {
  let credit = 0
  for (const p of payments) {
    const amt = Number(p.amount) || 0
    const mine = p.paid_by === me
    credit += p.kind === 'settle' ? (mine ? amt : -amt) : (mine ? amt / 2 : -amt / 2)
  }
  return Math.round(credit * 100) / 100
}

export const money = (n: number) => `$${Math.abs(n).toFixed(Math.abs(n) % 1 ? 2 : 0)}`
