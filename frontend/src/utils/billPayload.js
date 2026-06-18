export function normalizeBillFormData(data) {
  const categoryId = data.category_id === '' || data.category_id == null
    ? null
    : Number(data.category_id)
  const recurrence = data.recurrence || ''
  const interestRate = data.interest_rate === '' || data.interest_rate == null
    ? null
    : Number(data.interest_rate)
  const remainingBalance = data.remaining_balance === '' || data.remaining_balance == null
    ? null
    : Number(data.remaining_balance)
  const fundingAccountId = data.funding_account_id === '' || data.funding_account_id == null
    ? null
    : Number(data.funding_account_id)

  const normalized = {
    ...data,
    category_id: Number.isNaN(categoryId) ? null : categoryId,
    funding_account_id: Number.isNaN(fundingAccountId) ? null : fundingAccountId,
    autopay_enabled: Boolean(data.autopay_enabled),
    is_recurring: recurrence !== '',
    recurrence_interval: recurrence || null,
    interest_rate: Number.isNaN(interestRate) ? null : interestRate,
    remaining_balance: Number.isNaN(remainingBalance) ? null : remainingBalance,
  }

  delete normalized.recurrence
  delete normalized.reminder_days

  return normalized
}
