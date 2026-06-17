import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { budgetAPI, categoriesAPI } from '../utils/api'

export function useBudget(year, month) {
  return useQuery({
    queryKey: ['budget', year, month],
    queryFn: () => budgetAPI.get(year, month).then((r) => r.data),
    staleTime: 1000 * 60 * 2,
    keepPreviousData: true,
  })
}

/**
 * Set (or clear) a category's recurring monthly budget. Pass `null` to remove
 * the budget. Refreshes budget, category, and dashboard data on success.
 */
export function useSetCategoryBudget() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ categoryId, amount }) =>
      categoriesAPI.update(categoryId, { monthly_budget: amount }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budget'] })
      qc.invalidateQueries({ queryKey: ['categories'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
