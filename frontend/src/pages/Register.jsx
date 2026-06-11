import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import PlaceholderTag from '../components/PlaceholderTag'
import Spinner from '../components/Spinner'
import GoogleIcon from '../components/GoogleIcon'

export default function Register() {
  const { register: registerMutation, googleAuthEnabled, googleAuthStatus } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [searchParams] = useSearchParams()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const password = watch('password')

  const onSubmit = (data) => {
    const { confirm_password, ...rest } = data
    registerMutation.mutate(rest)
  }

  return (
    <div className="relative min-h-screen bg-midnight-950 flex items-center justify-center px-4 py-8 overflow-hidden">
      {/* Background glow accents */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-teal-500/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="relative inline-flex justify-center mb-4">
            <div className="absolute inset-0 rounded-full bg-emerald-500/25 blur-2xl" />
            <img src="/logo.svg" alt="Money Buddy" className="relative h-20 w-20 sm:h-24 sm:w-24" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Money Buddy</h1>
          <p className="text-slate-400 mt-1">Take control of your bills</p>
        </div>

        {/* Card */}
        <div className="card p-5 sm:p-8 animate-slide-up">
          <h2 className="text-xl font-semibold text-white mb-6">Create your account</h2>

          {searchParams.get('error') === 'google_oauth_unavailable' && (
            <div className="alert-warning mb-4">
              Google sign-up is not configured right now. Please create an account with your email and password.
            </div>
          )}

          {registerMutation.isError && (
            <div className="alert-error mb-4">
              {registerMutation.error?.response?.data?.detail ||
                registerMutation.error?.response?.data?.message ||
                'Registration failed. Please try again.'}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* First + Last name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="first_name">First name</label>
                <input
                  id="first_name"
                  type="text"
                  autoComplete="given-name"
                  className={`input ${errors.first_name ? 'input-error' : ''}`}
                  placeholder="Jane"
                  {...register('first_name', { required: 'Required' })}
                />
                {errors.first_name && <p className="field-error">{errors.first_name.message}</p>}
              </div>
              <div>
                <label className="label" htmlFor="last_name">Last name</label>
                <input
                  id="last_name"
                  type="text"
                  autoComplete="family-name"
                  className={`input ${errors.last_name ? 'input-error' : ''}`}
                  placeholder="Doe"
                  {...register('last_name', { required: 'Required' })}
                />
                {errors.last_name && <p className="field-error">{errors.last_name.message}</p>}
              </div>
            </div>

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
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Minimum 8 characters"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters required' },
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

            {/* Confirm password */}
            <div>
              <label className="label" htmlFor="confirm_password">Confirm password</label>
              <div className="relative">
                <input
                  id="confirm_password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`input pr-10 ${errors.confirm_password ? 'input-error' : ''}`}
                  placeholder="Repeat your password"
                  {...register('confirm_password', {
                    required: 'Please confirm your password',
                    validate: (v) => v === password || 'Passwords do not match',
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showConfirm ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirm_password && <p className="field-error">{errors.confirm_password.message}</p>}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                id="terms"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-midnight-800 text-emerald-500 focus:ring-emerald-500"
                {...register('terms', { required: 'You must accept the terms' })}
              />
              <label htmlFor="terms" className="text-xs text-slate-400 leading-relaxed">
                I agree to the{' '}
                <span className="inline-flex items-center gap-1 text-emerald-400" title="Placeholder — not functional yet">
                  Terms of Service <PlaceholderTag />
                </span>{' '}
                and{' '}
                <span className="inline-flex items-center gap-1 text-emerald-400" title="Placeholder — not functional yet">
                  Privacy Policy <PlaceholderTag />
                </span>
              </label>
            </div>
            {errors.terms && <p className="field-error -mt-2">{errors.terms.message}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="btn-primary w-full py-2.5"
            >
              {registerMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Creating account…
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {googleAuthEnabled && (
            <>
              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs text-slate-500">
                  <span className="bg-midnight-900 px-3">or</span>
                </div>
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={() => { window.location.href = '/api/auth/google' }}
                disabled={googleAuthStatus.isLoading}
                className="btn-secondary w-full py-2.5"
              >
                <GoogleIcon />
                Sign up with Google
              </button>
            </>
          )}

          <p className="text-center text-sm text-slate-400 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-400 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
