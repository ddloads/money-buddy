export function normalizeUpdatedBillForCache(updated, submitted) {
  if (!updated) return updated

  return {
    ...updated,
    due_date: submitted?.due_date || updated.due_date,
  }
}
