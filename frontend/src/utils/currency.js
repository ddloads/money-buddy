export function formatAmount(amount, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(amount) || 0)
  } catch {
    return `$${parseFloat(amount || 0).toFixed(2)}`
  }
}

export function getCurrencySymbol(currency = 'USD') {
  try {
    return (
      new Intl.NumberFormat('en-US', { style: 'currency', currency })
        .formatToParts(0)
        .find((p) => p.type === 'currency')?.value || '$'
    )
  } catch {
    return '$'
  }
}
