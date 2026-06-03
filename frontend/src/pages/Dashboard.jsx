import { useNavigate } from 'react-router-dom'
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import StatCard from '../components/StatCard'
import UpcomingBills from '../components/UpcomingBills'
import MonthlyChart from '../components/MonthlyChart'
import { useDashboardSummary, useUpcomingBills, useMonthlyStats } from '../hooks/useDashboard'
import { useAuthStore } from '../store/authStore'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: upcoming, isLoading: upcomingLoading } = useUpcomingBills(7)
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyStats(6)

  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'there'
  const today = format(new Date(), 'EEEE, MMMM d')

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-header">Good day, {firstName}! 👋</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{today}</p>
        </div>
        <button
          onClick={() => navigate('/bills/new')}
          className="btn-primary flex-shrink-0"
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
        <StatCard
          title="Due This Month"
          value={summaryLoading ? '…' : `$${parseFloat(summary?.amount_due_this_month ?? 0).toFixed(2)}`}
          subtitle={`$${parseFloat(summary?.amount_paid_this_month ?? 0).toFixed(2)} paid so far`}
          Icon={CurrencyDollarIcon}
          color="purple"
          loading={summaryLoading}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming bills (2/3 width on desktop) */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
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
                      ${parseFloat(summary?.amount_paid_this_month ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Still owed</span>
                    <span className="font-semibold text-red-500">
                      ${parseFloat(summary?.amount_due_this_month ?? 0).toFixed(2)}
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

      {/* Monthly chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title">Monthly Overview</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Bills total, paid & unpaid — last 6 months
            </p>
          </div>
        </div>
        <MonthlyChart data={monthly} loading={monthlyLoading} />
      </div>
    </div>
  )
}
