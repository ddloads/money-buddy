import assert from 'node:assert/strict'
import { formatBillDate, toDateInputValue } from '../src/utils/billDates.js'

const utcMidnightDueDate = '2026-06-20T00:00:00Z'

assert.equal(
  toDateInputValue(utcMidnightDueDate),
  '2026-06-20',
  'date input values should preserve the API calendar date, not shift by local timezone'
)

assert.equal(
  formatBillDate(utcMidnightDueDate, 'MMM d'),
  'Jun 20',
  'bill card labels should preserve the API calendar date, not shift by local timezone'
)

assert.equal(toDateInputValue('2026-06-20'), '2026-06-20')
assert.equal(formatBillDate('2026-06-20', 'MMM d, yyyy'), 'Jun 20, 2026')

console.log('bill date tests passed')
