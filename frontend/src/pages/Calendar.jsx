import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline'
import { useCalendarBills } from '../hooks/useBills'
import { useCurrency } from '../hooks/useCurrency'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Calendar() {
  const navigate = useNavigate()
  const { format: formatCurrency } = useCurrency()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const { data: bills = [], isLoading } = useCalendarBills()

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const billsByDate = useMemo(() => {
    const map = {}
    bills.forEach((bill) => {
      const key = bill.due_date?.slice(0, 10)
      if (!key) return
      if (!map[key]) map[key] = []
      map[key].push(bill)
    })
    return map
  }, [bills])

  const getBillsForDay = (day) => billsByDate[format(day, 'yyyy-MM-dd')] ?? []

  const monthBills = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    return bills.filter((b) => {
      if (!b.due_date) return false
      const d = parseISO(b.due_date.slice(0, 10))
      return d >= start && d <= end
    })
  }, [bills, currentMonth])

  const selectedDayBills = selectedDay ? getBillsForDay(selectedDay) : []

  const paidAmount = monthBills.filter((b) => b.is_paid).reduce((s, b) => s + parseFloat(b.amount || 0), 0)
  const unpaidBills = monthBills.filter((b) => !b.is_paid)
  const unpaidAmount = unpaidBills.reduce((s, b) => s + parseFloat(b.amount || 0), 0)

  const handleDayClick = (day) => {
    if (!isSameMonth(day, currentMonth)) return
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Bill Calendar</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {format(currentMonth, 'MMMM yyyy')} &mdash; {monthBills.length} bill{monthBills.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center bg-white/[0.04] rounded-xl border border-white/[0.08] p-1 gap-0.5">
            <button
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => { setCurrentMonth(new Date()); setSelectedDay(null) }}
              className="px-3 py-1 text-xs text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors font-medium"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors"
              aria-label="Next month"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>
          <button onClick={() => navigate('/bills/new')} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Add Bill
          </button>
        </div>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Bills</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-200">{monthBills.length}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Paid</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-400">{formatCurrency(paidAmount)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-xs text-slate-500 mb-1">Unpaid</p>
          <p className="text-xl sm:text-2xl font-bold text-rose-400">{formatCurrency(unpaidAmount)}</p>
        </div>
      </div>

      {/* Calendar grid + day panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 card p-4 sm:p-5">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-2 border-b border-white/[0.06] pb-2">
            {DAY_HEADERS.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">
                {d}
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-20 skeleton rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayBills = getBillsForDay(day)
                const inMonth = isSameMonth(day, currentMonth)
                const isSelected = selectedDay && isSameDay(day, selectedDay)
                const todayDay = isToday(day)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDayClick(day)}
                    className={`
                      relative min-h-[72px] sm:min-h-[90px] rounded-xl p-1.5 text-left transition-all flex flex-col
                      ${!inMonth ? 'opacity-20 cursor-default' : 'cursor-pointer'}
                      ${isSelected
                        ? 'bg-emerald-500/15 ring-1 ring-emerald-500/40'
                        : inMonth
                          ? 'bg-white/[0.02] hover:bg-white/[0.06]'
                          : ''
                      }
                    `}
                  >
                    <span
                      className={`
                        text-xs w-6 h-6 flex items-center justify-center rounded-full font-semibold mb-1 flex-shrink-0
                        ${todayDay ? 'bg-emerald-500 text-white' : 'text-slate-400'}
                      `}
                    >
                      {format(day, 'd')}
                    </span>

                    <div className="flex flex-col gap-0.5 overflow-hidden min-h-0">
                      {dayBills.slice(0, 2).map((bill) => (
                        <div
                          key={bill.id}
                          className={`text-[10px] leading-snug px-1 py-0.5 rounded truncate font-medium ${
                            bill.is_paid
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-rose-500/15 text-rose-300'
                          }`}
                        >
                          {bill.name}
                        </div>
                      ))}
                      {dayBills.length > 2 && (
                        <span className="text-[10px] text-slate-500 px-1 leading-tight">
                          +{dayBills.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-400/30 inline-block" />
              <span className="text-xs text-slate-500">Paid</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-rose-500/20 border border-rose-400/30 inline-block" />
              <span className="text-xs text-slate-500">Unpaid</span>
            </div>
          </div>
        </div>

        {/* Day detail panel */}
        <div className="card p-5 flex flex-col">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="section-title">{format(selectedDay, 'EEEE')}</h2>
                  <p className="text-xs text-slate-500">{format(selectedDay, 'MMMM d, yyyy')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/bills/new?due_date=${format(selectedDay, 'yyyy-MM-dd')}`)}
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Add
                  </button>
                  <button
                    onClick={() => setSelectedDay(null)}
                    className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-400 transition-colors"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {selectedDayBills.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <p className="text-sm text-slate-500 mb-3">No bills due this day.</p>
                  <button
                    onClick={() => navigate(`/bills/new?due_date=${format(selectedDay, 'yyyy-MM-dd')}`)}
                    className="btn-secondary text-sm"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Schedule a bill
                  </button>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto">
                  {selectedDayBills.map((bill) => (
                    <button
                      key={bill.id}
                      onClick={() => navigate(`/bills/${bill.id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.06] transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            bill.is_paid ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-200 truncate">{bill.name}</p>
                          {bill.category && (
                            <p className="text-xs text-slate-500 truncate">{bill.category.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-semibold text-slate-200">
                          {formatCurrency(bill.amount)}
                        </p>
                        <p className={`text-xs font-medium ${bill.is_paid ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {bill.is_paid ? 'Paid' : 'Unpaid'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <CalendarDaysIcon className="h-12 w-12 text-slate-700 mb-3" />
              <p className="text-sm font-medium text-slate-400 mb-1">Select a day</p>
              <p className="text-xs text-slate-600">Click any date on the calendar to see its bills</p>
            </div>
          )}
        </div>
      </div>

      {/* All bills this month list */}
      {monthBills.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title mb-4">All Bills — {format(currentMonth, 'MMMM yyyy')}</h2>
          <div className="space-y-2">
            {monthBills
              .slice()
              .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
              .map((bill) => (
                <button
                  key={bill.id}
                  onClick={() => navigate(`/bills/${bill.id}`)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.06] transition-colors text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        bill.is_paid ? 'bg-emerald-400' : 'bg-rose-400'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{bill.name}</p>
                      {bill.category && (
                        <p className="text-xs text-slate-500">{bill.category.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                    <p className="text-xs text-slate-500 hidden sm:block">
                      {format(parseISO(bill.due_date.slice(0, 10)), 'MMM d')}
                    </p>
                    <p className="text-sm font-semibold text-slate-200">
                      {formatCurrency(bill.amount)}
                    </p>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        bill.is_paid
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {bill.is_paid ? 'Paid' : 'Due'}
                    </span>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
