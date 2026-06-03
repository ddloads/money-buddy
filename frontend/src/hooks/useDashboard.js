import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../utils/api'

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: () => dashboardAPI.summary().then((r) => r.data),
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

export function useUpcomingBills(days = 7) {
  return useQuery({
    queryKey: ['dashboard', 'upcoming', days],
    queryFn: () => dashboardAPI.upcoming(days).then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  })
}

export function useMonthlyStats(months = 6) {
  return useQuery({
    queryKey: ['dashboard', 'monthly', months],
    queryFn: () => dashboardAPI.monthlyStats(months).then((r) => r.data),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
