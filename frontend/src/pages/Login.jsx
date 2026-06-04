import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { login, googleAuthEnabled, googleAuthStatus } = useAuth()
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
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center px-4 py-8 sm:py-10">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/logo.svg" alt="Money Buddy" className="h-20 w-20 sm:h-24 sm:w-24 drop-shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Money Buddy
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Smart bill management, simplified
          </p>
        </div>

        {/* Card */}
        <div className="card p-5 sm:p-8 animate-slide-up">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
            Welcome back 👋
          </h2>

          {/* Error message */}
          {searchParams.get('error') === 'google_oauth_unavailable' && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Google sign-in is not configured right now. Please sign in with your email and password.
              </p>
            </div>
          )}

          {login.isError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-400">
                {login.error?.response?.data?.detail ||
                  login.error?.response?.data?.message ||
                  'Invalid email or password. Please try again.'}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={`input ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0" htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                  placeholder="••••••••"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 6, message: 'Password must be at least 6 characters' },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={login.isPending}
              className="btn-primary w-full py-2.5 mt-2"
            >
              {login.isPending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {googleAuthEnabled && (
            <>
              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs text-gray-400">
                  <span className="bg-white dark:bg-gray-900 px-3">or continue with</span>
                </div>
              </div>

              {/* Google login */}
              <button
                type="button"
                onClick={() => { window.location.href = '/api/auth/google' }}
                disabled={googleAuthStatus.isLoading}
                className="btn-secondary w-full py-2.5 flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </button>
            </>
          )}

          {/* Register link */}
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
            >
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
