import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  FlagIcon,
  CheckCircleIcon,
  BanknotesIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'
import GoalForm from '../components/GoalForm'
import ConfirmDialog from '../components/ConfirmDialog'
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useContributeGoal,
  useDeleteGoal,
} from '../hooks/useGoals'
import { useCurrency } from '../hooks/useCurrency'

function GoalModal({ goal, onClose }) {
  const create = useCreateGoal()
  const update = useUpdateGoal(goal?.id)
  const isLoading = create.isPending || update.isPending
  const error = create.error || update.error

  const handleSubmit = (data) => {
    const mut = goal ? update : create
    mut.mutate(data, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={onClose} />
      <div className="card p-6 w-full max-w-lg z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-5">{goal ? 'Edit Goal' : 'New Goal'}</h2>
        {error && (
          <div className="alert-error mb-4">
            {error?.response?.data?.detail || 'Failed to save. Please try again.'}
          </div>
        )}
        <GoalForm
          defaultValues={goal}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isLoading={isLoading}
          submitLabel={goal ? 'Save Changes' : 'Create Goal'}
        />
      </div>
    </div>
  )
}

function ContributeModal({ goal, onClose }) {
  const { format: fc } = useCurrency()
  const contribute = useContributeGoal()
  const [amount, setAmount] = useState('')

  const submit = (sign) => {
    const value = Number(amount)
    if (!value || value <= 0) return
    contribute.mutate({ id: goal.id, amount: sign * value }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={onClose} />
      <div className="card p-6 w-full max-w-sm z-10 animate-slide-up">
        <h2 className="text-lg font-semibold text-white mb-1">Update progress</h2>
        <p className="text-sm text-slate-400 mb-4">
          {goal.name} · {fc(goal.saved)} of {fc(goal.target_amount)}
        </p>
        <input
          type="number"
          step="0.01"
          min="0"
          autoFocus
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="input mb-4"
        />
        <div className="flex gap-2">
          <button onClick={() => submit(-1)} disabled={contribute.isPending} className="btn-secondary flex-1">
            − Subtract
          </button>
          <button onClick={() => submit(1)} disabled={contribute.isPending} className="btn-primary flex-1">
            + Add
          </button>
        </div>
        <button onClick={onClose} className="btn-ghost w-full mt-2 text-sm">Cancel</button>
      </div>
    </div>
  )
}

function GoalCard({ goal, onEdit, onContribute, onDelete }) {
  const { format: fc } = useCurrency()
  const isDebt = goal.type === 'debt'
  const barColor = goal.completed
    ? 'from-emerald-500 to-teal-400'
    : isDebt
      ? 'from-rose-500 to-orange-400'
      : 'from-blue-500 to-indigo-400'

  return (
    <div className="card-interactive p-5 group">
      <div className="flex items-start gap-3 mb-3">
        <div className="h-11 w-11 rounded-xl bg-white/[0.05] flex items-center justify-center text-xl flex-shrink-0">
          {isDebt ? '💳' : '🐖'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-slate-100 truncate">{goal.name}</p>
            {goal.completed && (
              <span className="badge-green !py-0.5 !px-1.5 text-[10px]">
                <CheckCircleIcon className="h-2.5 w-2.5" />
                Done
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            {isDebt ? 'Debt payoff' : 'Savings'}
            {goal.linked && goal.account_name && (
              <span className="flex items-center gap-0.5 text-slate-400">
                <LinkIcon className="h-3 w-3" /> {goal.account_name}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={() => onEdit(goal)} className="btn-ghost p-1.5" title="Edit">
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button onClick={() => onDelete(goal)} className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10" title="Delete">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-end justify-between mb-1.5">
        <span className="text-lg font-bold text-slate-100">{fc(goal.saved)}</span>
        <span className="text-xs text-slate-500">of {fc(goal.target_amount)}</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
          style={{ width: `${goal.progress_pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1.5">
        <span className="text-slate-400">{goal.progress_pct}%</span>
        <span className="text-slate-500">
          {goal.completed ? 'Reached 🎉' : `${fc(goal.remaining)} ${isDebt ? 'left to pay' : 'to go'}`}
        </span>
      </div>

      {/* Footer hints */}
      {(goal.target_date || goal.monthly_needed != null) && !goal.completed && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] text-xs">
          {goal.target_date ? (
            <span className="text-slate-500">By {format(parseISO(String(goal.target_date)), 'MMM yyyy')}</span>
          ) : <span />}
          {goal.monthly_needed != null && (
            <span className="text-emerald-400 font-medium">{fc(goal.monthly_needed)}/mo</span>
          )}
        </div>
      )}

      {/* Manual contribution */}
      {!goal.linked && !goal.completed && (
        <button onClick={() => onContribute(goal)} className="btn-secondary w-full mt-3 text-sm gap-1.5">
          <BanknotesIcon className="h-4 w-4" />
          {isDebt ? 'Log payment' : 'Add contribution'}
        </button>
      )}
    </div>
  )
}

export default function Goals() {
  const { format: fc } = useCurrency()
  const { data: goals, isLoading } = useGoals()
  const deleteGoal = useDeleteGoal()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [contributing, setContributing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const openNew = () => { setEditing(null); setShowModal(true) }
  const openEdit = (g) => { setEditing(g); setShowModal(true) }
  const handleDelete = () => deleteGoal.mutate(deleting.id, { onSuccess: () => setDeleting(null) })

  const list = goals || []
  const activeCount = list.filter((g) => !g.completed).length
  const totalSaved = list.filter((g) => g.type === 'savings').reduce((s, g) => s + Number(g.saved), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <FlagIcon className="h-7 w-7 text-emerald-400" />
            Goals
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Set savings targets and debt-payoff goals, and track your progress.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary w-full sm:w-auto sm:flex-shrink-0">
          <PlusIcon className="h-4 w-4" />
          New Goal
        </button>
      </div>

      {/* Summary */}
      {list.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="card p-4">
            <p className="text-xs text-slate-400 mb-1">Active goals</p>
            <p className="text-xl font-bold text-slate-100">{activeCount}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-400 mb-1">Saved toward goals</p>
            <p className="text-xl font-bold text-emerald-400">{fc(totalSaved)}</p>
          </div>
          <div className="card p-4 col-span-2 sm:col-span-1">
            <p className="text-xs text-slate-400 mb-1">Completed</p>
            <p className="text-xl font-bold text-blue-300">{list.length - activeCount}</p>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-5 w-32 mb-3" />
              <div className="skeleton h-2.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-lg font-semibold text-slate-100 mb-1">No goals yet</p>
          <p className="text-sm text-slate-400 mb-4">
            Create a savings target or a debt-payoff goal to start tracking progress.
          </p>
          <button onClick={openNew} className="btn-primary mx-auto">
            <PlusIcon className="h-4 w-4" />
            Create Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={openEdit}
              onContribute={setContributing}
              onDelete={setDeleting}
            />
          ))}
        </div>
      )}

      {showModal && <GoalModal goal={editing} onClose={() => { setShowModal(false); setEditing(null) }} />}
      {contributing && <ContributeModal goal={contributing} onClose={() => setContributing(null)} />}

      <ConfirmDialog
        open={!!deleting}
        title="Delete goal?"
        message={<>Delete <strong>&quot;{deleting?.name}&quot;</strong>?</>}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        loading={deleteGoal.isPending}
      />
    </div>
  )
}
