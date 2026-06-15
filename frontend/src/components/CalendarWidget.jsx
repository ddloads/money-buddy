import { useState, useMemo } from 'react'
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
  isPast,
  parseISO,
} from 'date-fns'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { useCalendarBills } from '../hooks/useBills'
import { useCurrency } from '../hooks/useCurrency'

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function BillStatusDot({ paid }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
        paid ? 'bg-emerald-400' : 'bg-rose-400'
      }`}
    />
  )
}

export default function CalendarWidget() {
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

  const selectedDayBills = selectedDay ? getBillsForDay(selectedDay) : []

  const handleDayClick = (day) => {
    if (selectedDay && isSameDay(day, selectedDay)) {
      setSelectedDay(null)
    } else {
      setSelectedDay(day)
    }
  }

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="section-title">{format(currentMonth, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setCurrentMonth(new Date())
              setSelectedDay(null)
            }}
            className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-white/[0.06] rounded-lg transition-colors font-medium"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Next month"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-12 skeleton rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-0.5">
          {calendarDays.map((day) => {
            const dayBills = getBillsForDay(day)
            const inMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            const todayDay = isToday(day)
            const paidBills = dayBills.filter((b) => b.is_paid)
            const unpaidBills = dayBills.filter((b) => !b.is_paid)
            const hasOverdue = unpaidBills.some(
              (b) => isPast(parseISO(b.due_date)) && !isToday(parseISO(b.due_date))
            )

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayClick(day)}
                className={`
                  relative flex flex-col items-center justify-start pt-1 pb-1.5 min-h-[52px] rounded-lg transition-colors
                  ${!inMonth ? 'opacity-25 pointer-events-none' : 'cursor-pointer'}
                  ${isSelected ? 'bg-emerald-500/20 ring-1 ring-emerald-500/40' : inMonth ? 'hover:bg-white/[0.06]' : ''}
                `}
              >
                <span
                  className={`
                    text-sm w-6 h-6 flex items-center justify-center rounded-full font-medium leading-none
                    ${todayDay ? 'bg-emerald-500 text-white' : 'text-slate-300'}
                  `}
                >
                  {format(day, 'd')}
                </span>

                {dayBills.length > 0 && (
                  <div className="flex items-center justify-center gap-0.5 mt-1 flex-wrap max-w-full px-1">
                    {paidBills.length > 0 && <BillStatusDot paid />}
                    {unpaidBills.length > 0 && (
                      <BillStatusDot paid={false} />
                    )}
                    {dayBills.length > 3 && (
                      <span className="text-[9px] text-slate-500 leading-none">
                        +{dayBills.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* Overdue warning ring */}
                {hasOverdue && (
                  <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span className="text-xs text-slate-500">Paid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />
          <span className="text-xs text-slate-500">Unpaid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span className="text-xs text-slate-500">Overdue</span>
        </div>
      </div>

      {/* Selected day panel */}
      {selectedDay && (
        <div className="mt-4 border-t border-white/[0.06] pt-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200">
              {format(selectedDay, 'EEEE, MMMM d')}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  navigate(
                    `/bills/new?due_date=${format(selectedDay, 'yyyy-MM-dd')}`
                  )
                }
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add bill
              </button>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-400 transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {selectedDayBills.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-2">No bills due on this day.</p>
              <button
                onClick={() =>
                  navigate(
                    `/bills/new?due_date=${format(selectedDay, 'yyyy-MM-dd')}`
                  )
                }
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                + Schedule a bill
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {selectedDayBills.map((bill) => (
                <button
                  key={bill.id}
                  onClick={() => navigate(`/bills/${bill.id}`)}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-white/[0.06] cursor-pointer transition-colors text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <BillStatusDot paid={bill.is_paid} />
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
                    <p
                      className={`text-xs font-medium ${
                        bill.is_paid ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {bill.is_paid ? 'Paid' : 'Unpaid'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
