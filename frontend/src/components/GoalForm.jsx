import { useForm } from 'react-hook-form'
import { useAccounts } from '../hooks/useAccounts'
import { isLiabilityType } from '../utils/accounts'

export default function GoalForm({ defaultValues, onSubmit, onCancel, isLoading, submitLabel }) {
  const { data: accounts = [] } = useAccounts()
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
      type: defaultValues?.type ?? 'savings',
      target_amount: defaultValues?.target_amount != null ? Number(defaultValues.target_amount) : '',
      current_amount: defaultValues?.current_amount != null ? Number(defaultValues.current_amount) : '',
      target_date: defaultValues?.target_date ? String(defaultValues.target_date).slice(0, 10) : '',
      account_id: defaultValues?.account_id ?? '',
      notes: defaultValues?.notes ?? '',
    },
  })

  const type = watch('type')
  const accountId = watch('account_id')
  // Suggest accounts that fit the goal type (liabilities for debt, assets for savings).
  const relevantAccounts = accounts.filter((a) =>
    type === 'debt' ? isLiabilityType(a.type) : !isLiabilityType(a.type)
  )

  const submit = (data) => {
    onSubmit({
      name: data.name,
      type: data.type,
      target_amount: Number(data.target_amount),
      current_amount: data.account_id ? 0 : (data.current_amount === '' ? 0 : Number(data.current_amount)),
      target_date: data.target_date || null,
      account_id: data.account_id ? Number(data.account_id) : null,
      notes: data.notes || null,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div>
        <label className="label">Goal name <span className="text-rose-400">*</span></label>
        <input
          type="text"
          className={`input ${errors.name ? 'input-error' : ''}`}
          placeholder={type === 'debt' ? 'e.g. Pay off Visa' : 'e.g. Emergency fund'}
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>

      {/* Type */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex items-center justify-center rounded-xl border border-white/10 px-3 py-2.5 cursor-pointer text-sm font-medium text-slate-300 has-[:checked]:border-emerald-500/60 has-[:checked]:bg-emerald-500/10 has-[:checked]:text-emerald-300">
          <input type="radio" value="savings" className="sr-only" {...register('type')} />
          🐖 Savings
        </label>
        <label className="flex items-center justify-center rounded-xl border border-white/10 px-3 py-2.5 cursor-pointer text-sm font-medium text-slate-300 has-[:checked]:border-rose-500/60 has-[:checked]:bg-rose-500/10 has-[:checked]:text-rose-300">
          <input type="radio" value="debt" className="sr-only" {...register('type')} />
          💳 Pay off debt
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">
            {type === 'debt' ? 'Starting balance to pay off' : 'Target amount'} <span className="text-rose-400">*</span>
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            className={`input ${errors.target_amount ? 'input-error' : ''}`}
            placeholder="0.00"
            {...register('target_amount', {
              required: 'Target is required',
              validate: (v) => Number(v) > 0 || 'Must be greater than zero',
            })}
          />
          {errors.target_amount && <p className="field-error">{errors.target_amount.message}</p>}
        </div>
        <div>
          <label className="label">Target date</label>
          <input type="date" className="input" {...register('target_date')} />
        </div>
      </div>

      <div>
        <label className="label">Link to account (optional)</label>
        <select className="input" {...register('account_id')}>
          <option value="">Track manually</option>
          {relevantAccounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-slate-500">
          {accountId
            ? type === 'debt'
              ? 'Progress is the amount paid down on this account.'
              : "Progress tracks this account's balance automatically."
            : type === 'debt'
              ? 'Update progress manually as you pay it down.'
              : 'Add contributions manually to track progress.'}
        </p>
      </div>

      {!accountId && (
        <div>
          <label className="label">{type === 'debt' ? 'Paid off so far' : 'Saved so far'}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            placeholder="0.00"
            {...register('current_amount')}
          />
        </div>
      )}

      <div>
        <label className="label">Notes</label>
        <textarea className="input" rows={2} placeholder="Optional" {...register('notes')} />
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isLoading} className="btn-primary flex-1">
          {isLoading ? 'Saving…' : submitLabel || 'Save'}
        </button>
      </div>
    </form>
  )
}
