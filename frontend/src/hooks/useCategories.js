import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoriesAPI } from '../utils/api'

const CAT_KEY = 'categories'

export function useCategories() {
  return useQuery({
    queryKey: [CAT_KEY],
    queryFn: () => categoriesAPI.list().then((r) => r.data),
    staleTime: 1000 * 60 * 10, // 10 minutes (categories don't change often)
  })
}

export function useCategory(id) {
  return useQuery({
    queryKey: [CAT_KEY, id],
    queryFn: () => categoriesAPI.get(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => categoriesAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CAT_KEY] })
    },
  })
}

export function useUpdateCategory(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => categoriesAPI.update(id, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CAT_KEY] })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => categoriesAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CAT_KEY] })
    },
  })
}
