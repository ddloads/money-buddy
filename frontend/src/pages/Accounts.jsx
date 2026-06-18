import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ScaleIcon,
  ArrowsRightLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import AccountForm from '../components/AccountForm'
import ConfirmDialog from '../components/ConfirmDialog'
import {
  useAccounts,
  useNetWorth,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from '../hooks/useAccounts'
import { useCurrency } from '../hooks/useCurrency'
import { typeMeta } from '../utils/accounts'

function AccountModal({ account, onClose }) {
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount(account?.id)
  const isLoading = createAccount.isPending || updateAccount.isPending
  const error = createAccount.error || updateAccount.error

  const handleSubmit = (data) => {
    const mut = account ? updateAccount : createAccount
    mut.mutate(data, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={onClose} />
      <div className="card p-6 w-full max-w-lg z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-5">
          {account ? 'Edit Account' : 'Add Account'}
        </h2>
        {error && (
          <div className="alert-error mb-4">
            {error?.response?.data?.detail || 'Failed to save. Please try again.'}
          </div>
        )}
        <AccountForm
          defaultValues={account}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isLoading={isLoading}
          submitLabel={account ? 'Save Changes' : 'Add Account'}
        />
      </div>
    </div>
  )
}

export default function Accounts() {
  const navigate = useNavigate()
  const { format } = useCurrency()
  const { data: accounts, isLoading } = useAccounts()
  const { data: netWorth } = useNetWorth()
  const deleteAccount = useDeleteAccount()

  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const openNew = () => { setEditing(null); setShowModal(true) }
  const openEdit = (account) => { setEditing(account); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setEditing(null) }

  const handleDelete = () => {
    deleteAccount.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-header">Accounts</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Track balances across your accounts to see your net worth.
          </p>
        </div>
        <button onClick={openNew} className="btn-primary w-full sm:w-auto sm:flex-shrink-0">
          <PlusIcon className="h-4 w-4" />
          Add Account
        </button>
      </div>

      {/* Net worth summary */}
      <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-emerald-600 to-teal-700 shadow-glow">
        <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-white/15 rounded-xl">
            <ScaleIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Net Worth</p>
            <p className="text-3xl font-bold text-white mt-0.5">{format(netWorth?.net_worth ?? 0)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-emerald-100 text-xs">Assets</p>
            <p className="text-lg font-bold text-white">{format(netWorth?.total_assets ?? 0)}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-emerald-100 text-xs">Liabilities</p>
            <p className="text-lg font-bold text-white">{format(netWorth?.total_liabilities ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* Account list */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card p-4">
              <div className="skeleton h-5 w-32 mb-2" />
              <div className="skeleton h-7 w-24" />
            </div>
          ))}
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🏦</div>
          <p className="text-lg font-semibold text-slate-100 mb-1">No accounts yet</p>
          <p className="text-sm text-slate-400 mb-4">
            Add your checking, savings, credit cards, and loans to track your net worth.
          </p>
          <button onClick={openNew} className="btn-primary mx-auto">
            <PlusIcon className="h-4 w-4" />
            Add Your First Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {accounts.map((account) => {
            const meta = typeMeta(account.type)
            const owed = account.is_liability
            return (
              <div
                key={account.id}
                className={`card-interactive p-4 group ${!account.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-xl bg-white/[0.05] flex items-center justify-center text-xl flex-shrink-0">
                    {meta.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-100 truncate">{account.name}</p>
                      <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => openEdit(account)} className="btn-ghost p-1.5" title="Edit">
                          <PencilSquareIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(account)}
                          className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {meta.label}{account.institution ? ` · ${account.institution}` : ''}
                    </p>
                    <p className={`text-2xl font-bold mt-2 ${owed ? 'text-rose-300' : 'text-slate-100'}`}>
                      {owed
                        ? `${format(Math.abs(account.balance))}`
                        : format(account.balance)}
                      {owed && <span className="text-xs font-medium text-slate-500 ml-1.5">owed</span>}
                    </p>
                  </div>
                </div>
                {account.covered_bills_count > 0 && (
                  <div className={`mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                    Number(account.balance) >= Number(account.covered_bills_due)
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'bg-amber-500/10 text-amber-300'
                  }`}>
                    <span>
                      Covers {account.covered_bills_count} bill{account.covered_bills_count !== 1 ? 's' : ''} · {format(account.covered_bills_due)} due
                    </span>
                    <span className="font-semibold">
                      {Number(account.balance) >= Number(account.covered_bills_due) ? 'Funded' : 'Short'}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => navigate(`/transactions?account=${account.id}`)}
                  className="mt-3 w-full text-xs text-emerald-400 hover:underline flex items-center justify-center gap-1.5 py-1.5"
                >
                  <ArrowsRightLeftIcon className="h-3.5 w-3.5" />
                  {account.transaction_count} transaction{account.transaction_count !== 1 ? 's' : ''}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {showModal && <AccountModal account={editing} onClose={closeModal} />}

      <ConfirmDialog
        open={!!deleting}
        title="Delete account?"
        message={
          <>Delete <strong>&quot;{deleting?.name}&quot;</strong> and all of its transactions? This can&apos;t be undone.</>
        }
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        loading={deleteAccount.isPending}
      />
    </div>
  )
}
