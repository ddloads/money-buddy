import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Bills from './pages/Bills'
import BillDetail from './pages/BillDetail'
import Calendar from './pages/Calendar'
import Categories from './pages/Categories'
import Budget from './pages/Budget'
import Accounts from './pages/Accounts'
import Transactions from './pages/Transactions'
import Reports from './pages/Reports'
import Income from './pages/Income'
import Settings from './pages/Settings'
import GoogleCallback from './pages/GoogleCallback'

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { token } = useAuthStore()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

// Public route wrapper (redirect to dashboard if already logged in)
function PublicRoute({ children }) {
  const { token } = useAuthStore()
  if (token) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  const { initTheme } = useAuthStore()

  useEffect(() => {
    initTheme()
  }, [initTheme])

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Google OAuth callback — public, no redirect wrapper needed */}
      <Route path="/auth/callback" element={<GoogleCallback />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="bills" element={<Bills />} />
        <Route path="bills/new" element={<BillDetail isNew />} />
        <Route path="bills/:id" element={<BillDetail />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="income" element={<Income />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="budget" element={<Budget />} />
        <Route path="reports" element={<Reports />} />
        <Route path="categories" element={<Categories />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
