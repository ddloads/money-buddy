export function normalizeBillFormData(data) {
  const categoryId = data.category_id === '' || data.category_id == null
    ? null
    : Number(data.category_id)
  const recurrence = data.recurrence || ''

  const normalized = {
    ...data,
    category_id: Number.isNaN(categoryId) ? null : categoryId,
    autopay_enabled: Boolean(data.autopay_enabled),
    is_recurring: recurrence !== '',
    recurrence_interval: recurrence || null,
  }

  delete normalized.recurrence
  delete normalized.reminder_days

  return normalized
}
