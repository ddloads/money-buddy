import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../utils/api'

export default function GoogleCallback() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      navigate('/login?error=google_failed')
      return
    }

    // Fetch the user profile with the token, then store both
    api.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        setAuth(res.data, token)
        // Clean the token out of the URL before navigating
        window.history.replaceState({}, '', '/dashboard')
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {
        navigate('/login?error=google_failed')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600/20">
          <svg className="h-6 w-6 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm">Signing you in with Google…</p>
      </div>
    </div>
  )
}
