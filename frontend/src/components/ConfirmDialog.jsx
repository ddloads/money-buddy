export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Delete',
  loadingLabel = 'Deleting…',
  loading,
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={onCancel} />
      <div className="card p-6 w-full max-w-sm z-10 animate-slide-up">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <div className="text-sm text-slate-400 mb-5">{message}</div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1">
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
