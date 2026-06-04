import { useAuthStore } from '../store/authStore'
import { formatAmount as fmt, getCurrencySymbol } from '../utils/currency'

export function useCurrency() {
  const { user } = useAuthStore()
  const currency = user?.currency || 'USD'
  return {
    currency,
    symbol: getCurrencySymbol(currency),
    format: (amount) => fmt(amount, currency),
  }
}
