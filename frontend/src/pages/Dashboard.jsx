import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  PlusIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import StatCard from '../components/StatCard'
import UpcomingBills from '../components/UpcomingBills'
import MonthlyChart from '../components/MonthlyChart'
import CategoryChart from '../components/CategoryChart'
import YearlyChart from '../components/YearlyChart'
import IncomeVsExpensesChart from '../components/IncomeVsExpensesChart'
import { useDashboardSummary, useUpcomingBills, useMonthlyStats, useCategoryStats, useYearlyStats, useIncomeVsExpenses } from '../hooks/useDashboard'
import { useAuthStore } from '../store/authStore'
import { useCurrency } from '../hooks/useCurrency'

const WEEKLY_DIVISOR = 4.333

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { format: formatCurrency } = useCurrency()
  const [showYearly, setShowYearly] = useState(false)
  const [incomePeriod, setIncomePeriod] = useState('monthly')
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: upcoming, isLoading: upcomingLoading } = useUpcomingBills(7)
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyStats(6)
  const { data: categories, isLoading: categoriesLoading } = useCategoryStats()
  const { data: yearly, isLoading: yearlyLoading } = useYearlyStats()
  const { data: incomeVsExpenses, isLoading: incomeVsExpensesLoading } = useIncomeVsExpenses(6)

  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'there'
  const today = format(new Date(), 'EEEE, MMMM d')

  const monthlyIncome = parseFloat(summary?.monthly_income ?? 0)
  const monthlyBills = parseFloat(summary?.amount_due_this_month ?? 0)
  const displayedIncome = incomePeriod === 'weekly' ? monthlyIncome / WEEKLY_DIVISOR : monthlyIncome
  const displayedBills = incomePeriod === 'weekly' ? monthlyBills / WEEKLY_DIVISOR : monthlyBills

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-header">Good day, {firstName}! 👋</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{today}</p>
        </div>
        <button
          onClick={() => navigate('/bills/new')}
          className="btn-primary w-full sm:w-auto sm:flex-shrink-0"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Add Bill</span>
        </button>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Bills"
          value={summaryLoading ? '…' : (summary?.total_bills ?? 0)}
          subtitle="This month"
          Icon={DocumentTextIcon}
          color="emerald"
          loading={summaryLoading}
        />
        <StatCard
          title="Paid"
          value={summaryLoading ? '…' : (summary?.paid_bills ?? 0)}
          subtitle={`${summary?.paid_percentage ?? 0}% complete`}
          Icon={CheckCircleIcon}
          color="blue"
          loading={summaryLoading}
        />
        <StatCard
          title="Unpaid"
          value={summaryLoading ? '…' : (summary?.unpaid_bills ?? 0)}
          subtitle={summary?.overdue_bills ? `${summary.overdue_bills} overdue` : 'All on track'}
          Icon={ClockIcon}
          color={summary?.overdue_bills > 0 ? 'red' : 'yellow'}
          loading={summaryLoading}
        />
        {/* Income card with period toggle */}
        {summaryLoading ? (
          <div className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="skeleton h-3 w-24 mb-3" />
                <div className="skeleton h-7 w-16 mb-2" />
                <div className="skeleton h-3 w-20" />
              </div>
              <div className="skeleton h-10 w-10 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="card p-5 hover:shadow-card-hover transition-shadow duration-200 animate-fade-in">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Income</p>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 text-xs">
                    <button
                      onClick={() => setIncomePeriod('monthly')}
                      className={`px-1.5 py-0.5 font-medium transition-colors ${
                        incomePeriod === 'monthly'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      Mo
                    </button>
                    <button
                      onClick={() => setIncomePeriod('weekly')}
                      className={`px-1.5 py-0.5 font-medium transition-colors ${
                        incomePeriod === 'weekly'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      Wk
                    </button>
                  </div>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 truncate">
                  {formatCurrency(displayedIncome)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  vs {formatCurrency(displayedBills)} in bills
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex-shrink-0">
                <BanknotesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming bills (2/3 width on desktop) */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="section-title">Upcoming Bills</h2>
              <button
                onClick={() => navigate('/bills')}
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                View all
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <UpcomingBills bills={upcoming} loading={upcomingLoading} />
          </div>
        </div>

        {/* Quick actions / tips (1/3 width) */}
        <div className="space-y-4">
          {/* Progress ring / mini summary */}
          <div className="card p-5">
            <h2 className="section-title mb-4">Monthly Progress</h2>
            {summaryLoading ? (
              <div className="space-y-3">
                <div className="skeleton h-3 w-full rounded-full" />
                <div className="skeleton h-3 w-3/4 rounded-full" />
                <div className="skeleton h-4 w-24 mt-2" />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                    <span>Bills paid</span>
                    <span>{summary?.paid_percentage ?? 0}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                      style={{ width: `${summary?.paid_percentage ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="pt-1 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Amount paid</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(summary?.amount_paid_this_month ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Still owed</span>
                    <span className="font-semibold text-red-500">
                      {formatCurrency(Math.max(0, parseFloat(summary?.amount_due_this_month ?? 0) - parseFloat(summary?.amount_paid_this_month ?? 0)))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick add */}
          <div className="card p-5 bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-700 dark:to-emerald-900 border-0">
            <h3 className="text-white font-semibold mb-1">Track a new bill</h3>
            <p className="text-emerald-100 text-xs mb-3">
              Never miss a payment again.
            </p>
            <button
              onClick={() => navigate('/bills/new')}
              className="btn bg-white text-emerald-700 hover:bg-emerald-50 text-sm py-2 px-4 font-semibold w-full"
            >
              <PlusIcon className="h-4 w-4" />
              Add Bill
            </button>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="mb-4">
            <h2 className="section-title">Monthly Overview</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Bills total, paid & unpaid — last 6 months
            </p>
          </div>
          <MonthlyChart data={monthly} loading={monthlyLoading} />
        </div>

        <div className="card p-5">
          <div className="mb-4">
            <h2 className="section-title">Spending by Category</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              This month's bills broken down by category
            </p>
          </div>
          <CategoryChart data={categories} loading={categoriesLoading} />
        </div>
      </div>

      {/* Income vs Expenses chart */}
      <div className="card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
          <div>
            <h2 className="section-title">Income vs Expenses</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Monthly income compared to your bill expenses — last 6 months
            </p>
          </div>
          <button
            onClick={() => navigate('/income')}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium flex-shrink-0"
          >
            Manage income
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
        <IncomeVsExpensesChart data={incomeVsExpenses} loading={incomeVsExpensesLoading} />
      </div>

      {/* Year-over-year chart */}
      <div className="card p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h2 className="section-title">Year-over-Year</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Monthly spending comparison across years
            </p>
          </div>
          <button
            onClick={() => setShowYearly((v) => !v)}
            className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            {showYearly ? 'Hide' : 'Show'}
          </button>
        </div>
        {showYearly && <YearlyChart data={yearly} loading={yearlyLoading} />}
        {!showYearly && (
          <div className="h-12 flex items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">Click "Show" to compare years</p>
          </div>
        )}
      </div>
    </div>
  )
}
