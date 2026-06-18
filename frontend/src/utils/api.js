import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Request interceptor — inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mb_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear all auth state (including Zustand's persisted mb_auth key) so the
      // page reload below starts with a clean slate and doesn't bounce back to /dashboard.
      useAuthStore.getState().logout()
      if (window.location.pathname !== '/login') {
        window.location.replace('/login')
      }
    }
    return Promise.reject(error)
  }
)

export default api

// ─── Auth ──────────────────────────────────────────────────────────────────

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  googleStatus: () => api.get('/auth/google/status'),
  updateProfile: (data) => api.put('/auth/me', data),
  changePassword: (data) => api.put('/auth/me/password', data),
  deleteAccount: () => api.delete('/auth/me'),
  googleLogin: () => { window.location.href = '/api/auth/google' },
}

// ─── Bills ─────────────────────────────────────────────────────────────────

export const billsAPI = {
  list: (params) => api.get('/bills', { params }),
  get: (id) => api.get(`/bills/${id}`),
  create: (data) => api.post('/bills', data),
  update: (id, data) => api.put(`/bills/${id}`, data),
  delete: (id) => api.delete(`/bills/${id}`),
  markPaid: (id, data) => api.post(`/bills/${id}/pay`, data),
  payments: (id) => api.get(`/bills/${id}/payments`),
  payoffEstimate: (id) => api.get(`/bills/${id}/payoff`),
  export: () => api.get('/bills/export', { responseType: 'blob' }),
  uploadReceipt: (id, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/bills/${id}/receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteReceipt: (id) => api.delete(`/bills/${id}/receipt`),
}

// ─── Categories ────────────────────────────────────────────────────────────

export const categoriesAPI = {
  list: () => api.get('/categories'),
  get: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
}

// ─── Dashboard ─────────────────────────────────────────────────────────────

export const dashboardAPI = {
  summary: () => api.get('/dashboard/summary'),
  upcoming: (days = 7) => api.get('/dashboard/upcoming', { params: { days } }),
  monthlyStats: (months = 6) => api.get('/dashboard/monthly', { params: { months } }),
  categoryStats: () => api.get('/dashboard/categories'),
  yearlyStats: () => api.get('/dashboard/yearly'),
  incomeVsExpenses: (months = 6) => api.get('/dashboard/income-vs-expenses', { params: { months } }),
  paycheckPlan: (periods = 3) => api.get('/dashboard/paycheck-plan', { params: { periods } }),
  debt: () => api.get('/dashboard/debt'),
}

// ─── Budget ────────────────────────────────────────────────────────────────

export const budgetAPI = {
  get: (year, month) => api.get('/budget', { params: { year, month } }),
}

// ─── Accounts ──────────────────────────────────────────────────────────────

export const accountsAPI = {
  list: () => api.get('/accounts'),
  netWorth: () => api.get('/accounts/net-worth'),
  get: (id) => api.get(`/accounts/${id}`),
  create: (data) => api.post('/accounts', data),
  update: (id, data) => api.put(`/accounts/${id}`, data),
  delete: (id) => api.delete(`/accounts/${id}`),
}

// ─── Transactions ────────────────────────────────────────────────────────────

export const transactionsAPI = {
  list: (params) => api.get('/transactions', { params }),
  get: (id) => api.get(`/transactions/${id}`),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
  previewImport: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/transactions/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  import: (accountId, file) => {
    const formData = new FormData()
    formData.append('account_id', accountId)
    formData.append('file', file)
    return api.post('/transactions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export const goalsAPI = {
  list: () => api.get('/goals'),
  create: (data) => api.post('/goals', data),
  update: (id, data) => api.put(`/goals/${id}`, data),
  contribute: (id, amount) => api.post(`/goals/${id}/contribute`, { amount }),
  delete: (id) => api.delete(`/goals/${id}`),
}

// ─── Transfers ───────────────────────────────────────────────────────────────

export const transfersAPI = {
  list: () => api.get('/transfers'),
  create: (data) => api.post('/transfers', data),
  delete: (group) => api.delete(`/transfers/${group}`),
}

export const recurringTransfersAPI = {
  list: () => api.get('/recurring-transfers'),
  create: (data) => api.post('/recurring-transfers', data),
  update: (id, data) => api.put(`/recurring-transfers/${id}`, data),
  delete: (id) => api.delete(`/recurring-transfers/${id}`),
  run: () => api.post('/recurring-transfers/run'),
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export const reportsAPI = {
  get: (months = 6) => api.get('/reports', { params: { months } }),
}

// ─── Category Rules (auto-categorization) ────────────────────────────────────

export const categoryRulesAPI = {
  list: () => api.get('/category-rules'),
  create: (data) => api.post('/category-rules', data),
  delete: (id) => api.delete(`/category-rules/${id}`),
  apply: () => api.post('/category-rules/apply'),
}

// ─── Income ────────────────────────────────────────────────────────────────

export const incomeAPI = {
  list: () => api.get('/income'),
  get: (id) => api.get(`/income/${id}`),
  create: (data) => api.post('/income', data),
  update: (id, data) => api.put(`/income/${id}`, data),
  delete: (id) => api.delete(`/income/${id}`),
}

// ─── Templates ─────────────────────────────────────────────────────────────

export const templatesAPI = {
  list: () => api.get('/templates'),
  create: (data) => api.post('/templates', data),
  delete: (id) => api.delete(`/templates/${id}`),
}

// ─── Dev ───────────────────────────────────────────────────────────────────

export const devAPI = {
  migrate: () => api.post('/dev/migrate'),
}
