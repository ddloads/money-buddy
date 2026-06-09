import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { incomeAPI } from '../utils/api'

export function useIncomes() {
  return useQuery({
    queryKey: ['incomes'],
    queryFn: () => incomeAPI.list().then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => incomeAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateIncome(id) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data) => incomeAPI.update(id, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => incomeAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
