import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../hooks/useCategories'
import { useCurrency } from '../hooks/useCurrency'
import ConfirmDialog from '../components/ConfirmDialog'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#a855f7', '#ec4899', '#f43f5e', '#6b7280',
]

const DEFAULT_ICONS = ['🏠', '⚡', '💧', '🌐', '📱', '🚗', '🏥', '🛒', '📺', '🎮', '✈️', '💰', '🎓', '🏋️', '🍕', '🎵']

function CategoryForm({ defaultValues, onSubmit, onCancel, isLoading }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      color: '#10b981',
      icon: '📄',
      monthly_budget: '',
      ...defaultValues,
    },
  })

  const selectedColor = watch('color')
  const selectedIcon = watch('icon')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Name <span className="text-rose-400">*</span></label>
          <input
            type="text"
            className={`input ${errors.name ? 'input-error' : ''}`}
            placeholder="e.g. Utilities"
            {...register('name', { required: 'Name is required' })}
          />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>
        <div>
          <label className="label">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-10 w-14 rounded-lg border border-white/10 cursor-pointer p-0.5 bg-midnight-800"
              {...register('color')}
            />
            <input
              type="text"
              className="input flex-1 font-mono text-xs uppercase"
              {...register('color')}
              maxLength={7}
            />
          </div>
        </div>
      </div>

      {/* Color presets */}
      <div>
        <label className="label">Preset Colors</label>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setValue('color', c)}
              className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                selectedColor === c ? 'ring-2 ring-offset-2 ring-offset-midnight-900 ring-white/60 scale-110' : ''
              }`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Icon picker */}
      <div>
        <label className="label">Icon</label>
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            className="input w-20 text-center text-lg"
            maxLength={2}
            placeholder="📄"
            {...register('icon')}
          />
          <span className="text-xs text-slate-500">or pick one:</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {DEFAULT_ICONS.map((icon) => (
            <button
              key={icon}
              type="button"
              onClick={() => setValue('icon', icon)}
              className={`h-9 w-9 rounded-lg text-lg transition-all hover:bg-white/[0.07] ${
                selectedIcon === icon ? 'bg-emerald-500/10 ring-2 ring-emerald-500' : ''
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly budget */}
      <div>
        <label className="label">Monthly Budget (optional)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          className="input"
          placeholder="e.g. 200.00"
          {...register('monthly_budget', {
            setValueAs: (v) => (v === '' || v === null ? null : parseFloat(v)),
          })}
        />
        <p className="mt-1 text-xs text-slate-500">Leave blank for no budget limit.</p>
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Cancel
        </button>
        <button type="submit" disabled={isLoading} className="btn-primary flex-1">
          {isLoading ? 'Saving…' : defaultValues ? 'Save Changes' : 'Create Category'}
        </button>
      </div>
    </form>
  )
}

export default function Categories() {
  const [showForm, setShowForm] = useState(false)
  const [editCategory, setEditCategory] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { format } = useCurrency()

  const { data: categories, isLoading, isError } = useCategories()
  const createCat = useCreateCategory()
  const updateCat = useUpdateCategory(editCategory?.id)
  const deleteCat = useDeleteCategory()

  const handleCreate = (data) => {
    createCat.mutate(data, {
      onSuccess: () => setShowForm(false),
    })
  }

  const handleUpdate = (data) => {
    updateCat.mutate(data, {
      onSuccess: () => setEditCategory(null),
    })
  }

  const handleDelete = () => {
    deleteCat.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    })
  }

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-header">Categories</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Group your bills so you can see where the money goes.
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditCategory(null) }}
          className="btn-primary w-full sm:w-auto"
        >
          <PlusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">New Category</span>
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">New Category</h2>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-1">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          {createCat.isError && (
            <div className="alert-error mb-4">
              {createCat.error?.response?.data?.detail || 'Failed to create category.'}
            </div>
          )}
          <CategoryForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            isLoading={createCat.isPending}
          />
        </div>
      )}

      {/* Category list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="flex-1">
                <div className="skeleton h-4 w-32 mb-1" />
                <div className="skeleton h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="card p-8 text-center">
          <p className="text-slate-300">Failed to load categories.</p>
        </div>
      ) : !categories || categories.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">🏷️</div>
          <p className="text-lg font-semibold text-slate-100 mb-1">No categories yet</p>
          <p className="text-sm text-slate-400 mb-4">
            Organize your bills by creating custom categories.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Create First Category
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.id}>
              {editCategory?.id === cat.id ? (
                <div className="card p-5 animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="section-title">Edit Category</h2>
                    <button onClick={() => setEditCategory(null)} className="btn-ghost p-1">
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                  <CategoryForm
                    defaultValues={cat}
                    onSubmit={handleUpdate}
                    onCancel={() => setEditCategory(null)}
                    isLoading={updateCat.isPending}
                  />
                </div>
              ) : (
                <div className="card-interactive p-4 flex items-center gap-4 group">
                  {/* Color + icon */}
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-transform group-hover:scale-105"
                    style={{ backgroundColor: `${cat.color}26`, color: cat.color }}
                  >
                    {cat.icon || '📁'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-100">{cat.name}</span>
                      <span
                        className="inline-block h-3 w-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                    {cat.monthly_budget ? (
                      <div className="mt-1">
                        <div className="flex justify-between text-xs text-slate-500 mb-0.5">
                          <span>Budget: {format(cat.monthly_budget)}</span>
                        </div>
                        <div className="h-1.5 w-32 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (cat.bill_count || 0))}%`,
                              backgroundColor: cat.color || '#10b981',
                            }}
                          />
                        </div>
                      </div>
                    ) : cat.bill_count !== undefined ? (
                      <p className="text-xs text-slate-500">
                        {cat.bill_count} bill{cat.bill_count !== 1 ? 's' : ''}
                      </p>
                    ) : null}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditCategory(cat); setShowForm(false) }}
                      className="btn-ghost p-2"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(cat)}
                      className="btn-ghost p-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete category?"
        message={`Delete "${deleteTarget?.name}"? Bills in this category will become uncategorized.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteCat.isPending}
      />
    </div>
  )
}
