import { format, parseISO, subDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  BanknotesIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { useCurrency } from '../hooks/useCurrency'

function periodLabel(index) {
  if (index === 0) return 'This paycheck'
  if (index === 1) return 'Next paycheck'
  return `In ${index} paychecks`
}

function dateRange(start, end) {
  // `end` is the exclusive next payday — show the day before as the period close.
  const from = parseISO(start)
  const to = subDays(parseISO(end), 1)
  return `${format(from, 'MMM d')} – ${format(to, 'MMM d')}`
}

function PeriodCard({ period }) {
  const navigate = useNavigate()
  const { format: formatCurrency } = useCurrency()
  const leftoverPositive = period.leftover >= 0

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">{periodLabel(period.index)}</p>
          <p className="text-xs text-slate-500">{dateRange(period.start, period.end)}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-xs text-slate-500">Leftover</p>
          <p className={`text-base font-bold ${leftoverPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatCurrency(period.leftover)}
          </p>
        </div>
      </div>

      {/* Income vs bills mini-bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
        <span className="flex items-center gap-1">
          <BanknotesIcon className="h-3.5 w-3.5 text-blue-400" />
          {formatCurrency(period.income)} in
        </span>
        <span>{formatCurrency(period.bills_total)} in bills</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-3">
        <div
          className={`h-full rounded-full ${leftoverPositive ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-rose-500'}`}
          style={{
            width: `${period.income > 0 ? Math.min(100, (period.bills_total / period.income) * 100) : (period.bills_total > 0 ? 100 : 0)}%`,
          }}
        />
      </div>

      {/* Bills in this period */}
      {period.bills.length === 0 ? (
        <p className="text-xs text-slate-500 py-2 text-center">No bills due this period 🎉</p>
      ) : (
        <div className="space-y-1 flex-1">
          {period.bills.map((bill) => (
            <button
              key={bill.id}
              onClick={() => navigate(`/bills/${bill.id}`)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors text-left group"
            >
              <div
                className="h-7 w-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{ backgroundColor: bill.category?.color ? `${bill.category.color}26` : '#10b98126' }}
              >
                {bill.category?.icon || '📄'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-200 truncate group-hover:text-emerald-300">
                  {bill.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {format(parseISO(bill.due_date), 'MMM d')}
                </p>
              </div>
              {bill.overdue && (
                <span className="badge-red flex-shrink-0 !px-1.5 !py-0.5 text-[10px]">
                  <ExclamationTriangleIcon className="h-2.5 w-2.5" />
                  Overdue
                </span>
              )}
              <span className="text-xs font-bold text-white flex-shrink-0">
                {formatCurrency(bill.amount)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function PaycheckPlanner({ data, loading }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="skeleton h-4 w-28 mb-2" />
            <div className="skeleton h-3 w-20 mb-4" />
            <div className="skeleton h-2 w-full rounded-full mb-3" />
            <div className="skeleton h-8 w-full rounded-lg mb-1.5" />
            <div className="skeleton h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    )
  }

  if (!data?.has_schedule) {
    return (
      <div className="text-center py-6">
        <p className="text-sm font-medium text-slate-200 mb-1">No paycheck schedule yet</p>
        <p className="text-xs text-slate-500 mb-3">
          Add a recurring income source so we can split your bills across paychecks.
        </p>
        <button
          onClick={() => navigate('/income')}
          className="btn-secondary text-sm gap-1.5"
        >
          Add income
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {data.periods.map((period) => (
        <PeriodCard key={period.index} period={period} />
      ))}
    </div>
  )
}
