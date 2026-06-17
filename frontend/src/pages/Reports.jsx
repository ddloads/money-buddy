import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChartPieIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import NetWorthTrendChart from '../components/NetWorthTrendChart'
import CashFlowChart from '../components/CashFlowChart'
import CategoryChart from '../components/CategoryChart'
import { useReports } from '../hooks/useReports'
import { useCurrency } from '../hooks/useCurrency'

const RANGES = [
  { value: 3, label: '3M' },
  { value: 6, label: '6M' },
  { value: 12, label: '1Y' },
  { value: 24, label: '2Y' },
]

function StatTile({ label, value, accent = 'text-slate-100', hint }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  )
}

export default function Reports() {
  const navigate = useNavigate()
  const { format } = useCurrency()
  const [months, setMonths] = useState(6)
  const { data, isLoading, isError } = useReports(months)

  const totals = data?.totals
  const hasAnyData =
    data && (data.cash_flow?.some((c) => c.income || c.expenses) || data.category_spending?.length)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <ChartPieIcon className="h-7 w-7 text-emerald-400" />
            Reports
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Cash flow, net worth, and spending trends from your transactions.
          </p>
        </div>
        <div className="flex rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setMonths(r.value)}
              className={`px-3.5 py-2 text-sm font-medium transition-colors ${
                months === r.value
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:bg-white/[0.06]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {isError ? (
        <div className="card p-8 text-center"><p className="text-slate-300">Failed to load reports.</p></div>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile label="Income" value={format(totals?.income ?? 0)} accent="text-blue-300" hint={`last ${months} months`} />
            <StatTile label="Expenses" value={format(totals?.expenses ?? 0)} accent="text-amber-300" hint={`${format(totals?.avg_monthly_spend ?? 0)}/mo avg`} />
            <StatTile
              label={totals && totals.net < 0 ? 'Net loss' : 'Net saved'}
              value={`${totals && totals.net < 0 ? '-' : ''}${format(Math.abs(totals?.net ?? 0))}`}
              accent={totals && totals.net < 0 ? 'text-rose-400' : 'text-emerald-400'}
            />
            <StatTile
              label="Savings rate"
              value={`${totals?.savings_rate ?? 0}%`}
              accent={(totals?.savings_rate ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}
              hint="of income kept"
            />
          </div>

          {/* Empty state nudge */}
          {!isLoading && !hasAnyData && (
            <div className="card p-10 text-center">
              <div className="text-5xl mb-3">📊</div>
              <p className="text-lg font-semibold text-slate-100 mb-1">No transaction data yet</p>
              <p className="text-sm text-slate-400 mb-4">
                Add accounts and import or enter transactions, and your reports will fill in here.
              </p>
              <button onClick={() => navigate('/transactions')} className="btn-primary mx-auto">
                Add transactions
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Net worth trend */}
          <div className="card p-5">
            <div className="mb-4">
              <h2 className="section-title">Net Worth Trend</h2>
              <p className="text-xs text-slate-500 mt-0.5">Month-end net worth across all accounts</p>
            </div>
            <NetWorthTrendChart data={data?.net_worth_trend} loading={isLoading && !data} />
          </div>

          {/* Cash flow */}
          <div className="card p-5">
            <div className="mb-4">
              <h2 className="section-title">Cash Flow</h2>
              <p className="text-xs text-slate-500 mt-0.5">Money in vs. out each month, with net</p>
            </div>
            <CashFlowChart data={data?.cash_flow} loading={isLoading && !data} />
          </div>

          {/* Spending by category */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="section-title">Spending by Category</h2>
                <p className="text-xs text-slate-500 mt-0.5">Where your money went over this period</p>
              </div>
              <button
                onClick={() => navigate('/transactions')}
                className="text-sm text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                Transactions
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <CategoryChart
              data={data?.category_spending}
              loading={isLoading && !data}
              noun="transaction"
              emptyText="No spending in this period yet"
            />
          </div>
        </>
      )}
    </div>
  )
}
