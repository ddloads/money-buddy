import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  ShieldCheckIcon,
  TrashIcon,
  CheckIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
        <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        <h2 className="section-title">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user, darkMode, toggleDarkMode } = useAuthStore()
  const { updateProfile, changePassword, logout, deleteAccount } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleNotifToggle = (key, value) => {
    updateProfile.mutate({ [key]: value })
  }
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Profile form
  const profileForm = useForm({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
    },
  })

  // Password form
  const passwordForm = useForm()

  const handleProfileSave = (data) => {
    updateProfile.mutate(data, {
      onSuccess: () => {
        setProfileSuccess(true)
        setTimeout(() => setProfileSuccess(false), 3000)
      },
    })
  }

  const handlePasswordChange = (data) => {
    const { confirm_new_password, ...rest } = data
    changePassword.mutate(rest, {
      onSuccess: () => {
        setPasswordSuccess(true)
        passwordForm.reset()
        setTimeout(() => setPasswordSuccess(false), 3000)
      },
    })
  }

  const initials = user
    ? `${(user.first_name || user.name || 'U')[0]}`.toUpperCase()
    : 'U'

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <h1 className="page-header">Settings</h1>

      {/* ── Profile ──────────────────────────────────────────────────────── */}
      <Section title="Profile" icon={UserCircleIcon}>
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-emerald-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              {user?.first_name
                ? `${user.first_name} ${user.last_name || ''}`.trim()
                : user?.name || 'User'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
        </div>

        {profileSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2">
            <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Profile updated!</p>
          </div>
        )}

        {updateProfile.isError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              {updateProfile.error?.response?.data?.detail || 'Failed to update profile.'}
            </p>
          </div>
        )}

        <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input
                type="text"
                className="input"
                {...profileForm.register('first_name')}
              />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input
                type="text"
                className="input"
                {...profileForm.register('last_name')}
              />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              {...profileForm.register('email', {
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' },
              })}
            />
            {profileForm.formState.errors.email && (
              <p className="mt-1 text-xs text-red-500">{profileForm.formState.errors.email.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="btn-primary"
          >
            {updateProfile.isPending ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </Section>

      {/* ── Appearance ───────────────────────────────────────────────────── */}
      <Section title="Appearance" icon={darkMode ? MoonIcon : SunIcon}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Dark Mode</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Switch between light and dark themes
            </p>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              darkMode ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
            role="switch"
            aria-checked={darkMode}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
                darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </Section>

      {/* ── Change password ──────────────────────────────────────────────── */}
      <Section title="Change Password" icon={KeyIcon}>
        {passwordSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2">
            <CheckIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Password changed successfully!</p>
          </div>
        )}
        {changePassword.isError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              {changePassword.error?.response?.data?.detail || 'Failed to change password.'}
            </p>
          </div>
        )}

        <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4" noValidate>
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className={`input ${passwordForm.formState.errors.current_password ? 'border-red-400' : ''}`}
              placeholder="••••••••"
              {...passwordForm.register('current_password', { required: 'Current password is required' })}
            />
            {passwordForm.formState.errors.current_password && (
              <p className="mt-1 text-xs text-red-500">{passwordForm.formState.errors.current_password.message}</p>
            )}
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className={`input ${passwordForm.formState.errors.new_password ? 'border-red-400' : ''}`}
              placeholder="Minimum 8 characters"
              {...passwordForm.register('new_password', {
                required: 'New password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
            />
            {passwordForm.formState.errors.new_password && (
              <p className="mt-1 text-xs text-red-500">{passwordForm.formState.errors.new_password.message}</p>
            )}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className={`input ${passwordForm.formState.errors.confirm_new_password ? 'border-red-400' : ''}`}
              placeholder="Repeat new password"
              {...passwordForm.register('confirm_new_password', {
                required: 'Please confirm',
                validate: (v) =>
                  v === passwordForm.watch('new_password') || 'Passwords do not match',
              })}
            />
            {passwordForm.formState.errors.confirm_new_password && (
              <p className="mt-1 text-xs text-red-500">{passwordForm.formState.errors.confirm_new_password.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="btn-primary"
          >
            {changePassword.isPending ? 'Changing…' : 'Change Password'}
          </button>
        </form>
      </Section>

      {/* ── Notifications ────────────────────────────────────────────────── */}
      <Section title="Notifications" icon={BellIcon}>
        <div className="space-y-3">
          {[
            { key: 'notif_email_reminders', label: 'Email Reminders', desc: 'Get email alerts before bills are due' },
            { key: 'notif_overdue_alerts', label: 'Overdue Alerts', desc: 'Notify me when a bill is past due' },
            { key: 'notif_weekly_summary', label: 'Weekly Summary', desc: 'Receive a weekly bill summary email' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={user?.[key] ?? true}
                  onChange={(e) => handleNotifToggle(key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Account ──────────────────────────────────────────────────────── */}
      <Section title="Account" icon={ShieldCheckIcon}>
        <div className="space-y-3">
          <button
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="btn-secondary w-full justify-start"
          >
            {logout.isPending ? 'Signing out…' : 'Sign Out'}
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="btn w-full justify-start text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900"
          >
            <TrashIcon className="h-4 w-4" />
            Delete Account
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg space-y-3">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">
              ⚠️ This will permanently delete your account and all data. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1 text-sm py-1.5">
                Cancel
              </button>
              <button
                onClick={() => deleteAccount.mutate()}
                disabled={deleteAccount.isPending}
                className="btn-danger flex-1 text-sm py-1.5"
              >
                {deleteAccount.isPending ? 'Deleting…' : 'Yes, Delete My Account'}
              </button>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}
