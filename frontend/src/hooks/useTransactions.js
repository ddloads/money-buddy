import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transactionsAPI } from '../utils/api'

const KEY = 'transactions'

function invalidate(qc) {
  qc.invalidateQueries({ queryKey: [KEY] })
  qc.invalidateQueries({ queryKey: ['accounts'] })
  qc.invalidateQueries({ queryKey: ['net-worth'] })
  qc.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useTransactions(params) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn: () => transactionsAPI.list(params).then((r) => r.data),
    staleTime: 1000 * 60,
    keepPreviousData: true,
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => transactionsAPI.create(data).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateTransaction(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => transactionsAPI.update(id, data).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => transactionsAPI.delete(id),
    onSuccess: () => invalidate(qc),
  })
}

export function useImportTransactions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ accountId, file, typeOverrides }) =>
      transactionsAPI.import(accountId, file, typeOverrides).then((r) => r.data),
    onSuccess: () => invalidate(qc),
  })
}
