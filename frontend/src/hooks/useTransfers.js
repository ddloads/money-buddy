import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { transfersAPI, recurringTransfersAPI } from '../utils/api'

function invalidateAll(qc) {
  qc.invalidateQueries({ queryKey: ['transfers'] })
  qc.invalidateQueries({ queryKey: ['recurring-transfers'] })
  qc.invalidateQueries({ queryKey: ['accounts'] })
  qc.invalidateQueries({ queryKey: ['net-worth'] })
  qc.invalidateQueries({ queryKey: ['transactions'] })
}

export function useTransfers() {
  return useQuery({
    queryKey: ['transfers'],
    queryFn: () => transfersAPI.list().then((r) => r.data),
    staleTime: 1000 * 60,
  })
}

export function useCreateTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => transfersAPI.create(data).then((r) => r.data),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (group) => transfersAPI.delete(group),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useRecurringTransfers() {
  return useQuery({
    queryKey: ['recurring-transfers'],
    queryFn: () => recurringTransfersAPI.list().then((r) => r.data),
    staleTime: 1000 * 60,
  })
}

export function useCreateRecurringTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => recurringTransfersAPI.create(data).then((r) => r.data),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useUpdateRecurringTransfer(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => recurringTransfersAPI.update(id, data).then((r) => r.data),
    onSuccess: () => invalidateAll(qc),
  })
}

export function useDeleteRecurringTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => recurringTransfersAPI.delete(id),
    onSuccess: () => invalidateAll(qc),
  })
}
