import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  WalletIcon,
  BanknotesIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { useBudget, useSetCategoryBudget } from '../hooks/useBudget'
import { useCurrency } from '../hooks/useCurrency'

function barColor(pct) {
  if (pct == null) return 'bg-slate-500'
  if (pct > 100) return 'bg-gradient-to-r from-rose-500 to-red-500'
  if (pct >= 85) return 'bg-gradient-to-r from-amber-500 to-orange-500'
  return 'bg-gradient-to-r from-emerald-500 to-teal-400'
}

function StatTile({ label, value, accent = 'text-slate-100', hint }) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent}`}>{value}</p>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
  )
}

function BudgetRow({ row, onSave, onRemove, saving }) {
  const { format: fc } = useCurrency()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(row.monthly_budget ?? '')

  const editable = row.category_id != null
  const pct = row.pct
  const hasBudget = row.monthly_budget != null

  const startEdit = () => {
    setDraft(row.monthly_budget ?? '')
    setEditing(true)
  }

  const commit = () => {
    const value = draft === '' ? null : Number(draft)
    if (value !== null && (Number.isNaN(value) || value < 0)) return
    onSave(row.category_id, value)
    setEditing(false)
  }

  return (
    <div className="rounded-xl bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: `${row.color}26` }}
        >
          {row.icon || '📁'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-100 truncate">{row.name}</span>
            {row.over_budget && (
              <span className="badge-red !py-0.5 !px-1.5 text-[10px]">
                <ExclamationTriangleIcon className="h-2.5 w-2.5" />
                Over
              </span>
            )}
            <span className="text-xs text-slate-500">
              {row.bill_count} bill{row.bill_count !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            <span className="font-semibold text-slate-200">{fc(row.spent)}</span>
            {hasBudget ? <> spent of {fc(row.monthly_budget)}</> : <> spent · no budget</>}
          </p>
        </div>

        {/* Right side: remaining / edit */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!editing && hasBudget && (
            <div className="text-right">
              <p className={`text-sm font-bold ${row.remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {row.remaining < 0 ? `-${fc(Math.abs(row.remaining))}` : fc(row.remaining)}
              </p>
              <p className="text-[11px] text-slate-500">{row.remaining < 0 ? 'over' : 'left'}</p>
            </div>
          )}
          {editable && !editing && (
            hasBudget ? (
              <button onClick={startEdit} className="btn-ghost p-2" title="Edit budget">
                <PencilIcon className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={startEdit} className="btn-secondary text-xs gap-1.5 py-1.5">
                <PlusIcon className="h-3.5 w-3.5" />
                Set budget
              </button>
            )
          )}
        </div>
      </div>

      {/* Progress bar */}
      {hasBudget && !editing && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(pct)}`}
              style={{ width: `${Math.min(100, pct ?? 0)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-500 mt-1">
            <span>{pct ?? 0}% used</span>
            {pct > 100 && <span className="text-rose-400">{pct - 100}% over budget</span>}
          </div>
        </div>
      )}

      {/* Inline editor */}
      {editing && (
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2 flex-1">
            <input
              type="number"
              step="0.01"
              min="0"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit()
                if (e.key === 'Escape') setEditing(false)
              }}
              placeholder="Monthly budget"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={() => setDraft(String(row.spent))}
              className="btn-ghost text-xs whitespace-nowrap"
              title="Match this month's spending"
            >
              = {fc(row.spent)}
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={commit} disabled={saving} className="btn-primary text-xs px-3 py-2">
              <CheckIcon className="h-4 w-4" />
              Save
            </button>
            {hasBudget && (
              <button
                onClick={() => { onRemove(row.category_id); setEditing(false) }}
                className="btn-ghost p-2 text-rose-400 hover:bg-rose-500/10"
                title="Remove budget"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            {!hasBudget && (
              <button onClick={() => setEditing(false)} className="btn-ghost p-2" title="Cancel">
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Budget() {
  const navigate = useNavigate()
  const { format: fc } = useCurrency()
  const now = new Date()
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })

  const { data, isLoading, isError } = useBudget(ym.year, ym.month)
  const setBudget = useSetCategoryBudget()

  const isCurrentMonth = ym.year === now.getFullYear() && ym.month === now.getMonth() + 1

  const shiftMonth = (delta) => {
    setYm((prev) => {
      const d = new Date(prev.year, prev.month - 1 + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() + 1 }
    })
  }

  const handleSave = (categoryId, amount) =>
    setBudget.mutate({ categoryId, amount })
  const handleRemove = (categoryId) =>
    setBudget.mutate({ categoryId, amount: null })

  const savingId = setBudget.isPending ? setBudget.variables?.categoryId : null

  const income = data?.monthly_income ?? 0
  const budgeted = data?.total_budgeted ?? 0
  const spent = data?.total_spent ?? 0
  const remaining = data?.total_remaining ?? 0
  const unallocated = data?.unallocated ?? 0
  const allocatedPct = income > 0 ? Math.min(100, (budgeted / income) * 100) : 0
  const spentPct = budgeted > 0 ? Math.min(100, (spent / budgeted) * 100) : 0

  const rows = data?.categories ?? []
  const uncategorized = data?.uncategorized
  const showUncategorized = uncategorized && uncategorized.bill_count > 0
  const hasCategories = rows.length > 0 || showUncategorized

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <WalletIcon className="h-7 w-7 text-emerald-400" />
            Budget
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Plan what you spend in each category and track it against the month.
          </p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => shiftMonth(-1)} className="btn-ghost p-2" title="Previous month">
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <span className="min-w-[9.5rem] text-center font-semibold text-slate-100">
            {format(new Date(ym.year, ym.month - 1, 1), 'MMMM yyyy')}
          </span>
          <button onClick={() => shiftMonth(1)} className="btn-ghost p-2" title="Next month">
            <ChevronRightIcon className="h-5 w-5" />
          </button>
          {!isCurrentMonth && (
            <button
              onClick={() => setYm({ year: now.getFullYear(), month: now.getMonth() + 1 })}
              className="btn-secondary text-xs ml-1"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {isError ? (
        <div className="card p-8 text-center">
          <p className="text-slate-300">Failed to load budget.</p>
        </div>
      ) : (
        <>
          {/* Allocation overview */}
          <div className="card p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <StatTile label="Monthly income" value={fc(income)} accent="text-blue-300" />
              <StatTile label="Budgeted" value={fc(budgeted)} accent="text-slate-100" />
              <StatTile label="Spent this month" value={fc(spent)} accent="text-amber-300" />
              <StatTile
                label={remaining < 0 ? 'Over budget' : 'Left to spend'}
                value={remaining < 0 ? `-${fc(Math.abs(remaining))}` : fc(remaining)}
                accent={remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}
              />
            </div>

            {/* Zero-based allocation bar */}
            {income > 0 && (
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>Income allocated to budgets</span>
                  <span
                    className={
                      unallocated < 0 ? 'text-rose-400 font-medium' : 'text-slate-300 font-medium'
                    }
                  >
                    {unallocated < 0
                      ? `Over-allocated by ${fc(Math.abs(unallocated))}`
                      : `${fc(unallocated)} left to budget`}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      unallocated < 0
                        ? 'bg-gradient-to-r from-rose-500 to-red-500'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-400'
                    }`}
                    style={{ width: `${allocatedPct}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {unallocated >= 0
                    ? 'Assign every dollar a job — aim to get “left to budget” to zero.'
                    : 'Your budgets exceed your income. Trim a category or raise income.'}
                </p>
              </div>
            )}
            {income === 0 && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.03] p-3">
                <p className="text-sm text-slate-400">
                  Add your income to see how much is left to budget each month.
                </p>
                <button onClick={() => navigate('/income')} className="btn-secondary text-xs gap-1.5 flex-shrink-0">
                  Add income
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Overall spend progress */}
          {budgeted > 0 && (
            <div className="card p-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300 font-medium">Total spent vs budget</span>
                <span className="text-slate-400">
                  {fc(spent)} / {fc(budgeted)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor(
                    budgeted ? Math.round((spent / budgeted) * 100) : null
                  )}`}
                  style={{ width: `${spentPct}%` }}
                />
              </div>
              {data?.over_budget_count > 0 && (
                <p className="text-[11px] text-rose-400 mt-1.5">
                  {data.over_budget_count}{' '}
                  {data.over_budget_count === 1 ? 'category is' : 'categories are'} over budget.
                </p>
              )}
            </div>
          )}

          {/* Category list */}
          {isLoading && !data ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <div className="skeleton h-10 w-10 rounded-xl" />
                    <div className="flex-1">
                      <div className="skeleton h-4 w-32 mb-2" />
                      <div className="skeleton h-3 w-24" />
                    </div>
                  </div>
                  <div className="skeleton h-2 w-full rounded-full mt-3" />
                </div>
              ))}
            </div>
          ) : !hasCategories ? (
            <div className="card p-12 text-center">
              <div className="text-5xl mb-3">🗂️</div>
              <p className="text-lg font-semibold text-slate-100 mb-1">No categories to budget</p>
              <p className="text-sm text-slate-400 mb-4">
                Create categories for your bills, then set a monthly budget for each.
              </p>
              <button onClick={() => navigate('/categories')} className="btn-primary mx-auto">
                <PlusIcon className="h-4 w-4" />
                Manage categories
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="section-title">Categories</h2>
              {rows.map((row) => (
                <BudgetRow
                  key={row.category_id}
                  row={row}
                  onSave={handleSave}
                  onRemove={handleRemove}
                  saving={savingId === row.category_id}
                />
              ))}
              {showUncategorized && (
                <BudgetRow
                  key="uncategorized"
                  row={uncategorized}
                  onSave={handleSave}
                  onRemove={handleRemove}
                  saving={false}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
