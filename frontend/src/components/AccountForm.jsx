import { useForm } from 'react-hook-form'
import { ACCOUNT_TYPES, isLiabilityType } from '../utils/accounts'

export default function AccountForm({ defaultValues, onSubmit, onCancel, isLoading, submitLabel }) {
  const liabilityDefault = defaultValues && isLiabilityType(defaultValues.type)
  // Liabilities are stored negative; show the owed amount as a positive number.
  const displayBalance =
    defaultValues?.starting_balance != null
      ? liabilityDefault
        ? Math.abs(Number(defaultValues.starting_balance))
        : Number(defaultValues.starting_balance)
      : ''
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      name: defaultValues?.name ?? '',
      type: defaultValues?.type ?? 'checking',
      institution: defaultValues?.institution ?? '',
      starting_balance: displayBalance,
      is_active: defaultValues?.is_active ?? true,
    },
  })

  const selectedType = watch('type')
  const liability = isLiabilityType(selectedType)

  const submit = (data) => {
    const raw = data.starting_balance === '' || data.starting_balance == null
      ? 0
      : Number(data.starting_balance)
    const starting_balance = liability ? -Math.abs(raw) : raw
    onSubmit({
      name: data.name,
      type: data.type,
      institution: data.institution || null,
      starting_balance,
      is_active: data.is_active,
    })
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <div>
        <label className="label">Name <span className="text-rose-400">*</span></label>
        <input
          type="text"
          className={`input ${errors.name ? 'input-error' : ''}`}
          placeholder="e.g. Everyday Checking"
          {...register('name', { required: 'Name is required' })}
        />
        {errors.name && <p className="field-error">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select className="input" {...register('type')}>
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Institution</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. Chase"
            {...register('institution')}
          />
        </div>
      </div>

      <div>
        <label className="label">{liability ? 'Amount currently owed' : 'Current balance'}</label>
        <input
          type="number"
          step="0.01"
          className="input"
          placeholder="0.00"
          {...register('starting_balance')}
        />
        <p className="mt-1 text-xs text-slate-500">
          {liability
            ? 'Enter what you owe as a positive number — it counts against your net worth.'
            : 'Your balance today. Imported or added transactions adjust it from here.'}
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" className="h-4 w-4 rounded" {...register('is_active')} />
        Active
      </label>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={isLoading} className="btn-primary flex-1">
          {isLoading ? 'Saving…' : submitLabel || 'Save'}
        </button>
      </div>
    </form>
  )
}
