import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  PlusIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  Cog6ToothIcon,
  EyeIcon,
  ArrowPathIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import StatCard from '../components/StatCard'
import UpcomingBills from '../components/UpcomingBills'
import MonthlyChart from '../components/MonthlyChart'
import CategoryChart from '../components/CategoryChart'
import YearlyChart from '../components/YearlyChart'
import IncomeVsExpensesChart from '../components/IncomeVsExpensesChart'
import CalendarWidget from '../components/CalendarWidget'
import DashboardWidget from '../components/DashboardWidget'
import PaycheckPlanner from '../components/PaycheckPlanner'
import DebtOverview from '../components/DebtOverview'
import {
  useDashboardSummary,
  useUpcomingBills,
  useMonthlyStats,
  useCategoryStats,
  useYearlyStats,
  useIncomeVsExpenses,
  usePaycheckPlan,
  useDebtOverview,
} from '../hooks/useDashboard'
import { useAuthStore } from '../store/authStore'
import { useCurrency } from '../hooks/useCurrency'
import { useDashboardStore, DEFAULT_WIDGETS } from '../store/dashboardStore'

const WEEKLY_DIVISOR = 4.333

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { format: formatCurrency } = useCurrency()
  const [isEditing, setIsEditing] = useState(false)
  const [showYearly, setShowYearly] = useState(false)
  const [incomePeriod, setIncomePeriod] = useState('monthly')

  const { order, hidden, settings, reorder, hide, show, setSetting, reset } = useDashboardStore()

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary()
  const { data: upcoming, isLoading: upcomingLoading } = useUpcomingBills(settings.upcomingDays)
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyStats(6)
  const { data: categories, isLoading: categoriesLoading } = useCategoryStats()
  const { data: yearly, isLoading: yearlyLoading } = useYearlyStats()
  const { data: incomeVsExpenses, isLoading: incomeVsExpensesLoading } = useIncomeVsExpenses(6)
  const { data: paycheckPlan, isLoading: paycheckLoading } = usePaycheckPlan(settings.paycheckPeriods)
  const { data: debt, isLoading: debtLoading } = useDebtOverview()

  const leftoverThisCheck = paycheckPlan?.periods?.[0]?.leftover ?? null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const firstName = user?.first_name || user?.name?.split(' ')[0] || 'there'
  const today = format(new Date(), 'EEEE, MMMM d')

  const monthlyIncome = parseFloat(summary?.monthly_income ?? 0)
  const monthlyBills = parseFloat(summary?.amount_due_this_month ?? 0)
  const displayedIncome = incomePeriod === 'weekly' ? monthlyIncome / WEEKLY_DIVISOR : monthlyIncome
  const displayedBills = incomePeriod === 'weekly' ? monthlyBills / WEEKLY_DIVISOR : monthlyBills

  const visibleIds = order.filter((id) => !hidden.includes(id))
  const hiddenWidgets = DEFAULT_WIDGETS.filter((w) => hidden.includes(w.id))

  const handleDragEnd = ({ active, over }) => {
    if (over && active.id !== over.id) {
      reorder(active.id, over.id)
    }
  }

  const renderWidget = (id) => {
    switch (id) {
      case 'summary':
        return (
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
            {summaryLoading ? (
              <div className="card p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="skeleton h-3 w-24 mb-3" />
                    <div className="skeleton h-7 w-16 mb-2" />
                    <div className="skeleton h-3 w-20" />
                  </div>
                  <div className="skeleton h-10 w-10 rounded-xl" />
                </div>
              </div>
            ) : (
              <div className="card-interactive p-5 animate-fade-in">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-400">Income</p>
                      <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
                        <button
                          onClick={() => setIncomePeriod('monthly')}
                          className={`px-1.5 py-0.5 font-medium transition-colors ${
                            incomePeriod === 'monthly'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:bg-white/[0.06]'
                          }`}
                        >
                          Mo
                        </button>
                        <button
                          onClick={() => setIncomePeriod('weekly')}
                          className={`px-1.5 py-0.5 font-medium transition-colors ${
                            incomePeriod === 'weekly'
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-400 hover:bg-white/[0.06]'
                          }`}
                        >
                          Wk
                        </button>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-blue-300 truncate">
                      {formatCurrency(displayedIncome)}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      vs {formatCurrency(displayedBills)} in bills
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-500/15 flex-shrink-0">
                    <BanknotesIcon className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )

      case 'paycheck-plan':
        return (
          <div className="card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div>
                <h2 className="section-title">Paycheck Planner</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {paycheckPlan?.has_schedule
                    ? `Bills grouped by ${paycheckPlan.frequency} paycheck — what comes out now vs. later`
                    : 'See which bills each paycheck has to cover'}
                </p>
              </div>
              <button
                onClick={() => navigate('/income')}
                className="text-sm text-blue-400 hover:underline flex items-center gap-1 font-medium flex-shrink-0"
              >
                Manage income
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <PaycheckPlanner data={paycheckPlan} loading={paycheckLoading} />
          </div>
        )

      case 'debt':
        return (
          <div className="card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div>
                <h2 className="section-title">Debt Payoff</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  What you owe, when it&apos;s paid off, and how much you can put toward it
                </p>
              </div>
              <button
                onClick={() => navigate('/bills')}
                className="text-sm text-emerald-400 hover:underline flex items-center gap-1 font-medium flex-shrink-0"
              >
                View bills
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <DebtOverview data={debt} loading={debtLoading} leftoverThisCheck={leftoverThisCheck} />
          </div>
        )

      case 'upcoming':
        return (
          <div className="card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2 className="section-title">Upcoming Bills</h2>
              <button
                onClick={() => navigate('/bills')}
                className="text-sm text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                View all
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <UpcomingBills bills={upcoming} loading={upcomingLoading} />
          </div>
        )

      case 'monthly-progress':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span>Bills paid</span>
                      <span className="font-medium text-slate-300">{summary?.paid_percentage ?? 0}%</span>
                    </div>
                    <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                        style={{ width: `${summary?.paid_percentage ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="pt-1 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Amount paid</span>
                      <span className="font-semibold text-emerald-400">
                        {formatCurrency(summary?.amount_paid_this_month ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Still owed</span>
                      <span className="font-semibold text-rose-400">
                        {formatCurrency(Math.max(0, parseFloat(summary?.amount_due_this_month ?? 0) - parseFloat(summary?.amount_paid_this_month ?? 0)))}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-600 to-teal-700 shadow-glow flex flex-col justify-between">
              <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div>
                <h3 className="text-white font-semibold mb-1">Track a new bill</h3>
                <p className="text-emerald-100 text-xs mb-3">Never miss a payment again.</p>
              </div>
              <button
                onClick={() => navigate('/bills/new')}
                className="btn bg-white text-emerald-700 hover:bg-emerald-50 text-sm py-2 px-4 font-semibold w-full"
              >
                <PlusIcon className="h-4 w-4" />
                Add Bill
              </button>
            </div>
          </div>
        )

      case 'monthly-chart':
        return (
          <div className="card p-5">
            <div className="mb-4">
              <h2 className="section-title">Monthly Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">Bills total, paid &amp; unpaid — last 6 months</p>
            </div>
            <MonthlyChart data={monthly} loading={monthlyLoading} />
          </div>
        )

      case 'category-chart':
        return (
          <div className="card p-5">
            <div className="mb-4">
              <h2 className="section-title">Spending by Category</h2>
              <p className="text-xs text-slate-500 mt-0.5">This month&apos;s bills broken down by category</p>
            </div>
            <CategoryChart data={categories} loading={categoriesLoading} />
          </div>
        )

      case 'income-vs-expenses':
        return (
          <div className="card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
              <div>
                <h2 className="section-title">Income vs Expenses</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Monthly income compared to your bill expenses — last 6 months
                </p>
              </div>
              <button
                onClick={() => navigate('/income')}
                className="text-sm text-blue-400 hover:underline flex items-center gap-1 font-medium flex-shrink-0"
              >
                Manage income
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <IncomeVsExpensesChart data={incomeVsExpenses} loading={incomeVsExpensesLoading} />
          </div>
        )

      case 'calendar':
        return (
          <div className="card p-5">
            <div className="mb-4">
              <h2 className="section-title flex items-center gap-2">
                <CalendarDaysIcon className="h-4 w-4 text-slate-400" />
                Bill Calendar
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                See all your bills at a glance by due date
              </p>
            </div>
            <CalendarWidget />
          </div>
        )

      case 'yearly-chart':
        return (
          <div className="card p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="section-title">Year-over-Year</h2>
                <p className="text-xs text-slate-500 mt-0.5">Monthly spending comparison across years</p>
              </div>
              <button
                onClick={() => setShowYearly((v) => !v)}
                className="text-sm text-emerald-400 hover:underline font-medium"
              >
                {showYearly ? 'Hide' : 'Show'}
              </button>
            </div>
            {showYearly ? (
              <YearlyChart data={yearly} loading={yearlyLoading} />
            ) : (
              <div className="h-12 flex items-center justify-center">
                <p className="text-sm text-slate-500">Click &quot;Show&quot; to compare years</p>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-header">Good day, {firstName}! 👋</h1>
          <p className="text-sm text-slate-400 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setIsEditing((v) => !v)}
            className={isEditing ? 'btn-primary' : 'btn-ghost'}
          >
            <Cog6ToothIcon className="h-4 w-4" />
            {isEditing ? 'Done' : 'Customize'}
          </button>
          <button onClick={() => navigate('/bills/new')} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Add Bill
          </button>
        </div>
      </div>

      {/* Edit-mode control panel */}
      {isEditing && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-slate-400 flex items-center gap-1.5 flex-wrap">
              Drag
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/[0.07] text-slate-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </span>
              to reorder · click
              <EyeSlashIcon className="inline h-3.5 w-3.5 text-rose-400" />
              to hide a widget
            </p>
            <button onClick={reset} className="btn-ghost text-xs gap-1.5">
              <ArrowPathIcon className="h-3.5 w-3.5" />
              Reset layout
            </button>
          </div>

          {/* Display settings */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-1 border-t border-white/[0.06]">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Upcoming window
              <select
                value={settings.upcomingDays}
                onChange={(e) => setSetting('upcomingDays', Number(e.target.value))}
                className="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-slate-200"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Paychecks shown
              <select
                value={settings.paycheckPeriods}
                onChange={(e) => setSetting('paycheckPeriods', Number(e.target.value))}
                className="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-slate-200"
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
                <option value={6}>6</option>
              </select>
            </label>
          </div>

          {hiddenWidgets.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Hidden — click to restore</p>
              <div className="flex flex-wrap gap-2">
                {hiddenWidgets.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => show(w.id)}
                    className="btn-secondary text-xs gap-1.5 py-1.5"
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    {w.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sortable widgets */}
      <DndContext
        sensors={isEditing ? sensors : []}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-6">
            {visibleIds.map((id) => {
              const meta = DEFAULT_WIDGETS.find((w) => w.id === id)
              return (
                <DashboardWidget
                  key={id}
                  id={id}
                  title={meta?.title ?? id}
                  isEditing={isEditing}
                  onHide={() => hide(id)}
                >
                  {renderWidget(id)}
                </DashboardWidget>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
