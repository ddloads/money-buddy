import { isPast, isToday, isTomorrow, differenceInDays } from 'date-fns'
import { CheckCircleIcon, ClockIcon, ExclamationCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import { useNavigate } from 'react-router-dom'
import CategoryBadge from './CategoryBadge'
import Spinner from './Spinner'
import { formatBillDate, toCalendarDate } from '../utils/billDates'
import { useCurrency } from '../hooks/useCurrency'

function getDueStatus(dueDateStr, isPaid) {
  if (isPaid) return { label: 'Paid', color: 'green', Icon: CheckCircleSolid }

  const due = toCalendarDate(dueDateStr)
  if (isPast(due) && !isToday(due)) {
    return { label: 'Overdue', color: 'red', Icon: ExclamationCircleIcon }
  }
  if (isToday(due)) return { label: 'Due Today', color: 'yellow', Icon: ClockIcon }
  if (isTomorrow(due)) return { label: 'Due Tomorrow', color: 'yellow', Icon: ClockIcon }

  const days = differenceInDays(due, new Date())
  if (days <= 7) return { label: `Due in ${days}d`, color: 'yellow', Icon: ClockIcon }
  return { label: `Due ${formatBillDate(dueDateStr, 'MMM d')}`, color: 'gray', Icon: ClockIcon }
}

const colorMap = {
  green: 'badge-green',
  red: 'badge-red',
  yellow: 'badge-yellow',
  gray: 'badge-gray',
}

export default function BillCard({ bill, onMarkPaid, isMarkingPaid }) {
  const navigate = useNavigate()
  const { format } = useCurrency()
  const status = getDueStatus(bill.due_date, bill.is_paid)

  const handleCardClick = (e) => {
    // Don't navigate if clicking the pay button
    if (e.target.closest('[data-pay-btn]')) return
    navigate(`/bills/${bill.id}`)
  }

  const handlePay = (e) => {
    e.stopPropagation()
    if (!bill.is_paid) {
      onMarkPaid?.(bill)
    }
  }

  return (
    <div
      onClick={handleCardClick}
      className="card-interactive p-4 cursor-pointer animate-fade-in group"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <h3 className="font-semibold text-slate-100 truncate group-hover:text-emerald-300 transition-colors">
              {bill.name}
            </h3>
            {bill.is_recurring && (
              <span className="text-xs text-slate-500 flex-shrink-0">↻ Recurring</span>
            )}
            {bill.autopay_enabled && (
              <span className="text-xs text-emerald-400 flex items-center gap-1 flex-shrink-0">
                <SparklesIcon className="h-3 w-3" />
                Auto Pay
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {bill.category && <CategoryBadge category={bill.category} />}
            <span className={colorMap[status.color]}>
              <status.Icon className="h-3 w-3" />
              {status.label}
            </span>
          </div>

          {bill.notes && (
            <p className="mt-1.5 text-xs text-slate-500 truncate">{bill.notes}</p>
          )}
        </div>

        {/* Right: amount + action */}
        <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end sm:justify-start flex-shrink-0 w-full sm:w-auto">
          <span className={`text-base sm:text-lg font-bold ${bill.is_paid ? 'text-emerald-400' : 'text-white'}`}>
            {format(bill.amount)}
          </span>

          {!bill.is_paid ? (
            <button
              data-pay-btn
              onClick={handlePay}
              disabled={isMarkingPaid}
              className="btn-primary text-xs px-3 py-1.5 flex-shrink-0"
            >
              {isMarkingPaid ? (
                <span className="flex items-center gap-1">
                  <Spinner className="h-3 w-3" />
                  Paying…
                </span>
              ) : (
                <>
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  Pay
                </>
              )}
            </button>
          ) : (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <CheckCircleSolid className="h-4 w-4" />
              Paid
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
