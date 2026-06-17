import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { arrayMove } from '@dnd-kit/sortable'

export const DEFAULT_WIDGETS = [
  { id: 'summary', title: 'Overview Stats' },
  { id: 'net-worth', title: 'Net Worth' },
  { id: 'paycheck-plan', title: 'Paycheck Planner' },
  { id: 'debt', title: 'Debt Payoff' },
  { id: 'upcoming', title: 'Upcoming Bills' },
  { id: 'monthly-progress', title: 'Monthly Progress' },
  { id: 'monthly-chart', title: 'Monthly Overview' },
  { id: 'category-chart', title: 'Spending by Category' },
  { id: 'income-vs-expenses', title: 'Income vs Expenses' },
  { id: 'calendar', title: 'Bill Calendar' },
  { id: 'yearly-chart', title: 'Year-over-Year' },
]

const DEFAULT_ORDER = DEFAULT_WIDGETS.map((w) => w.id)

export const DEFAULT_SETTINGS = {
  upcomingDays: 7, // lookahead window for the Upcoming Bills widget
  paycheckPeriods: 3, // number of pay periods shown in the planner
}

// Ensure every known widget appears in the persisted order exactly once,
// appending any widgets added in newer app versions and dropping unknown ids.
function normalizeOrder(order = []) {
  const known = order.filter((id) => DEFAULT_ORDER.includes(id))
  const missing = DEFAULT_ORDER.filter((id) => !known.includes(id))
  // Keep new widgets near their canonical position rather than dumping at the end.
  if (missing.length === 0) return known
  const merged = [...known]
  for (const id of missing) {
    const canonicalIdx = DEFAULT_ORDER.indexOf(id)
    const insertAt = merged.findIndex(
      (existing) => DEFAULT_ORDER.indexOf(existing) > canonicalIdx
    )
    if (insertAt === -1) merged.push(id)
    else merged.splice(insertAt, 0, id)
  }
  return merged
}

export const useDashboardStore = create(
  persist(
    (set) => ({
      order: DEFAULT_ORDER,
      hidden: [],
      settings: DEFAULT_SETTINGS,

      reorder: (activeId, overId) =>
        set((state) => {
          const from = state.order.indexOf(activeId)
          const to = state.order.indexOf(overId)
          if (from === -1 || to === -1 || from === to) return state
          return { order: arrayMove(state.order, from, to) }
        }),

      hide: (id) =>
        set((state) => ({
          hidden: state.hidden.includes(id) ? state.hidden : [...state.hidden, id],
        })),

      show: (id) =>
        set((state) => ({ hidden: state.hidden.filter((h) => h !== id) })),

      setSetting: (key, value) =>
        set((state) => ({ settings: { ...state.settings, [key]: value } })),

      reset: () => set({ order: DEFAULT_ORDER, hidden: [], settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'mb_dashboard_layout',
      version: 2,
      migrate: (persisted) => ({
        ...persisted,
        order: normalizeOrder(persisted?.order),
        settings: { ...DEFAULT_SETTINGS, ...(persisted?.settings || {}) },
      }),
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        order: normalizeOrder(persisted?.order ?? current.order),
        settings: { ...DEFAULT_SETTINGS, ...(persisted?.settings || {}) },
      }),
    }
  )
)
