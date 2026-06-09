import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { useCurrency } from '../hooks/useCurrency'

const FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'one_time', label: 'One-time' },
]

export default function IncomeForm({ defaultValues, onSubmit, isLoading, submitLabel = 'Save Income' }) {
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
      frequency: 'monthly',
      start_date: '',
      is_active: true,
      notes: '',
      ...defaultValues,
    },
  })

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name || '',
        amount: defaultValues.amount || '',
        frequency: defaultValues.frequency || 'monthly',
        start_date: defaultValues.start_date || '',
        is_active: defaultValues.is_active !== false,
        notes: defaultValues.notes || '',
      })
    }
  }, [defaultValues, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Name */}
      <div>
        <label className="label" htmlFor="income-name">
          Income Source <span className="text-red-500">*</span>
        </label>
        <input
          id="income-name"
          type="text"
          className={`input ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
          placeholder="e.g. Salary, Freelance, Rental Income"
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      {/* Amount + Frequency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="income-amount">
            Amount <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{symbol}</span>
            <input
              id="income-amount"
              type="number"
              step="0.01"
              min="0.01"
              className={`input pl-7 ${errors.amount ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="0.00"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 0.01, message: 'Must be > 0' },
              })}
            />
          </div>
          {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="income-frequency">
            Frequency
          </label>
          <select id="income-frequency" className="input" {...register('frequency')}>
            {FREQUENCY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Start Date */}
      <div>
        <label className="label" htmlFor="income-start-date">
          Start Date <span className="text-xs text-gray-400 font-normal">(optional — for one-time income placement on chart)</span>
        </label>
        <input
          id="income-start-date"
          type="date"
          className="input"
          {...register('start_date')}
        />
      </div>

      {/* Active toggle */}
      <label
        htmlFor="income-is-active"
        className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/40 p-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
      >
        <input
          id="income-is-active"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
          {...register('is_active')}
        />
        <span>
          <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
            Active income source
          </span>
          <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Include this in income totals and comparisons.
          </span>
        </span>
      </label>

      {/* Notes */}
      <div>
        <label className="label" htmlFor="income-notes">
          Notes
        </label>
        <textarea
          id="income-notes"
          rows={3}
          className="input resize-none"
          placeholder="Any extra details about this income source…"
          {...register('notes')}
        />
      </div>

      {/* Submit */}
      <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
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
