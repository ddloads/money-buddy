import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { useCategories } from '../hooks/useCategories'
import { toDateInputValue } from '../utils/billDates'
import { useCurrency } from '../hooks/useCurrency'

const RECURRENCE_OPTIONS = [
  { value: '', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export default function BillForm({ defaultValues, onSubmit, isLoading, submitLabel = 'Save Bill' }) {
  const { data: categories } = useCategories()
  const { symbol } = useCurrency()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: '',
      amount: '',
      category_id: '',
      autopay_enabled: false,
      recurrence: '',
      notes: '',
      reminder_days: 3,
      ...defaultValues,
      due_date: toDateInputValue(defaultValues?.due_date),
    },
  })

  // Update form when defaultValues change (e.g. after bill loads)
  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name || '',
        amount: defaultValues.amount || '',
        due_date: toDateInputValue(defaultValues.due_date),
        category_id: defaultValues.category_id || defaultValues.category?.id || '',
        autopay_enabled: Boolean(defaultValues.autopay_enabled),
        recurrence: defaultValues.recurrence_interval || defaultValues.recurrence || '',
        notes: defaultValues.notes || '',
        reminder_days: defaultValues.reminder_days ?? 3,
      })
    }
  }, [defaultValues, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Bill Name */}
      <div>
        <label className="label" htmlFor="name">
          Bill Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          className={`input ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
          placeholder="e.g. Electric Bill, Netflix, Rent"
          {...register('name', { required: 'Bill name is required' })}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Amount + Due Date (side by side) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="amount">
            Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{symbol}</span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              className={`input pl-7 ${errors.amount ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="0.00"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 0, message: 'Must be ≥ 0' },
              })}
            />
          </div>
          {errors.amount && (
            <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="due_date">
            Due Date <span className="text-red-500">*</span>
          </label>
          <input
            id="due_date"
            type="date"
            className={`input ${errors.due_date ? 'border-red-400 focus:ring-red-400' : ''}`}
            {...register('due_date', { required: 'Due date is required' })}
          />
          {errors.due_date && (
            <p className="mt-1 text-xs text-red-500">{errors.due_date.message}</p>
          )}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="label" htmlFor="category_id">
          Category
        </label>
        <select
          id="category_id"
          className="input"
          {...register('category_id')}
        >
          <option value="">— No category —</option>
          {(categories || []).map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon ? `${cat.icon} ` : ''}{cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Auto Pay */}
      <label
        htmlFor="autopay_enabled"
        className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-4 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
      >
        <input
          id="autopay_enabled"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-gray-700 dark:bg-gray-900"
          {...register('autopay_enabled')}
        />
        <span>
          <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            Auto pay is set up for this bill
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Show an Auto Pay badge on this bill so you know it is paid automatically.
          </span>
        </span>
      </label>

      {/* Recurrence + Reminder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="recurrence">
            Recurrence
          </label>
          <select
            id="recurrence"
            className="input"
            {...register('recurrence')}
          >
            {RECURRENCE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="reminder_days">
            Remind me (days before)
          </label>
          <input
            id="reminder_days"
            type="number"
            min="0"
            max="30"
            className="input"
            {...register('reminder_days', { min: 0, max: 30 })}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea
          id="notes"
          rows={3}
          className="input resize-none"
          placeholder="Any extra details about this bill…"
          {...register('notes')}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full py-2.5"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Saving…
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  )
}
