import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { billsAPI } from '../utils/api'
import { normalizeUpdatedBillForCache } from '../utils/billCache'

const BILLS_KEY = 'bills'

export function useBills(params = {}) {
  return useInfiniteQuery({
    queryKey: [BILLS_KEY, 'list', params],
    queryFn: ({ pageParam }) =>
      billsAPI.list({ ...params, page: pageParam }).then((r) => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.pages ? lastPage.page + 1 : undefined,
  })
}

export function useBill(id) {
  return useQuery({
    queryKey: [BILLS_KEY, id],
    queryFn: () => billsAPI.get(id).then((r) => r.data),
    enabled: !!id && id !== 'new',
  })
}

export function useCreateBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => billsAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BILLS_KEY] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateBill(id) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => billsAPI.update(id, data).then((r) => r.data),
    onSuccess: (updated, submitted) => {
      qc.setQueryData([BILLS_KEY, id], normalizeUpdatedBillForCache(updated, submitted))
      qc.invalidateQueries({ queryKey: [BILLS_KEY] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteBill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => billsAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BILLS_KEY] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useMarkBillPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => billsAPI.markPaid(id, data).then((r) => r.data),
    onSuccess: (updated, { id }) => {
      qc.setQueryData([BILLS_KEY, id], updated)
      qc.invalidateQueries({ queryKey: [BILLS_KEY] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUploadReceipt(billId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (file) => billsAPI.uploadReceipt(billId, file).then((r) => r.data),
    onSuccess: (updated) => {
      qc.setQueryData([BILLS_KEY, billId], updated)
    },
  })
}

export function useDeleteReceipt(billId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => billsAPI.deleteReceipt(billId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BILLS_KEY, billId] })
    },
  })
}

export function usePaymentHistory(billId) {
  return useQuery({
    queryKey: [BILLS_KEY, billId, 'payments'],
    queryFn: () => billsAPI.payments(billId).then((r) => r.data),
    enabled: !!billId && billId !== 'new',
  })
}
