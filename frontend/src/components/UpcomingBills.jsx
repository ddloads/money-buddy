import { differenceInDays, isToday, isTomorrow } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import CategoryBadge from './CategoryBadge'
import { formatBillDate, toCalendarDate } from '../utils/billDates'

function DueBadge({ dateStr }) {
  const due = toCalendarDate(dateStr)
  const days = differenceInDays(due, new Date())

  if (isToday(due)) {
    return (
      <span className="badge-yellow flex-shrink-0">
        <ClockIcon className="h-3 w-3 mr-1 inline" />
        Today
      </span>
    )
  }
  if (isTomorrow(due)) {
    return (
      <span className="badge-yellow flex-shrink-0">
        <ClockIcon className="h-3 w-3 mr-1 inline" />
        Tomorrow
      </span>
    )
  }
  if (days < 0) {
    return (
      <span className="badge-red flex-shrink-0">
        <ExclamationTriangleIcon className="h-3 w-3 mr-1 inline" />
        Overdue
      </span>
    )
  }
  return (
    <span className="badge-gray flex-shrink-0">
      {formatBillDate(dateStr, 'MMM d')}
    </span>
  )
}

export default function UpcomingBills({ bills, loading }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="skeleton h-10 w-10 rounded-lg flex-shrink-0" />
            <div className="flex-1">
              <div className="skeleton h-3.5 w-32 mb-2" />
              <div className="skeleton h-3 w-20" />
            </div>
            <div className="skeleton h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    )
  }

  if (!bills || bills.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🎉</div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">All caught up!</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">No upcoming bills this week.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {bills.map((bill) => (
        <button
          key={bill.id}
          onClick={() => navigate(`/bills/${bill.id}`)}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 text-left group"
        >
          {/* Category color dot / icon */}
          <div
            className="h-10 w-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
            style={{
              backgroundColor: bill.category?.color
                ? `${bill.category.color}20`
                : '#10b98120',
            }}
          >
            {bill.category?.icon || '📄'}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
              {bill.name}
            </p>
            {bill.category && (
              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                {bill.category.name}
              </p>
            )}
          </div>

          {/* Amount + due */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
              ${parseFloat(bill.amount).toFixed(2)}
            </span>
            <DueBadge dateStr={bill.due_date} />
          </div>
        </button>
      ))}
    </div>
  )
}
