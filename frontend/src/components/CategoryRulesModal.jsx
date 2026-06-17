import { useState } from 'react'
import { PlusIcon, TrashIcon, XMarkIcon, SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { useCategories } from '../hooks/useCategories'
import {
  useCategoryRules,
  useCreateCategoryRule,
  useDeleteCategoryRule,
  useApplyCategoryRules,
} from '../hooks/useCategoryRules'

export default function CategoryRulesModal({ onClose }) {
  const { data: rules = [], isLoading } = useCategoryRules()
  const { data: categories = [] } = useCategories()
  const createRule = useCreateCategoryRule()
  const deleteRule = useDeleteCategoryRule()
  const applyRules = useApplyCategoryRules()

  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [applied, setApplied] = useState(null)

  const handleAdd = (e) => {
    e.preventDefault()
    if (!keyword.trim() || !categoryId) return
    createRule.mutate(
      { keyword: keyword.trim(), category_id: Number(categoryId) },
      { onSuccess: () => { setKeyword(''); setCategoryId('') } }
    )
  }

  const handleApply = () => {
    setApplied(null)
    applyRules.mutate(undefined, { onSuccess: (data) => setApplied(data.updated) })
  }

  const catById = (id) => categories.find((c) => c.id === id)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-overlay" onClick={onClose} />
      <div className="card p-6 w-full max-w-lg z-10 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-emerald-400" />
            Auto-categorization rules
          </h2>
          <button onClick={onClose} className="btn-ghost p-1"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          When a transaction&apos;s description contains a keyword, it&apos;s assigned the matching
          category — applied on import and to new transactions.
        </p>

        {/* Add rule */}
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Keyword e.g. starbucks"
            className="input flex-1"
          />
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input sm:w-40">
            <option value="">Category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon ? `${c.icon} ` : ''}{c.name}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!keyword.trim() || !categoryId || createRule.isPending}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Add
          </button>
        </form>

        {createRule.isError && (
          <div className="alert-error mb-3">
            {createRule.error?.response?.data?.detail || 'Could not add rule.'}
          </div>
        )}

        {/* Rules list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
          </div>
        ) : rules.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No rules yet. Add one above.</p>
        ) : (
          <div className="space-y-1.5">
            {rules.map((rule) => {
              const cat = rule.category || catById(rule.category_id)
              return (
                <div key={rule.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.03]">
                  <span className="text-sm text-slate-300 font-mono truncate flex-1">
                    “{rule.keyword}”
                  </span>
                  <span className="text-slate-600">→</span>
                  <span
                    className="text-xs px-2 py-1 rounded-md flex items-center gap-1 flex-shrink-0"
                    style={{ backgroundColor: cat?.color ? `${cat.color}26` : '#33415526', color: cat?.color || '#cbd5e1' }}
                  >
                    {cat?.icon} {cat?.name || 'Category'}
                  </span>
                  <button
                    onClick={() => deleteRule.mutate(rule.id)}
                    className="btn-ghost p-1.5 text-rose-400 hover:bg-rose-500/10 flex-shrink-0"
                    title="Delete rule"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Apply to existing */}
        <div className="mt-5 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {applied != null
              ? `Categorized ${applied} transaction${applied !== 1 ? 's' : ''}.`
              : 'Run these rules against your existing uncategorized transactions.'}
          </p>
          <button
            onClick={handleApply}
            disabled={rules.length === 0 || applyRules.isPending}
            className="btn-secondary text-sm gap-1.5 flex-shrink-0"
          >
            <ArrowPathIcon className={`h-4 w-4 ${applyRules.isPending ? 'animate-spin' : ''}`} />
            {applyRules.isPending ? 'Applying…' : 'Apply to existing'}
          </button>
        </div>
      </div>
    </div>
  )
}
