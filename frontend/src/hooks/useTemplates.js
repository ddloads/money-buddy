import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { templatesAPI } from '../utils/api'

const TPL_KEY = 'templates'

export function useTemplates() {
  return useQuery({
    queryKey: [TPL_KEY],
    queryFn: () => templatesAPI.list().then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => templatesAPI.create(data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TPL_KEY] }),
  })
}

export function useDeleteTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => templatesAPI.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TPL_KEY] }),
  })
}
