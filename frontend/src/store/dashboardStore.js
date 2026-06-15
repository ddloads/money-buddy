import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { arrayMove } from '@dnd-kit/sortable'

export const DEFAULT_WIDGETS = [
  { id: 'summary', title: 'Overview Stats' },
  { id: 'upcoming', title: 'Upcoming Bills' },
  { id: 'monthly-progress', title: 'Monthly Progress' },
  { id: 'monthly-chart', title: 'Monthly Overview' },
  { id: 'category-chart', title: 'Spending by Category' },
  { id: 'income-vs-expenses', title: 'Income vs Expenses' },
  { id: 'calendar', title: 'Bill Calendar' },
  { id: 'yearly-chart', title: 'Year-over-Year' },
]

const DEFAULT_ORDER = DEFAULT_WIDGETS.map((w) => w.id)

export const useDashboardStore = create(
  persist(
    (set) => ({
      order: DEFAULT_ORDER,
      hidden: [],

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

      reset: () => set({ order: DEFAULT_ORDER, hidden: [] }),
    }),
    { name: 'mb_dashboard_layout' }
  )
)
