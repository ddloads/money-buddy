import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoryRulesAPI } from '../utils/api'

const KEY = 'category-rules'

export function useCategoryRules() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => categoryRulesAPI.list().then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateCategoryRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => categoryRulesAPI.create(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteCategoryRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => categoryRulesAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useApplyCategoryRules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => categoryRulesAPI.apply().then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
