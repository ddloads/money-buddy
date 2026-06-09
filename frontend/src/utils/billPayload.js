export function normalizeBillFormData(data) {
  const categoryId = data.category_id === '' || data.category_id == null
    ? null
    : Number(data.category_id)
  const recurrence = data.recurrence || ''
  const interestRate = data.interest_rate === '' || data.interest_rate == null
    ? null
    : Number(data.interest_rate)

  const normalized = {
    ...data,
    category_id: Number.isNaN(categoryId) ? null : categoryId,
    autopay_enabled: Boolean(data.autopay_enabled),
    is_recurring: recurrence !== '',
    recurrence_interval: recurrence || null,
    interest_rate: Number.isNaN(interestRate) ? null : interestRate,
  }

  delete normalized.recurrence
  delete normalized.reminder_days

  return normalized
}
