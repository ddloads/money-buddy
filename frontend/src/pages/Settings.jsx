import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  UserCircleIcon,
  KeyIcon,
  BellIcon,
  ShieldCheckIcon,
  TrashIcon,
  CheckIcon,
  CurrencyDollarIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import { useAuthStore } from '../store/authStore'
import { devAPI } from '../utils/api'

const CURRENCIES = [
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'GBP', label: 'British Pound (GBP)' },
  { code: 'CAD', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', label: 'Australian Dollar (AUD)' },
  { code: 'JPY', label: 'Japanese Yen (JPY)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'INR', label: 'Indian Rupee (INR)' },
  { code: 'MXN', label: 'Mexican Peso (MXN)' },
  { code: 'BRL', label: 'Brazilian Real (BRL)' },
  { code: 'SGD', label: 'Singapore Dollar (SGD)' },
  { code: 'HKD', label: 'Hong Kong Dollar (HKD)' },
  { code: 'NZD', label: 'New Zealand Dollar (NZD)' },
  { code: 'SEK', label: 'Swedish Krona (SEK)' },
  { code: 'NOK', label: 'Norwegian Krone (NOK)' },
  { code: 'DKK', label: 'Danish Krone (DKK)' },
]

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-white/[0.06]">
        <div className="p-1.5 rounded-lg bg-emerald-500/15">
          <Icon className="h-4 w-4 text-emerald-400" />
        </div>
        <h2 className="section-title">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const { user } = useAuthStore()
  const { updateProfile, changePassword, logout, deleteAccount } = useAuth()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [migrateStatus, setMigrateStatus] = useState(null)
  const [migrateLoading, setMigrateLoading] = useState(false)

  const handleNotifToggle = (key, value) => {
    updateProfile.mutate({ [key]: value })
  }

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

  const handleMigrate = async () => {
    setMigrateLoading(true)
    setMigrateStatus(null)
    try {
      const { data } = await devAPI.migrate()
      setMigrateStatus({ ok: true, message: `Done — ${data.applied} statement(s) applied.`, errors: data.errors })
    } catch (err) {
      setMigrateStatus({ ok: false, message: err?.response?.data?.detail || 'Migration failed.' })
    } finally {
      setMigrateLoading(false)
    }
  }

  const initials = user
    ? `${(user.first_name || user.name || 'U')[0]}`.toUpperCase()
    : 'U'

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div>
        <h1 className="page-header">Settings</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Manage your profile, preferences and account.
        </p>
      </div>

      {/* ── Profile ──────────────────────────────────────────────────────── */}
      <Section title="Profile" icon={UserCircleIcon}>
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-slate-100">
              {user?.first_name
                ? `${user.first_name} ${user.last_name || ''}`.trim()
                : user?.name || 'User'}
            </p>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
        </div>

        {profileSuccess && (
          <div className="alert-success flex items-center gap-2">
            <CheckIcon className="h-4 w-4" />
            Profile updated!
          </div>
        )}

        {updateProfile.isError && (
          <div className="alert-error">
            {updateProfile.error?.response?.data?.detail || 'Failed to update profile.'}
          </div>
        )}

        <form onSubmit={profileForm.handleSubmit(handleProfileSave)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name</label>
              <input type="text" className="input" {...profileForm.register('first_name')} />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input type="text" className="input" {...profileForm.register('last_name')} />
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
              <p className="field-error">{profileForm.formState.errors.email.message}</p>
            )}
          </div>
          <button type="submit" disabled={updateProfile.isPending} className="btn-primary">
            {updateProfile.isPending ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </Section>

      {/* ── Currency ─────────────────────────────────────────────────────── */}
      <Section title="Currency" icon={CurrencyDollarIcon}>
        <div>
          <label className="label">Display Currency</label>
          <p className="text-xs text-slate-500 mb-2">
            All amounts will be displayed in the selected currency.
          </p>
          <select
            className="input"
            value={user?.currency || 'USD'}
            onChange={(e) => updateProfile.mutate({ currency: e.target.value })}
          >
            {CURRENCIES.map(({ code, label }) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>
      </Section>

      {/* ── Change password ──────────────────────────────────────────────── */}
      <Section title="Change Password" icon={KeyIcon}>
        {passwordSuccess && (
          <div className="alert-success flex items-center gap-2">
            <CheckIcon className="h-4 w-4" />
            Password changed successfully!
          </div>
        )}
        {changePassword.isError && (
          <div className="alert-error">
            {changePassword.error?.response?.data?.detail || 'Failed to change password.'}
          </div>
        )}

        <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4" noValidate>
          <div>
            <label className="label">Current Password</label>
            <input
              type="password"
              className={`input ${passwordForm.formState.errors.current_password ? 'input-error' : ''}`}
              placeholder="••••••••"
              {...passwordForm.register('current_password', { required: 'Current password is required' })}
            />
            {passwordForm.formState.errors.current_password && (
              <p className="field-error">{passwordForm.formState.errors.current_password.message}</p>
            )}
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              className={`input ${passwordForm.formState.errors.new_password ? 'input-error' : ''}`}
              placeholder="Minimum 8 characters"
              {...passwordForm.register('new_password', {
                required: 'New password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
            />
            {passwordForm.formState.errors.new_password && (
              <p className="field-error">{passwordForm.formState.errors.new_password.message}</p>
            )}
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input
              type="password"
              className={`input ${passwordForm.formState.errors.confirm_new_password ? 'input-error' : ''}`}
              placeholder="Repeat new password"
              {...passwordForm.register('confirm_new_password', {
                required: 'Please confirm',
                validate: (v) =>
                  v === passwordForm.watch('new_password') || 'Passwords do not match',
              })}
            />
            {passwordForm.formState.errors.confirm_new_password && (
              <p className="field-error">{passwordForm.formState.errors.confirm_new_password.message}</p>
            )}
          </div>
          <button type="submit" disabled={changePassword.isPending} className="btn-primary">
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
                <p className="text-sm font-medium text-slate-200">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={user?.[key] ?? true}
                  onChange={(e) => handleNotifToggle(key, e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-white/10 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-400 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Developer ────────────────────────────────────────────────────── */}
      <Section title="Developer Tools" icon={WrenchScrewdriverIcon}>
        <p className="text-xs text-slate-500">
          Quick actions for development — safe to run anytime (all statements are idempotent).
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-200">Run DB Migrations</p>
              <p className="text-xs text-slate-500">
                Applies any missing ALTER TABLE / CREATE TABLE statements to the live database.
              </p>
            </div>
            <button
              onClick={handleMigrate}
              disabled={migrateLoading}
              className="btn-secondary shrink-0 ml-4"
            >
              {migrateLoading ? 'Running…' : 'Run'}
            </button>
          </div>

          {migrateStatus && (
            <div className={migrateStatus.ok ? 'alert-success' : 'alert-error'}>
              <p>{migrateStatus.message}</p>
              {migrateStatus.errors?.length > 0 && (
                <ul className="mt-1 text-xs space-y-0.5 opacity-80">
                  {migrateStatus.errors.map((e, i) => (
                    <li key={i}>{e.error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
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
            className="btn w-full justify-start text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30"
          >
            <TrashIcon className="h-4 w-4" />
            Delete Account
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-3">
            <p className="text-sm font-medium text-rose-300">
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
