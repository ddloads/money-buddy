import { useQuery } from '@tanstack/react-query'
import { dashboardAPI } from '../utils/api'

export function useIncomeVsExpenses(months = 6) {
  return useQuery({
    queryKey: ['dashboard', 'income-vs-expenses', months],
    queryFn: () => dashboardAPI.incomeVsExpenses(months).then((r) => r.data),
    staleTime: 1000 * 60 * 3,
  })
}

export function useCategoryStats() {
  return useQuery({
    queryKey: ['dashboard', 'categories'],
    queryFn: () => dashboardAPI.categoryStats().then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  })
}

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
    staleTime: 1000 * 60 * 5,
  })
}

export function useYearlyStats() {
  return useQuery({
    queryKey: ['dashboard', 'yearly'],
    queryFn: () => dashboardAPI.yearlyStats().then((r) => r.data),
    staleTime: 1000 * 60 * 10,
  })
}

export function usePaycheckPlan(periods = 3) {
  return useQuery({
    queryKey: ['dashboard', 'paycheck-plan', periods],
    queryFn: () => dashboardAPI.paycheckPlan(periods).then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  })
}

export function useDebtOverview() {
  return useQuery({
    queryKey: ['dashboard', 'debt'],
    queryFn: () => dashboardAPI.debt().then((r) => r.data),
    staleTime: 1000 * 60 * 2,
  })
}
