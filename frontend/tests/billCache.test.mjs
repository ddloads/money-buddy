import assert from 'node:assert/strict'
import { normalizeUpdatedBillForCache } from '../src/utils/billCache.js'

const updatedFromApi = {
  id: 5,
  name: 'Proton',
  amount: '5.00',
  due_date: '2026-06-29T19:00:00-05:00',
  autopay_enabled: true,
}

const submittedForm = {
  name: 'Proton',
  amount: '5.00',
  due_date: '2026-06-30',
  autopay_enabled: true,
}

assert.equal(
  normalizeUpdatedBillForCache(updatedFromApi, submittedForm).due_date,
  '2026-06-30',
  'after saving an edit, the detail form cache should preserve the date the user submitted instead of briefly showing a timezone-shifted mutation response date'
)

assert.deepEqual(
  normalizeUpdatedBillForCache(null, submittedForm),
  null,
  'missing API responses should stay missing'
)

console.log('bill cache tests passed')
