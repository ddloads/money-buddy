import axios from 'axios'

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
      // Clear stored auth data
      localStorage.removeItem('mb_token')
      localStorage.removeItem('mb_user')
      // Redirect to login (avoid import cycle with store)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
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
  uploadReceipt: (id, file) => {
    const formData = new FormData()
    formData.append('receipt', file)
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
}
