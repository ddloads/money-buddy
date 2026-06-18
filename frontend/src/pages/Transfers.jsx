import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import {
  PlusIcon,
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  TrashIcon,
  XMarkIcon,
  ArrowPathRoundedSquareIcon,
} from '@heroicons/react/24/outline'
import ConfirmDialog from '../components/ConfirmDialog'
import { useAccounts } from '../hooks/useAccounts'
import {
  useTransfers,
  useCreateTransfer,
  useDeleteTransfer,
  useRecurringTransfers,
  useCreateRecurringTransfer,
  useUpdateRecurringTransfer,
  useDeleteRecurringTransfer,
} from '../hooks/useTransfers'
import { useCurrency } from '../hooks/useCurrency'

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]
const FREQ_LABEL = Object.fromEntries(FREQUENCIES.map((f) => [f.value, f.label]))

function AccountPair({ accounts, fromId, toId, onFrom, onTo }) {
  return (
    <div className="flex items-center gap-2">
      <select className="input flex-1" value={fromId} onChange={(e) => onFrom(e.target.value)}>
        <option value="">From…</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <ArrowRightIcon className="h-4 w-4 text-slate-500 flex-shrink-0" />
      <select className="input flex-1" value={toId} onChange={(e) => onTo(e.target.value)}>
        <option value="">To…</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
    </div>
  )
}

