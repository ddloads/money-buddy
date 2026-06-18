import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { useCategories } from '../hooks/useCategories'
import { useAccounts } from '../hooks/useAccounts'
import { toDateInputValue } from '../utils/billDates'
import { useCurrency } from '../hooks/useCurrency'
import Spinner from './Spinner'

const RECURRENCE_OPTIONS = [
  { value: '', label: 'One-time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export default function BillForm({ defaultValues, onSubmit, isLoading, submitLabel = 'Save Bill' }) {
  const { data: categories } = useCategories()
  const { data: accounts = [] } = useAccounts()
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
      funding_account_id: '',
      autopay_enabled: false,
      recurrence: '',
      interest_rate: '',
      remaining_balance: '',
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
        funding_account_id: defaultValues.funding_account_id || '',
        autopay_enabled: Boolean(defaultValues.autopay_enabled),
        recurrence: defaultValues.recurrence_interval || defaultValues.recurrence || '',
        interest_rate: defaultValues.interest_rate ?? '',
        remaining_balance: defaultValues.remaining_balance ?? '',
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
          Bill Name <span className="text-rose-400">*</span>
        </label>
        <input
          id="name"
          type="text"
          className={`input ${errors.name ? 'input-error' : ''}`}
          placeholder="e.g. Electric Bill, Netflix, Rent"
          {...register('name', { required: 'Bill name is required' })}
        />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>

      {/* Amount + Due Date (side by side) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="amount">
            Amount <span className="text-rose-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{symbol}</span>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              className={`input pl-8 ${errors.amount ? 'input-error' : ''}`}
              placeholder="0.00"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 0, message: 'Must be ≥ 0' },
              })}
            />
          </div>
          {errors.amount && <p className="field-error">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="due_date">
            Due Date <span className="text-rose-400">*</span>
          </label>
          <input
            id="due_date"
            type="date"
            className={`input ${errors.due_date ? 'input-error' : ''}`}
            {...register('due_date', { required: 'Due date is required' })}
          />
          {errors.due_date && <p className="field-error">{errors.due_date.message}</p>}
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="label" htmlFor="category_id">Category</label>
        <select id="category_id" className="input" {...register('category_id')}>
          <option value="">— No category —</option>
          {(categories || []).map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.icon ? `${cat.icon} ` : ''}{cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Funding account */}
      {accounts.length > 0 && (
        <div>
          <label className="label" htmlFor="funding_account_id">Paid from account</label>
          <select id="funding_account_id" className="input" {...register('funding_account_id')}>
            <option value="">— Not linked —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Tag the account that covers this bill. It&apos;s preselected when you mark the bill paid.
          </p>
        </div>
      )}

      {/* Auto Pay */}
      <label
        htmlFor="autopay_enabled"
        className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 cursor-pointer hover:border-emerald-500/50 transition-colors"
      >
        <input
          id="autopay_enabled"
          type="checkbox"
          className="mt-1 h-4 w-4 rounded border-white/20 bg-midnight-800 text-emerald-500 focus:ring-emerald-500"
          {...register('autopay_enabled')}
        />
        <span>
          <span className="block text-sm font-medium text-slate-100">
            Auto pay is set up for this bill
          </span>
          <span className="block text-xs text-slate-400 mt-0.5">
            Show an Auto Pay badge on this bill so you know it is paid automatically.
          </span>
        </span>
      </label>

      {/* Recurrence + Reminder */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="recurrence">Recurrence</label>
          <select id="recurrence" className="input" {...register('recurrence')}>
            {RECURRENCE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="reminder_days">Remind me (days before)</label>
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

      {/* Interest Rate + Remaining Balance */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="interest_rate">
            Interest Rate{' '}
            <span className="text-xs text-slate-500 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <input
              id="interest_rate"
              type="number"
              step="0.01"
              min="0"
              max="999"
              className={`input pr-8 ${errors.interest_rate ? 'input-error' : ''}`}
              placeholder="e.g. 19.99"
              {...register('interest_rate', {
                min: { value: 0, message: 'Must be ≥ 0' },
                max: { value: 999, message: 'Must be ≤ 999' },
              })}
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
          </div>
          {errors.interest_rate && <p className="field-error">{errors.interest_rate.message}</p>}
        </div>

        <div>
          <label className="label" htmlFor="remaining_balance">
            Remaining Balance{' '}
            <span className="text-xs text-slate-500 font-normal">(loans / credit cards)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{symbol}</span>
            <input
              id="remaining_balance"
              type="number"
              step="0.01"
              min="0"
              className={`input pl-8 ${errors.remaining_balance ? 'input-error' : ''}`}
              placeholder="e.g. 4500.00"
              {...register('remaining_balance', {
                min: { value: 0, message: 'Must be ≥ 0' },
              })}
            />
          </div>
          {errors.remaining_balance && <p className="field-error">{errors.remaining_balance.message}</p>}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label" htmlFor="notes">Notes</label>
        <textarea
          id="notes"
          rows={3}
          className="input resize-none"
          placeholder="Any extra details about this bill…"
          {...register('notes')}
        />
      </div>

      {/* Submit */}
      <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Spinner />
            Saving…
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  )
}
