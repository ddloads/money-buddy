export const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking', icon: '🏦' },
  { value: 'savings', label: 'Savings', icon: '🐖' },
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'credit_card', label: 'Credit Card', icon: '💳' },
  { value: 'loan', label: 'Loan', icon: '🏷️' },
  { value: 'investment', label: 'Investment', icon: '📈' },
  { value: 'other', label: 'Other', icon: '📂' },
]

export const LIABILITY_TYPES = ['credit_card', 'loan']

export function isLiabilityType(type) {
  return LIABILITY_TYPES.includes(type)
}

export function typeMeta(type) {
  return ACCOUNT_TYPES.find((t) => t.value === type) || { label: type, icon: '📂' }
}
