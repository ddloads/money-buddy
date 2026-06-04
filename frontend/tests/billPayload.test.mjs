import assert from 'node:assert/strict'
import { normalizeBillFormData } from '../src/utils/billPayload.js'

const oneTime = normalizeBillFormData({
  name: 'Electric',
  amount: '42.50',
  due_date: '2026-06-04',
  category_id: '',
  recurrence: '',
  autopay_enabled: false,
  reminder_days: '3',
  notes: '',
})

assert.equal(oneTime.category_id, null)
assert.equal(oneTime.is_recurring, false)
assert.equal(oneTime.autopay_enabled, false)
assert.equal(oneTime.recurrence_interval, null)
assert.equal(oneTime.recurrence, undefined)
assert.equal(oneTime.reminder_days, undefined)

const recurring = normalizeBillFormData({
  name: 'Rent',
  amount: '1000',
  due_date: '2026-06-01',
  category_id: '12',
  recurrence: 'monthly',
  autopay_enabled: true,
  reminder_days: '5',
  notes: 'apartment',
})

assert.equal(recurring.category_id, 12)
assert.equal(recurring.is_recurring, true)
assert.equal(recurring.autopay_enabled, true)
assert.equal(recurring.recurrence_interval, 'monthly')
assert.equal(recurring.recurrence, undefined)
assert.equal(recurring.reminder_days, undefined)

console.log('bill payload tests passed')
