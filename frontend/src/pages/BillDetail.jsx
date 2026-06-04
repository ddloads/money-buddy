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
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost gap-2"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>

        {!isNew && bill && (
          <div className="flex items-center gap-2">
            {!bill.is_paid && (
              <button
                onClick={() => setShowPayDialog(true)}
                className="btn-outline gap-2 text-sm"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Mark Paid
              </button>
            )}
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
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
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {[
            { key: 'details', label: 'Details' },
            { key: 'receipt', label: 'Receipt', badge: bill?.receipt_url ? '✓' : null },
            { key: 'history', label: 'History', badge: paymentHistory?.length > 0 ? paymentHistory.length : null },
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
        <div className="card p-6">
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
        <div className="card p-6 space-y-4">
          {uploadReceipt.isError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                {uploadReceipt.error?.response?.data?.detail || 'Upload failed. Please try again.'}
              </p>
            </div>
          )}

          {bill?.receipt_url ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
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
                    className="max-h-80 w-auto rounded-lg border border-gray-200 dark:border-gray-700"
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
        <div className="card p-6">
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
                  <div className="flex items-center justify-between">
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
