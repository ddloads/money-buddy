import { useState } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { useAccounts } from '../hooks/useAccounts'
import { useCurrency } from '../hooks/useCurrency'

/**
 * Confirmation dialog for marking a bill paid. When the user picks an account,
 * the payment is reconciled — a matching expense transaction is recorded.
 */
export default function PayBillModal({ bill, onConfirm, onCancel, loading }) {
  const { data: accounts = [] } = useAccounts()
  const { format } = useCurrency()
  // Preselect the bill's linked funding account when one is set.
  const [accountId, setAccountId] = useState(bill?.funding_account_id ? String(bill.funding_account_id) : '')

  if (!bill) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={onCancel} />
      <div className="card p-6 w-full max-w-md z-10 animate-slide-up">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/15">
            <CheckCircleIcon className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Mark as paid</h2>
            <p className="text-sm text-slate-400">
              {bill.name} · {format(bill.amount)}
            </p>
          </div>
        </div>

        {accounts.length > 0 ? (
          <div className="mb-5">
            <label className="label">Record payment from</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="input"
            >
              <option value="">Don&apos;t record to an account</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">
              {accountId
                ? `A ${format(bill.amount)} expense will be added to this account.`
                : 'The bill will be marked paid without affecting any account balance.'}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mb-5">
            Tip: add an account to automatically record this payment as a transaction.
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button
            onClick={() => onConfirm(accountId ? Number(accountId) : null)}
            disabled={loading}
            className="btn-primary flex-1"
          >
            {loading ? 'Marking…' : 'Mark Paid'}
          </button>
        </div>
      </div>
    </div>
  )
}
