import { format } from 'date-fns'

function parseCalendarDate(value) {
  if (!value) return new Date()

  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }

  const text = String(value)
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  const parsed = new Date(text)
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
}

export function toDateInputValue(value) {
  if (!value) return format(new Date(), 'yyyy-MM-dd')

  const text = String(value)
  const match = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (match) return match[1]

  return format(parseCalendarDate(value), 'yyyy-MM-dd')
}

export function toCalendarDate(value) {
  return parseCalendarDate(value)
}

export function formatBillDate(value, pattern) {
  return format(parseCalendarDate(value), pattern)
}
