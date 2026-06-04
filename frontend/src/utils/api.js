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
}

// ─── Templates ─────────────────────────────────────────────────────────────

export const templatesAPI = {
  list: () => api.get('/templates'),
  create: (data) => api.post('/templates', data),
  delete: (id) => api.delete(`/templates/${id}`),
}
