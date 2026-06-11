import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import PlaceholderTag from '../components/PlaceholderTag'
import Spinner from '../components/Spinner'
import GoogleIcon from '../components/GoogleIcon'

export default function Login() {
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [searchParams] = useSearchParams()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  const onSubmit = (data) => {
    login.mutate(data)
  }

  return (
    <div className="relative min-h-screen bg-midnight-950 flex items-center justify-center px-4 py-8 sm:py-10 overflow-hidden">
      {/* Background glow accents */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex justify-center mb-4">
            <div className="absolute inset-0 rounded-full bg-emerald-500/25 blur-2xl" />
            <img src="/logo.svg" alt="Money Buddy" className="relative h-20 w-20 sm:h-24 sm:w-24" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Money Buddy</h1>
          <p className="text-slate-400 mt-1">Smart bill management, simplified</p>
        </div>

        {/* Card */}
        <div className="card p-5 sm:p-8 animate-slide-up">
          <h2 className="text-xl font-semibold text-white mb-6">Welcome back 👋</h2>

          {searchParams.get('error') === 'google_oauth_unavailable' && (
            <div className="alert-warning mb-4">
              Google sign-in is not configured right now. Please sign in with your email and password.
            </div>
          )}

          {login.isError && (
            <div className="alert-error mb-4">
              {login.error?.response?.data?.detail ||
                login.error?.response?.data?.message ||
                'Invalid email or password. Please try again.'}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
              />
              {errors.email && <p className="field-error">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0" htmlFor="password">Password</label>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline cursor-default"
                  title="Placeholder — not functional yet"
                >
                  Forgot password?
                  <PlaceholderTag />
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="field-error">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={login.isPending}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {login.isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-500">
              <span className="bg-midnight-900 px-3">or continue with</span>
            </div>
          </div>

          {/* Google login */}
          <button
            type="button"
            onClick={() => { window.location.href = '/api/auth/google' }}
            className="btn-secondary w-full py-2.5"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          {/* Register link */}
          <p className="text-center text-sm text-slate-400 mt-5">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-emerald-400 font-medium hover:underline">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