function TransferModal({ accounts, onClose }) {
  const create = useCreateTransfer()
  const [fromId, setFromId] = useState(accounts[0]?.id ? String(accounts[0].id) : '')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [description, setDescription] = useState('')

  const valid = fromId && toId && fromId !== toId && Number(amount) > 0

  const submit = () => {
    create.mutate(
      { from_account_id: Number(fromId), to_account_id: Number(toId), amount: Number(amount), date, description: description || null },
      { onSuccess: onClose }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={onClose} />
      <div className="card p-6 w-full max-w-md z-10 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">New transfer</h2>
          <button onClick={onClose} className="btn-ghost p-1"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <AccountPair accounts={accounts} fromId={fromId} toId={toId} onFrom={setFromId} onTo={setToId} />
          {fromId && fromId === toId && <p className="field-error">Pick two different accounts.</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="input" />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" className="input" />
          </div>
          {create.isError && <div className="alert-error">{create.error?.response?.data?.detail || 'Failed to transfer.'}</div>}
        </div>
        <div className="flex gap-3 pt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={submit} disabled={!valid || create.isPending} className="btn-primary flex-1">
            {create.isPending ? 'Transferring…' : 'Transfer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function RecurringModal({ accounts, schedule, onClose }) {
  const create = useCreateRecurringTransfer()
  const update = useUpdateRecurringTransfer(schedule?.id)
  const [fromId, setFromId] = useState(schedule ? String(schedule.from_account_id) : (accounts[0]?.id ? String(accounts[0].id) : ''))
  const [toId, setToId] = useState(schedule ? String(schedule.to_account_id) : '')
  const [amount, setAmount] = useState(schedule ? Number(schedule.amount) : '')
  const [frequency, setFrequency] = useState(schedule?.frequency || 'monthly')
  const [nextRun, setNextRun] = useState(schedule?.next_run ? String(schedule.next_run).slice(0, 10) : format(new Date(), 'yyyy-MM-dd'))
  const [description, setDescription] = useState(schedule?.description || '')

  const valid = fromId && toId && fromId !== toId && Number(amount) > 0
  const isLoading = create.isPending || update.isPending
  const error = create.error || update.error

  const submit = () => {
    const payload = {
      from_account_id: Number(fromId), to_account_id: Number(toId), amount: Number(amount),
      frequency, next_run: nextRun, description: description || null,
    }
    const mut = schedule ? update : create
    mut.mutate(payload, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={onClose} />
      <div className="card p-6 w-full max-w-md z-10 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{schedule ? 'Edit schedule' : 'Schedule a transfer'}</h2>
          <button onClick={onClose} className="btn-ghost p-1"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <AccountPair accounts={accounts} fromId={fromId} toId={toId} onFrom={setFromId} onTo={setToId} />
          {fromId && fromId === toId && <p className="field-error">Pick two different accounts.</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount</label>
              <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="input" />
            </div>
            <div>
              <label className="label">Frequency</label>
              <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Next run</label>
            <input type="date" value={nextRun} onChange={(e) => setNextRun(e.target.value)} className="input" />
            <p className="mt-1 text-xs text-slate-500">Past or today runs immediately; future starts then.</p>
          </div>
          <div>
            <label className="label">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Bills funding" className="input" />
          </div>
          {error && <div className="alert-error">{error?.response?.data?.detail || 'Failed to save.'}</div>}
        </div>
        <div className="flex gap-3 pt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={submit} disabled={!valid || isLoading} className="btn-primary flex-1">
            {isLoading ? 'Saving…' : schedule ? 'Save' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Transfers() {
  const { format: fc } = useCurrency()
  const { data: accounts = [] } = useAccounts()
  const { data: transfers = [], isLoading } = useTransfers()
  const { data: schedules = [] } = useRecurringTransfers()
  const deleteTransfer = useDeleteTransfer()
  const deleteSchedule = useDeleteRecurringTransfer()

  const [showTransfer, setShowTransfer] = useState(false)
  const [showRecurring, setShowRecurring] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [deletingTransfer, setDeletingTransfer] = useState(null)
  const [deletingSchedule, setDeletingSchedule] = useState(null)

  const enoughAccounts = accounts.length >= 2

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-header flex items-center gap-2">
            <ArrowsRightLeftIcon className="h-7 w-7 text-emerald-400" />
            Transfers
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Move money between your accounts. Transfers don&apos;t count as income or spending.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setEditingSchedule(null); setShowRecurring(true) }} disabled={!enoughAccounts} className="btn-secondary text-sm">
            <ArrowPathRoundedSquareIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </button>
          <button onClick={() => setShowTransfer(true)} disabled={!enoughAccounts} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">New Transfer</span>
          </button>
        </div>
      </div>

      {!enoughAccounts ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🏦</div>
          <p className="text-lg font-semibold text-slate-100 mb-1">Need two accounts</p>
          <p className="text-sm text-slate-400">Create at least two accounts to move money between them.</p>
        </div>
      ) : (
        <>
          {/* Scheduled transfers */}
          <div className="card p-5">
            <h2 className="section-title mb-3">Scheduled transfers</h2>
            {schedules.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">No recurring transfers. Use “Schedule” to automate one.</p>
            ) : (
              <div className="space-y-2">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] group">
                    <ArrowPathRoundedSquareIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-200 truncate">
                        {s.from_account_name} <span className="text-slate-500">→</span> {s.to_account_name}
                        {!s.is_active && <span className="badge-gray ml-2">Paused</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        {fc(s.amount)} · {FREQ_LABEL[s.frequency] || s.frequency} · next {format(parseISO(String(s.next_run)), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingSchedule(s); setShowRecurring(true) }} className="btn-ghost p-1.5 text-xs">Edit</button>
                      <button onClick={() => setDeletingSchedule(s)} className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10"><TrashIcon className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent transfers */}
          <div className="card p-5">
            <h2 className="section-title mb-3">Recent transfers</h2>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
            ) : transfers.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">No transfers yet.</p>
            ) : (
              <div className="space-y-1.5">
                {transfers.map((t) => (
                  <div key={t.transfer_group} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] group">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                      <ArrowsRightLeftIcon className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-200 truncate">
                        {t.from_account_name} <span className="text-slate-500">→</span> {t.to_account_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {format(parseISO(String(t.date)), 'MMM d, yyyy')}{t.description ? ` · ${t.description}` : ''}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-slate-100 flex-shrink-0">{fc(t.amount)}</span>
                    <button onClick={() => setDeletingTransfer(t)} className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {showTransfer && <TransferModal accounts={accounts} onClose={() => setShowTransfer(false)} />}
      {showRecurring && <RecurringModal accounts={accounts} schedule={editingSchedule} onClose={() => { setShowRecurring(false); setEditingSchedule(null) }} />}

      <ConfirmDialog
        open={!!deletingTransfer}
        title="Delete transfer?"
        message="This removes both sides of the transfer and adjusts both balances."
        onConfirm={() => deleteTransfer.mutate(deletingTransfer.transfer_group, { onSuccess: () => setDeletingTransfer(null) })}
        onCancel={() => setDeletingTransfer(null)}
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        loading={deleteTransfer.isPending}
      />
      <ConfirmDialog
        open={!!deletingSchedule}
        title="Delete schedule?"
        message="Stop this recurring transfer? Past transfers are kept."
        onConfirm={() => deleteSchedule.mutate(deletingSchedule.id, { onSuccess: () => setDeletingSchedule(null) })}
        onCancel={() => setDeletingSchedule(null)}
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        loading={deleteSchedule.isPending}
      />
    </div>
  )
}
