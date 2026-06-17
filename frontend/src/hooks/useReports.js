import { useQuery } from '@tanstack/react-query'
import { reportsAPI } from '../utils/api'

export function useReports(months = 6) {
  return useQuery({
    queryKey: ['reports', months],
    queryFn: () => reportsAPI.get(months).then((r) => r.data),
    staleTime: 1000 * 60 * 2,
    keepPreviousData: true,
  })
}
