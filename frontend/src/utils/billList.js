export function getBillItems(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.bills)) return data.bills
  if (Array.isArray(data?.items)) return data.items
  return []
}

export function getBillTotal(data, fallbackItems = getBillItems(data)) {
  if (typeof data?.total === 'number') return data.total
  return fallbackItems.length
}
