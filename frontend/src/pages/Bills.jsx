import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import BillCard from '../components/BillCard'
import { useBills, useMarkBillPaid } from '../hooks/useBills'
import { billsAPI } from '../utils/api'

const FILTERS = [
  { value: '', label: 'All Bills' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'overdue', label: 'Overdue' },
]

const SORT_OPTIONS = [
  { value: 'due_date_asc', label: 'Due Date (Earliest)' },
  { value: 'due_date_desc', label: 'Due Date (Latest)' },
  { value: 'amount_desc', label: 'Amount (High → Low)' },
  { value: 'amount_asc', label: 'Amount (Low → High)' },
  { value: 'name_asc', label: 'Name (A → Z)' },
]

export default function Bills() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('due_date_asc')
  const [showSort, setShowSort] = useState(false)
  const [exporting, setExporting] = useState(false)

  const params = {
    status: filter || undefined,
    search: search || undefined,
    sort,
  }

  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBills(params)
  const markPaid = useMarkBillPaid()

  const bills = data?.pages?.flatMap((page) => page.items ?? []) ?? []
  const totalBills = data?.pages?.[0]?.total ?? 0

  const handleMarkPaid = (bill) => {
    markPaid.mutate({ id: bill.id, data: { paid_date: new Date().toISOString().split('T')[0] } })
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await billsAPI.export()
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'bills-export.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // silently fail — user can retry
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Bills</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Everything you owe, in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary text-sm flex-1 sm:flex-none"
            title="Export as CSV"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export'}</span>
          </button>
          <button onClick={() => navigate('/bills/new')} className="btn-primary flex-1 sm:flex-none">
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Add Bill</span>
          </button>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bills…"
            className="input pl-10 pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSort(!showSort)}
            className="btn-secondary gap-2 w-full sm:w-auto justify-center sm:justify-start flex-shrink-0 py-2.5"
          >
            <ArrowsUpDownIcon className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">
              {SORT_OPTIONS.find((s) => s.value === sort)?.label || 'Sort'}
            </span>
          </button>
          {showSort && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
              <div className="absolute right-0 mt-1 w-full min-w-52 sm:w-52 card z-20 py-1 shadow-card-hover">
                {SORT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => { setSort(value); setShowSort(false) }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      sort === value
                        ? 'text-emerald-300 bg-emerald-500/10 font-medium'
                        : 'text-slate-300 hover:bg-white/[0.05]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              filter === value
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-glow'
                : 'bg-white/[0.04] text-slate-400 border border-white/10 hover:border-emerald-500/50 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-3 w-24" />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="skeleton h-6 w-16" />
                  <div className="skeleton h-7 w-16 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-slate-200 font-medium mb-1">Failed to load bills</p>
          <p className="text-sm text-slate-400 mb-4">
            There was a problem connecting to the server.
          </p>
          <button onClick={() => refetch()} className="btn-primary">
            Try Again
          </button>
        </div>
      ) : bills.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <div className="text-5xl mb-4">
            {search ? '🔍' : filter ? '✅' : '📄'}
          </div>
          <p className="text-lg font-semibold text-slate-100 mb-1">
            {search
              ? `No results for "${search}"`
              : filter
              ? `No ${filter} bills`
              : 'No bills yet'}
          </p>
          <p className="text-sm text-slate-400 mb-5">
            {search || filter
              ? 'Try adjusting your filters or search term.'
              : 'Add your first bill to start tracking your payments.'}
          </p>
          {!search && !filter && (
            <button onClick={() => navigate('/bills/new')} className="btn-primary">
              <PlusIcon className="h-4 w-4" />
              Add Your First Bill
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            {totalBills} bill{totalBills !== 1 ? 's' : ''}
            {filter ? ` · ${filter}` : ''}
            {search ? ` · matching "${search}"` : ''}
          </p>
          <div className="space-y-3">
            {bills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                onMarkPaid={handleMarkPaid}
                isMarkingPaid={markPaid.isPending && markPaid.variables?.id === bill.id}
              />
            ))}
          </div>

          {hasNextPage && (
            <button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="btn-secondary w-full"
            >
              {isFetchingNextPage ? 'Loading…' : `Load more (${totalBills - bills.length} remaining)`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
