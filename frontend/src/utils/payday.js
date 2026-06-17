import {
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  isBefore,
  startOfDay,
} from 'date-fns'
import { toCalendarDate } from './billDates'

const STEP = {
  weekly: (d) => addWeeks(d, 1),
  biweekly: (d) => addWeeks(d, 2),
  monthly: (d) => addMonths(d, 1),
  quarterly: (d) => addQuarters(d, 1),
  yearly: (d) => addYears(d, 1),
}

/**
 * Compute the next expected payday for an income source on or after `from`.
 *
 * Recurring sources step forward from their start date by the frequency
 * interval. One-time sources return their start date only if it is still in
 * the future (otherwise it has already been received). Returns a Date, or
 * null when no upcoming payday can be determined.
 */
export function nextPayday(income, from = new Date()) {
  if (!income || !income.is_active) return null

  const today = startOfDay(from)

  if (income.frequency === 'one_time') {
    if (!income.start_date) return null
    const d = startOfDay(toCalendarDate(income.start_date))
    return isBefore(d, today) ? null : d
  }

  const step = STEP[income.frequency]
  if (!step) return null

  let pay = startOfDay(income.start_date ? toCalendarDate(income.start_date) : today)
  let guard = 0
  while (isBefore(pay, today) && guard < 2000) {
    pay = startOfDay(step(pay))
    guard += 1
  }
  return pay
}

/**
 * Return the soonest upcoming payday across a list of income sources,
 * as `{ date, income }`, or null if none.
 */
export function soonestPayday(incomes = [], from = new Date()) {
  let best = null
  for (const income of incomes) {
    const date = nextPayday(income, from)
    if (date && (!best || isBefore(date, best.date))) {
      best = { date, income }
    }
  }
  return best
}
