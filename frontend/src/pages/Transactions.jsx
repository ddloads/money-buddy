import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  ArrowUpTrayIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import TransactionForm from '../components/TransactionForm'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAccounts } from '../hooks/useAccounts'
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useImportTransactions,
} from '../hooks/useTransactions'
import { useCurrency } from '../hooks/useCurrency'
import { transactionsAPI } from '../utils/api'

const TYPE_FILTERS = [
  { value: '', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expenses' },
]

function TxnModal({ txn, onClose }) {
  const create = useCreateTransaction()
  const update = useUpdateTransaction(txn?.id)
  const isLoading = create.isPending || update.isPending
  const error = create.error || update.error

  const handleSubmit = (data) => {
    const mut = txn ? update : create
    mut.mutate(data, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={onClose} />
      <div className="card p-6 w-full max-w-lg z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-5">
          {txn ? 'Edit Transaction' : 'Add Transaction'}
        </h2>
        {error && (
          <div className="alert-error mb-4">
            {error?.response?.data?.detail || 'Failed to save. Please try again.'}
          </div>
        )}
        <TransactionForm
          defaultValues={txn}
          onSubmit={handleSubmit}
          onCancel={onClose}
          isLoading={isLoading}
          submitLabel={txn ? 'Save Changes' : 'Add Transaction'}
        />
      </div>
    </div>
  )
}

function ImportModal({ accounts, onClose }) {
  const { format: fc } = useCurrency()
  const importTxns = useImportTransactions()
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(null)

  const handleFile = async (e) => {
    const f = e.target.files?.[0]
    setFile(f || null)
    setPreview(null)
    setError(null)
    if (!f) return
    setPreviewing(true)
    try {
      const res = await transactionsAPI.previewImport(f)
      setPreview(res.data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not read that CSV file.')
    } finally {
      setPreviewing(false)
    }
  }

  const handleImport = () => {
    importTxns.mutate(
      { accountId: Number(accountId), file },
      { onSuccess: (data) => setDone(data) }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={onClose} />
      <div className="card p-6 w-full max-w-xl z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Import transactions from CSV</h2>
          <button onClick={onClose} className="btn-ghost p-1"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <CheckCircleIcon className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
            <p className="text-slate-100 font-semibold mb-1">Imported {done.imported} transactions</p>
            {done.skipped > 0 && (
              <p className="text-sm text-slate-400">{done.skipped} rows skipped (unreadable date or amount).</p>
            )}
            <button onClick={onClose} className="btn-primary mt-4 mx-auto">Done</button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <label className="label">Import into account</label>
                <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div>
                <label className="label">CSV file</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFile}
                  className="block w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-500/15 file:text-emerald-300 file:font-medium hover:file:bg-emerald-500/25 file:cursor-pointer"
                />
                <p className="mt-1 text-xs text-slate-500">
                  We auto-detect Date, Description, and Amount (or separate Debit/Credit) columns.
                </p>
              </div>

              {previewing && <p className="text-sm text-slate-400">Reading file…</p>}
              {error && <div className="alert-error">{error}</div>}

              {preview && (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <div className="px-3 py-2 bg-white/[0.04] text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Date: <span className="text-slate-200">{preview.detected_columns.date || '—'}</span></span>
                    <span>Description: <span className="text-slate-200">{preview.detected_columns.description || '—'}</span></span>
                    <span>Amount: <span className="text-slate-200">{preview.detected_columns.amount || '—'}</span></span>
                    <span className="ml-auto text-emerald-400">{preview.valid_rows}/{preview.total_rows} ready</span>
                  </div>
                  <div className="max-h-56 overflow-y-auto divide-y divide-white/[0.04]">
                    {preview.rows.slice(0, 50).map((row, i) => (
                      <div key={i} className={`flex items-center gap-3 px-3 py-2 text-sm ${row.valid ? '' : 'opacity-50'}`}>
                        <span className="text-slate-500 w-20 flex-shrink-0">
                          {row.date ? format(parseISO(row.date), 'MMM d') : '—'}
                        </span>
                        <span className="text-slate-200 truncate flex-1">{row.description}</span>
                        <span className={`flex-shrink-0 font-medium ${row.amount < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                          {row.amount != null ? fc(row.amount) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {importTxns.isError && (
                <div className="alert-error">
                  {importTxns.error?.response?.data?.detail || 'Import failed.'}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-5">
              <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={handleImport}
                disabled={!file || !accountId || !preview || preview.valid_rows === 0 || importTxns.isPending}
                className="btn-primary flex-1"
              >
                {importTxns.isPending ? 'Importing…' : preview ? `Import ${preview.valid_rows}` : 'Import'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Transactions() {
  const { format: fc } = useCurrency()
  const [searchParams] = useSearchParams()
  const { data: accounts = [] } = useAccounts()

  const [accountId, setAccountId] = useState(searchParams.get('account') || '')
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [showImport, setShowImport] = useState(false)

  const pageSize = 50
  const params = {
    page,
    page_size: pageSize,
    account_id: accountId || undefined,
    type: type || undefined,
    search: search || undefined,
    sort: 'date_desc',
  }
  const { data, isLoading } = useTransactions(params)
  const deleteTxn = useDeleteTransaction()

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const pages = data?.pages ?? 0

  const accountName = (id) => accounts.find((a) => a.id === id)?.name || ''

  const resetPageAnd = (fn) => (value) => { setPage(1); fn(value) }

  const openNew = () => { setEditing(null); setShowModal(true) }
  const openEdit = (txn) => { setEditing(txn); setShowModal(true) }
  const handleDelete = () => deleteTxn.mutate(deleting.id, { onSuccess: () => setDeleting(null) })

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Transactions</h1>
          <p className="text-sm text-slate-400 mt-0.5">Every dollar in and out, across your accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            disabled={accounts.length === 0}
            className="btn-secondary text-sm flex-1 sm:flex-none"
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Import CSV</span>
          </button>
          <button onClick={openNew} disabled={accounts.length === 0} className="btn-primary flex-1 sm:flex-none">
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🏦</div>
          <p className="text-lg font-semibold text-slate-100 mb-1">Add an account first</p>
          <p className="text-sm text-slate-400">
            Transactions belong to an account. Create one on the Accounts page to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => resetPageAnd(setSearch)(e.target.value)}
                placeholder="Search descriptions…"
                className="input pl-10 pr-9"
              />
              {search && (
                <button onClick={() => resetPageAnd(setSearch)('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
            <select
              value={accountId}
              onChange={(e) => resetPageAnd(setAccountId)(e.target.value)}
              className="input sm:w-48"
            >
              <option value="">All accounts</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => resetPageAnd(setType)(f.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  type === f.value
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-glow'
                    : 'bg-white/[0.04] text-slate-400 border border-white/10 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          {isLoading && !data ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="card p-3.5 flex items-center gap-3">
                  <div className="skeleton h-9 w-9 rounded-lg" />
                  <div className="flex-1"><div className="skeleton h-4 w-40 mb-1.5" /><div className="skeleton h-3 w-24" /></div>
                  <div className="skeleton h-5 w-16" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">🧾</div>
              <p className="text-lg font-semibold text-slate-100 mb-1">No transactions found</p>
              <p className="text-sm text-slate-400 mb-4">
                {search || type || accountId ? 'Try adjusting your filters.' : 'Add one manually or import a CSV from your bank.'}
              </p>
              {!search && !type && !accountId && (
                <button onClick={openNew} className="btn-primary mx-auto"><PlusIcon className="h-4 w-4" />Add Transaction</button>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500">{total} transaction{total !== 1 ? 's' : ''}</p>
              <div className="space-y-1.5">
                {items.map((txn) => (
                  <div key={txn.id} className="card-interactive p-3.5 flex items-center gap-3 group">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ backgroundColor: txn.category?.color ? `${txn.category.color}26` : '#33415526' }}
                    >
                      {txn.category?.icon || (txn.amount < 0 ? '💸' : '💰')}
                    </div>
                    <button onClick={() => openEdit(txn)} className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-medium text-slate-100 truncate group-hover:text-emerald-300">{txn.description}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {format(parseISO(String(txn.date)), 'MMM d, yyyy')}
                        {accountId ? '' : ` · ${accountName(txn.account_id)}`}
                        {txn.category ? ` · ${txn.category.name}` : ''}
                      </p>
                    </button>
                    <span className={`text-sm font-bold flex-shrink-0 ${txn.amount < 0 ? 'text-slate-200' : 'text-emerald-400'}`}>
                      {txn.amount < 0 ? '-' : '+'}{fc(Math.abs(txn.amount))}
                    </span>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => openEdit(txn)} className="btn-ghost p-1.5" title="Edit"><PencilSquareIcon className="h-4 w-4" /></button>
                      <button onClick={() => setDeleting(txn)} className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10" title="Delete"><TrashIcon className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary text-sm disabled:opacity-40">
                    <ChevronLeftIcon className="h-4 w-4" />Prev
                  </button>
                  <span className="text-xs text-slate-500">Page {page} of {pages}</span>
                  <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="btn-secondary text-sm disabled:opacity-40">
                    Next<ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showModal && <TxnModal txn={editing} onClose={() => { setShowModal(false); setEditing(null) }} />}
      {showImport && <ImportModal accounts={accounts} onClose={() => setShowImport(false)} />}

      <ConfirmDialog
        open={!!deleting}
        title="Delete transaction?"
        message={<>Delete <strong>&quot;{deleting?.description}&quot;</strong>?</>}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        loading={deleteTxn.isPending}
      />
    </div>
  )
}
