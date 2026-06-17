import { useNavigate } from 'react-router-dom'
import {
  CreditCardIcon,
  CalendarDaysIcon,
  ArrowTrendingDownIcon,
  ArrowRightIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { useCurrency } from '../hooks/useCurrency'

function formatPayoff(item) {
  if (!item.payable) return 'Payment too low'
  if (!item.estimated_payoff_date) return '—'
  // Backend sends "YYYY-Mon"; show as "Mon YYYY".
  const [year, month] = item.estimated_payoff_date.split('-')
  return `${month} ${year}`
}

export default function DebtOverview({ data, loading, leftoverThisCheck }) {
  const navigate = useNavigate()
  const { format: formatCurrency } = useCurrency()

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl bg-white/[0.03] p-4">
              <div className="skeleton h-3 w-20 mb-2" />
              <div className="skeleton h-6 w-16" />
            </div>
          ))}
        </div>
        <div className="skeleton h-12 w-full rounded-xl" />
      </div>
    )
  }

  if (!data || data.debt_count === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">🎯</div>
        <p className="text-sm font-medium text-slate-200">No tracked debt</p>
        <p className="text-xs text-slate-500 mb-3">
          Add a remaining balance and interest rate to a bill to track payoff progress.
        </p>
        <button onClick={() => navigate('/bills')} className="btn-secondary text-sm gap-1.5">
          View bills
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const canApply = typeof leftoverThisCheck === 'number' && leftoverThisCheck > 0

  return (
    <div className="space-y-4">
      {/* Top stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-white/[0.03] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <CreditCardIcon className="h-3.5 w-3.5" />
            Total debt
          </div>
          <p className="text-xl font-bold text-rose-300">{formatCurrency(data.total_debt)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            across {data.debt_count} {data.debt_count === 1 ? 'account' : 'accounts'}
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
            Monthly payments
          </div>
          <p className="text-xl font-bold text-slate-100">{formatCurrency(data.monthly_payment)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {formatCurrency(data.monthly_interest)}/mo interest
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <CalendarDaysIcon className="h-3.5 w-3.5" />
            Projected interest
          </div>
          <p className="text-xl font-bold text-amber-300">{formatCurrency(data.projected_interest)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">until fully paid off</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-4">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <BanknotesIcon className="h-3.5 w-3.5" />
            Free this paycheck
          </div>
          <p className={`text-xl font-bold ${canApply ? 'text-emerald-300' : 'text-slate-400'}`}>
            {typeof leftoverThisCheck === 'number' ? formatCurrency(Math.max(0, leftoverThisCheck)) : '—'}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">available toward debt</p>
        </div>
      </div>

      {/* Affordability nudge */}
      {canApply && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          You have <span className="font-semibold">{formatCurrency(leftoverThisCheck)}</span> left after
          this paycheck&apos;s bills. Putting it toward{' '}
          <span className="font-semibold">{data.items[data.items.length - 1]?.name}</span> (your
          smallest balance) would knock down debt faster.
        </div>
      )}

      {/* Per-debt breakdown */}
      <div className="space-y-1.5">
        {data.items.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(`/bills/${item.id}`)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.05] transition-colors text-left group"
          >
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: item.category?.color ? `${item.category.color}26` : '#f43f5e26' }}
            >
              {item.category?.icon || '💳'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-200 truncate group-hover:text-emerald-300">
                {item.name}
              </p>
              <p className="text-xs text-slate-500">
                {item.interest_rate > 0 ? `${item.interest_rate}% APR · ` : ''}
                {item.payable && item.months_remaining
                  ? `${item.months_remaining} mo left · paid off ${formatPayoff(item)}`
                  : formatPayoff(item)}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-rose-300">{formatCurrency(item.remaining_balance)}</p>
              <p className="text-[11px] text-slate-500">{formatCurrency(item.monthly_payment)}/mo</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
