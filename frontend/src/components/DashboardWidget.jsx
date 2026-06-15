import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bars3Icon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function DashboardWidget({ id, title, isEditing, onHide, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-40' : ''}>
      {isEditing && (
        <div className="flex items-center gap-2 mb-1.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-200 touch-none flex-shrink-0 transition-colors"
            title="Drag to reorder"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-slate-400 flex-1 select-none">{title}</span>
          <button
            onClick={onHide}
            className="text-slate-500 hover:text-rose-400 flex-shrink-0 transition-colors"
            title={`Hide ${title}`}
          >
            <EyeSlashIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      {children}
    </div>
  )
}
