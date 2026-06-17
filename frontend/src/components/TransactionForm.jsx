import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'

export default function TransactionForm({ defaultValues, onSubmit, onCancel, isLoading, submitLabel }) {
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()

  const editingAmount = defaultValues?.amount != null ? Number(defaultValues.amount) : null
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      direction: editingAmount != null ? (editingAmount < 0 ? 'expense' : 'income') : 'expense',
      amount: editingAmount != null ? Math.abs(editingAmount) : '',
      account_id: defaultValues?.account_id ?? accounts[0]?.id ?? '',
      date: defaultValues?.date ? String(defaultValues.date).slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
      description: defaultValues?.description ?? '',
      category_id: defaultValues?.category_id ?? '',
      notes: defaultValues?.notes ?? '',
    },
  })

  const submit = (data) => {
    const magnitude = Math.abs(Number(data.amount))
    const amount = data.direction === 'expense' ? -magnitude : magnitude
    onSubmit({
      account_id: Number(data.account_id),
      amount,
      date: data.date,
      description: data.description,
      category_id: data.category_id ? Number(data.category_id) : null,
      notes: data.notes || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      {/* Direction */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 cursor-pointer text-sm font-medium text-slate-300 has-[:checked]:border-rose-500/60 has-[:checked]:bg-rose-500/10 has-[:checked]:text-rose-300">
          <input type="radio" value="expense" className="sr-only" {...register('direction')} />
          Expense
        </label>
        <label className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 cursor-pointer text-sm font-medium text-slate-300 has-[:checked]:border-emerald-500/60 has-[:checked]:bg-emerald-500/10 has-[:checked]:text-emerald-300">
          <input type="radio" value="income" className="sr-only" {...register('direction')} />
          Income
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Amount <span className="text-rose-400">*</span></label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`input ${errors.amount ? 'input-error' : ''}`}
            placeholder="0.00"
            {...register('amount', {
              required: 'Amount is required',
              validate: (v) => Number(v) > 0 || 'Must be greater than zero',
            })}
          />
          {errors.amount && <p className="field-error">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" {...register('date', { required: true })} />
        </div>
      </div>

      <div>
        <label className="label">Account <span className="text-rose-400">*</span></label>
        <select className={`input ${errors.account_id ? 'input-error' : ''}`} {...register('account_id', { required: 'Pick an account' })}>
          {accounts.length === 0 && <option value="">No accounts — create one first</option>}
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        {errors.account_id && <p className="field-error">{errors.account_id.message}</p>}
      </div>

      <div>
        <label className="label">Description <span className="text-rose-400">*</span></label>
        <input
          type="text"
          className={`input ${errors.description ? 'input-error' : ''}`}
          placeholder="e.g. Grocery store"
          {...register('description', { required: 'Description is required' })}
        />
        {errors.description && <p className="field-error">{errors.description.message}</p>}
      </div>

      <div>
        <label className="label">Category</label>
        <select className="input" {...register('category_id')}>
          <option value="">Uncategorized</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} placeholder="Optional" {...register('notes')} />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isLoading || accounts.length === 0} className="btn-primary flex-1">
          {isLoading ? 'Saving…' : submitLabel || 'Save'}
        </button>
      </div>
    </form>
  )
}
