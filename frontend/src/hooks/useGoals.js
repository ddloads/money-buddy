import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { goalsAPI } from '../utils/api'

const KEY = 'goals'

function invalidate(qc) {
  qc.invalidateQueries({ queryKey: [KEY] })
}

export function useGoals() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => goalsAPI.list().then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => goalsAPI.create(data).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateGoal(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => goalsAPI.update(id, data).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useContributeGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount }) => goalsAPI.contribute(id, amount).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => goalsAPI.delete(id),
    onSuccess: () => invalidate(qc),
  })
}
