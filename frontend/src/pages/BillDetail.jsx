import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeftIcon,
  TrashIcon,
  CheckCircleIcon,
  PaperClipIcon,
  XMarkIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid'
import BillForm from '../components/BillForm'
import CategoryBadge from '../components/CategoryBadge'
import { formatBillDate } from '../utils/billDates'
import { normalizeBillFormData } from '../utils/billPayload'
import { useCurrency } from '../hooks/useCurrency'
import {
  useBill,
  useCreateBill,
  useUpdateBill,
  useDeleteBill,
  useMarkBillPaid,
  useUploadReceipt,
  useDeleteReceipt,
  usePaymentHistory,
  usePayoffEstimate,
} from '../hooks/useBills'

function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Delete', loading }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="card p-6 w-full max-w-sm z-10 animate-slide-up">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn-danger flex-1"
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function PayoffTab({ payoff, loading, error, format }) {
  const [showFull, setShowFull] = useState(false)

  if (loading) {
    return (
      <div className="card p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i}>
              <div className="skeleton h-3 w-20 mb-2" />
              <div className="skeleton h-6 w-28" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-4 sm:p-6">
        <p className="text-sm text-red-500 dark:text-red-400">
          {error?.response?.data?.detail || 'Could not load payoff estimate.'}
        </p>
      </div>
    )
  }

  if (!payoff) return null

  const displayMonths = showFull ? payoff.schedule : payoff.schedule.slice(0, 12)
  const netSavings = payoff.total_paid - payoff.remaining_balance

  return (
    <div className="space-y-5">
      {/* Key stats */}
      <div className="card p-4 sm:p-6">
        <h3 className="section-title mb-4">Payoff Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          {[
            { label: 'Estimated Payoff', value: payoff.estimated_payoff_date, highlight: true },
            { label: 'Months Remaining', value: `${payoff.months_remaining} mo` },
            { label: 'Monthly Payment', value: format(payoff.monthly_payment) },
            { label: 'Remaining Balance', value: format(payoff.remaining_balance) },
            { label: 'Total Interest', value: format(payoff.total_interest), warn: payoff.total_interest > 0 },
            { label: 'Total Cost', value: format(payoff.total_paid) },
          ].map(({ label, value, highlight, warn }) => (
            <div key={label}>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">{label}</p>
              <p className={`text-base font-semibold ${
                highlight ? 'text-emerald-600 dark:text-emerald-400' :
                warn ? 'text-amber-600 dark:text-amber-400' :
                'text-gray-900 dark:text-gray-100'
              }`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {payoff.total_interest > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              You'll pay <strong>{format(payoff.total_interest)}</strong> in interest on top of the <strong>{format(payoff.remaining_balance)}</strong> balance — <strong>{format(netSavings)}</strong> extra in total.
            </p>
          </div>
        )}
      </div>

      {/* Amortization schedule */}
      <div className="card p-4 sm:p-6">
        <h3 className="section-title mb-4">
          Amortization Schedule
          {payoff.schedule.length > 12 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              ({payoff.schedule.length} months total)
            </span>
          )}
        </h3>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[400px]">
            <thead>
              <tr className="text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800">
                <th className="text-left py-2 px-2 font-medium">Month</th>
                <th className="text-right py-2 px-2 font-medium">Payment</th>
                <th className="text-right py-2 px-2 font-medium">Principal</th>
                <th className="text-right py-2 px-2 font-medium">Interest</th>
                <th className="text-right py-2 px-2 font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {displayMonths.map((row) => (
                <tr
                  key={row.month}
                  className={`border-b border-gray-50 dark:border-gray-900 ${
                    row.balance === 0 ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''
                  }`}
                >
                  <td className="py-2 px-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {row.month_name} {row.year}
                  </td>
                  <td className="py-2 px-2 text-right font-medium text-gray-900 dark:text-gray-100">
                    {format(row.payment)}
                  </td>
                  <td className="py-2 px-2 text-right text-emerald-700 dark:text-emerald-400">
                    {format(row.principal)}
                  </td>
                  <td className="py-2 px-2 text-right text-amber-600 dark:text-amber-400">
                    {format(row.interest)}
                  </td>
                  <td className={`py-2 px-2 text-right font-medium ${
                    row.balance === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {row.balance === 0 ? '✓ Paid off' : format(row.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {payoff.schedule.length > 12 && (
          <button
            onClick={() => setShowFull((v) => !v)}
            className="mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
          >
            {showFull ? 'Show less' : `Show all ${payoff.schedule.length} months`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function BillDetail({ isNew = false }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileRef = useRef()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [activeTab, setActiveTab] = useState('details') // details | receipt | history

  const { format } = useCurrency()
  const { data: bill, isLoading } = useBill(isNew ? null : id)
  const { data: paymentHistory } = usePaymentHistory(isNew ? null : id)
  const hasBalance = !isNew && bill?.remaining_balance > 0
  const { data: payoff, isLoading: payoffLoading, error: payoffError } = usePayoffEstimate(hasBalance ? id : null)
  const createBill = useCreateBill()
  const updateBill = useUpdateBill(id)
  const deleteBill = useDeleteBill()
  const markPaid = useMarkBillPaid()
  const uploadReceipt = useUploadReceipt(id)
  const deleteReceipt = useDeleteReceipt(id)

  const handleSubmit = (data) => {
    const payload = normalizeBillFormData(data)
    if (isNew) {
      createBill.mutate(payload, { onSuccess: () => navigate('/bills') })
    } else {
      updateBill.mutate(payload)
    }
  }

  const handleDelete = () => {
    deleteBill.mutate(id, {
      onSuccess: () => navigate('/bills'),
    })
  }

  const handleMarkPaid = () => {
    markPaid.mutate(
      { id, data: { paid_date: new Date().toISOString().split('T')[0] } },
      { onSuccess: () => setShowPayDialog(false) }
    )
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadReceipt.mutate(file)
    }
    e.target.value = ''
  }

  const handleDeleteReceipt = () => {
    deleteReceipt.mutate()
  }

  // Loading state
  if (!isNew && isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="skeleton h-8 w-8 rounded-lg" />
          <div className="skeleton h-6 w-40" />
        </div>
        <div className="card p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="skeleton h-3 w-20 mb-2" />
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      {/* Back + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost gap-2 self-start"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>

        {!isNew && bill && (
          <div className="flex w-full sm:w-auto items-center gap-2">
            {!bill.is_paid && (
              <button
                onClick={() => setShowPayDialog(true)}
                className="btn-outline gap-2 text-sm flex-1 sm:flex-none"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Mark Paid
              </button>
            )}
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex-1 sm:flex-none"
            >
              <TrashIcon className="h-4 w-4" />
              <span className="hidden sm:inline text-sm">Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Page title */}
      <div>
        <h1 className="page-header">
          {isNew ? 'Add New Bill' : bill?.name || 'Edit Bill'}
        </h1>
        {!isNew && bill && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {bill.category && <CategoryBadge category={bill.category} />}
            {bill.is_paid ? (
              <span className="badge-green flex items-center gap-1">
                <CheckCircleSolid className="h-3.5 w-3.5" />
                Paid {bill.paid_date ? `on ${formatBillDate(bill.paid_date, 'MMM d, yyyy')}` : ''}
              </span>
            ) : (
              <span className="badge-yellow">
                Due {formatBillDate(bill.due_date, 'MMM d, yyyy')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs (only for existing bills) */}
      {!isNew && (
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-800 scrollbar-thin">
          {[
            { key: 'details', label: 'Details' },
            { key: 'receipt', label: 'Receipt', badge: bill?.receipt_url ? '✓' : null },
            { key: 'history', label: 'History', badge: paymentHistory?.length > 0 ? paymentHistory.length : null },
            ...(hasBalance ? [{ key: 'payoff', label: 'Payoff' }] : []),
          ].map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === key
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {label}
              {badge && (
                <span className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 text-white text-xs">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Bill form */}
      {(isNew || activeTab === 'details') && (
        <div className="card p-4 sm:p-6">
          {(updateBill.isSuccess && !isNew) && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <p className="text-sm text-emerald-700 dark:text-emerald-400">✓ Changes saved successfully!</p>
            </div>
          )}
          {(createBill.isError || updateBill.isError) && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                {(createBill.error || updateBill.error)?.response?.data?.detail || 'Failed to save. Please try again.'}
              </p>
            </div>
          )}
          <BillForm
            defaultValues={isNew ? undefined : bill}
            onSubmit={handleSubmit}
            isLoading={createBill.isPending || updateBill.isPending}
            submitLabel={isNew ? 'Create Bill' : 'Save Changes'}
          />
        </div>
      )}

      {/* Receipt tab */}
      {!isNew && activeTab === 'receipt' && (
        <div className="card p-4 sm:p-6 space-y-4">
          {uploadReceipt.isError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                {uploadReceipt.error?.response?.data?.detail || 'Upload failed. Please try again.'}
              </p>
            </div>
          )}

          {bill?.receipt_url ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                  <PaperClipIcon className="h-4 w-4" />
                  <span className="font-medium">Receipt attached</span>
                </div>
                <button
                  onClick={handleDeleteReceipt}
                  disabled={deleteReceipt.isPending}
                  className="btn-ghost text-red-500 text-sm"
                >
                  <XMarkIcon className="h-4 w-4" />
                  Remove
                </button>
              </div>

              {/* Preview if it's an image */}
              {/\.(jpg|jpeg|png|webp|gif)$/i.test(bill.receipt_url) ? (
                <a href={bill.receipt_url} target="_blank" rel="noreferrer">
                  <img
                    src={bill.receipt_url}
                    alt="Receipt"
                    className="max-h-80 w-full max-w-md rounded-lg border border-gray-200 dark:border-gray-700 object-contain"
                  />
                </a>
              ) : (
                <a
                  href={bill.receipt_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 p-4 border border-dashed border-emerald-300 dark:border-emerald-700 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                >
                  <PaperClipIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">View Receipt</span>
                </a>
              )}

              {/* Replace button */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadReceipt.isPending}
                className="btn-secondary w-full"
              >
                {uploadReceipt.isPending ? 'Uploading…' : 'Replace Receipt'}
              </button>
            </div>
          ) : (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center cursor-pointer hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 transition-all duration-200 group"
            >
              <PhotoIcon className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3 group-hover:text-emerald-400 transition-colors" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {uploadReceipt.isPending ? 'Uploading…' : 'Upload a receipt'}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                PNG, JPG, PDF up to 10MB
              </p>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Payment history tab */}
      {!isNew && activeTab === 'history' && (
        <div className="card p-4 sm:p-6">
          <h3 className="section-title mb-4">Payment History</h3>
          {!paymentHistory || paymentHistory.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">📋</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No payment history yet</p>
            </div>
          ) : (
            <ol className="relative border-l border-gray-200 dark:border-gray-700 ml-3 space-y-4">
              {paymentHistory.map((entry) => (
                <li key={entry.id} className="ml-4">
                  <div className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-900 ${
                    entry.action === 'paid' ? 'bg-emerald-500' : 'bg-gray-400'
                  }`} />
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={`text-sm font-medium ${
                        entry.action === 'paid'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {entry.action === 'paid' ? '✓ Marked paid' : '↩ Marked unpaid'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {format(entry.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {/* Payoff estimate tab */}
      {!isNew && activeTab === 'payoff' && (
        <PayoffTab payoff={payoff} loading={payoffLoading} error={payoffError} format={format} />
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete bill?"
        message={`Are you sure you want to delete "${bill?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        loading={deleteBill.isPending}
      />

      {/* Mark paid confirmation */}
      <ConfirmDialog
        open={showPayDialog}
        title="Mark as paid?"
        message={`Mark "${bill?.name}" (${format(bill?.amount || 0)}) as paid today?`}
        onConfirm={handleMarkPaid}
        onCancel={() => setShowPayDialog(false)}
        confirmLabel="Mark Paid"
        loading={markPaid.isPending}
      />
    </div>
  )
}
