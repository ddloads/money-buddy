import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountsAPI } from '../utils/api'

const KEY = 'accounts'

function invalidate(qc) {
  qc.invalidateQueries({ queryKey: [KEY] })
  qc.invalidateQueries({ queryKey: ['net-worth'] })
  qc.invalidateQueries({ queryKey: ['transactions'] })
  qc.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useAccounts() {
  return useQuery({
    queryKey: [KEY],
    queryFn: () => accountsAPI.list().then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  })
}

export function useNetWorth() {
  return useQuery({
    queryKey: ['net-worth'],
    queryFn: () => accountsAPI.netWorth().then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  })
}

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => accountsAPI.create(data).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateAccount(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => accountsAPI.update(id, data).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => accountsAPI.delete(id),
    onSuccess: () => invalidate(qc),
  })
}
