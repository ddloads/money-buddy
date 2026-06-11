import { useState } from 'react'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  BanknotesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import IncomeForm from '../components/IncomeForm'
import ConfirmDialog from '../components/ConfirmDialog'
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from '../hooks/useIncome'
import { useCurrency } from '../hooks/useCurrency'

const FREQUENCY_LABELS = {
  weekly: 'Weekly',
  biweekly: 'Bi-weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  one_time: 'One-time',
}

const FREQ_MONTHLY = {
  weekly: 4.333,
  biweekly: 2.167,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
  one_time: 0,
}

function IncomeModal({ income, onClose }) {
  const createIncome = useCreateIncome()
  const updateIncome = useUpdateIncome(income?.id)

  const handleSubmit = (data) => {
    const payload = {
      ...data,
      amount: Number(data.amount),
      start_date: data.start_date || null,
      notes: data.notes || null,
    }
    if (income) {
      updateIncome.mutate(payload, { onSuccess: onClose })
    } else {
      createIncome.mutate(payload, { onSuccess: onClose })
    }
  }

  const isLoading = createIncome.isPending || updateIncome.isPending
  const error = createIncome.error || updateIncome.error

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={onClose} />
      <div className="card p-6 w-full max-w-lg z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-5">
          {income ? 'Edit Income Source' : 'Add Income Source'}
        </h2>
        {error && (
          <div className="alert-error mb-4">
            {error?.response?.data?.detail || 'Failed to save. Please try again.'}
          </div>
        )}
        <IncomeForm
          defaultValues={income}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          submitLabel={income ? 'Save Changes' : 'Add Income'}
        />
      </div>
    </div>
  )
}

export default function Income() {
  const { data: incomes, isLoading } = useIncomes()
  const deleteIncome = useDeleteIncome()
  const { format } = useCurrency()
  const [showModal, setShowModal] = useState(false)
  const [editingIncome, setEditingIncome] = useState(null)
  const [deletingIncome, setDeletingIncome] = useState(null)

  const handleEdit = (income) => {
    setEditingIncome(income)
    setShowModal(true)
  }

  const handleDelete = () => {
    deleteIncome.mutate(deletingIncome.id, { onSuccess: () => setDeletingIncome(null) })
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingIncome(null)
  }

  const totalMonthlyIncome = (incomes || [])
    .filter((i) => i.is_active)
    .reduce((sum, i) => sum + Number(i.amount) * (FREQ_MONTHLY[i.frequency] || 0), 0)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-header">Income Sources</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track your income to compare against your bills and expenses.
          </p>
        </div>
        <button onClick={() => { setEditingIncome(null); setShowModal(true) }} className="btn-primary w-full sm:w-auto sm:flex-shrink-0">
          <PlusIcon className="h-4 w-4" />
          Add Income
        </button>
      </div>

      {/* Summary card */}
      <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-blue-600 to-indigo-700 shadow-glow-blue">
        <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/15 rounded-xl">
            <BanknotesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Total Monthly Income</p>
            <p className="text-2xl font-bold text-white mt-0.5">{format(totalMonthlyIncome)}</p>
          </div>
        </div>
        <p className="text-blue-200 text-xs mt-3">
          Based on {(incomes || []).filter((i) => i.is_active).length} active source(s) converted to monthly equivalent.
        </p>
      </div>

      {/* Income list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-5 w-40 mb-2" />
              <div className="skeleton h-4 w-24" />
            </div>
          ))}
        </div>
      ) : !incomes || incomes.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">💰</div>
          <h3 className="font-semibold text-slate-200 mb-1">No income sources yet</h3>
          <p className="text-sm text-slate-400 mb-4">
            Add your salary, freelance work, or any other income to compare against your expenses.
          </p>
          <button onClick={() => { setEditingIncome(null); setShowModal(true) }} className="btn-primary mx-auto">
            <PlusIcon className="h-4 w-4" />
            Add Your First Income
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {incomes.map((income) => {
            const monthly = Number(income.amount) * (FREQ_MONTHLY[income.frequency] || 0)
            return (
              <div key={income.id} className={`card-interactive p-4 flex items-start gap-4 ${!income.is_active ? 'opacity-60' : ''}`}>
                <div className="p-2.5 bg-blue-500/15 rounded-xl flex-shrink-0">
                  <BanknotesIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-100 truncate">{income.name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-sm font-semibold text-blue-400">
                          {format(income.amount)}
                        </span>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="text-xs text-slate-400">
                          {FREQUENCY_LABELS[income.frequency] || income.frequency}
                        </span>
                        {income.frequency !== 'one_time' && income.frequency !== 'monthly' && (
                          <>
                            <span className="text-xs text-slate-600">·</span>
                            <span className="text-xs text-slate-500">
                              ≈ {format(monthly)}/mo
                            </span>
                          </>
                        )}
                        {!income.is_active && (
                          <span className="badge-gray">Inactive</span>
                        )}
                        {income.is_active && (
                          <span className="badge-green">
                            <CheckCircleIcon className="h-3 w-3" />
                            Active
                          </span>
                        )}
                      </div>
                      {income.notes && (
                        <p className="text-xs text-slate-500 mt-1 truncate">{income.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(income)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingIncome(income)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <IncomeModal income={editingIncome} onClose={closeModal} />
      )}

      <ConfirmDialog
        open={!!deletingIncome}
        title="Remove income source?"
        message={<>Remove <strong>&quot;{deletingIncome?.name}&quot;</strong> from your income sources?</>}
        onConfirm={handleDelete}
        onCancel={() => setDeletingIncome(null)}
        confirmLabel="Remove"
        loadingLabel="Removing…"
        loading={deleteIncome.isPending}
      />
    </div>
  )
}
