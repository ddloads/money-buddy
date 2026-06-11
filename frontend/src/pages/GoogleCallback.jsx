import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../utils/api'
import Spinner from '../components/Spinner'

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
    <div className="min-h-screen flex items-center justify-center bg-midnight-950">
      <div className="text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15">
          <Spinner className="h-6 w-6 text-emerald-400" />
        </div>
        <p className="text-slate-400 text-sm">Signing you in with Google…</p>
      </div>
    </div>
  )
}
