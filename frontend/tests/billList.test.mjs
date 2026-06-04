import assert from 'node:assert/strict'
import { getBillItems, getBillTotal } from '../src/utils/billList.js'

const bill = { id: 1, name: 'Electric' }

assert.deepEqual(getBillItems([bill]), [bill])
assert.equal(getBillTotal([bill]), 1)

const legacyShape = { bills: [bill] }
assert.deepEqual(getBillItems(legacyShape), [bill])
assert.equal(getBillTotal(legacyShape), 1)

const paginatedShape = {
  items: [bill],
  total: 12,
  page: 1,
  page_size: 20,
  pages: 1,
}
assert.deepEqual(getBillItems(paginatedShape), [bill])
assert.equal(getBillTotal(paginatedShape), 12)

assert.deepEqual(getBillItems({ items: null }), [])
assert.equal(getBillTotal({ items: null }), 0)
assert.deepEqual(getBillItems(null), [])
assert.equal(getBillTotal(null), 0)

console.log('bill list tests passed')
